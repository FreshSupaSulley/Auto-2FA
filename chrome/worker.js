// Welcome page on install
chrome.runtime.onInstalled.addListener((event) => {
  if (event.reason == "install") {
    chrome.tabs.create({ url: "welcome.html" });
  }
});

let currentAbortController = null;

// Trying to keep all of the methods in the same place to reduce space
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // https://github.com/FreshSupaSulley/Auto-2FA/issues/22
  if(sender.id !== chrome.runtime.id) return;
  
  let params = message.params;
  switch (message.intent) {
    case "deviceInfo": {
      getDeviceInfo()
        .then(sendResponse)
        .catch((reason) => onError(reason, sendResponse));
      break;
    }
    case "setDeviceInfo": {
      setDeviceInfo(params.info)
        .then(sendResponse)
        .catch((reason) => onError(reason, sendResponse));
      break;
    }
    case "buildRequest": {
      buildRequest(params.info, params.method, params.path, params.extraParam)
        .then(sendResponse)
        .catch((reason) => onError(reason, sendResponse));
      break;
    }
    case "approveTransaction": {
      // sendResponse is still required to break the await in popup.js
      approveTransactionHandler(params.info, params.transactions, params.txID, params.verificationCode).then(sendResponse).catch((reason) => onError(reason, sendResponse));
      break;
    }
    // Called when the content script is injected on a Duo login page
    case "onLoginPage": {
      if (currentAbortController) {
        console.log("Cancelling previous zero click login attempt");
        currentAbortController.abort();
      }
      currentAbortController = new AbortController();
      const signal = currentAbortController.signal;
      zeroClickLogin(sender.tab.id, signal, params.verificationCode);
      break;
    }
  }
  // Indicate this is asynchronous
  return true;
});

// ... because zero click logins use this too
function approveTransactionHandler(info, transactions, txID, verificationCode) {
  return approveTransaction(info, transactions, txID, {
    ...(verificationCode
      ? {
        // is this all we need? do we even need step_up_code_autofilled?
        step_up_code: verificationCode,
        // step_up_code_autofilled: false,
      }
      : {}),
  });
}

function onError(reason, sendResponse) {
  // Ok, new JS quirk discovered: you can't just say reason, you have to parse it to a string otherwise it'll get sent as {} sometimes
  sendResponse({ error: true, reason: `${reason}` });
}

const maxAttempts = 10;
const zeroClickCooldown = 1000;
var lastSuccessfulZeroClick = 0;

async function zeroClickLogin(id, signal, verificationCode) {
  clearBadge(id);
  // let clientIP = await fetch('https://api.ipify.org?format=json').then(response => response.json()).then(data => {
  //     return data.ip;
  // }).catch(error => {
  //     console.log("Failed to get IP", error);
  // });
  // Ignore if we approved something recently (arbitrarily setting cooldown to 10s)
  if (Date.now() - lastSuccessfulZeroClick < 10000) {
    console.log("Zero click logged-in recently, not trying again");
    return;
  }
  // lastZeroClick = time;
  // Get all devices that use 0 clicks (1 indicates zero-click login, 1-3 total range)
  let deviceInfo = await getDeviceInfo();
  let zeroClickDevices = Object.values(await new Promise((resolve) => chrome.storage.sync.get(deviceInfo.devices, resolve))).filter((device) => device.clickLevel == "1");
  console.log("Eligible devices to 0 click in with", zeroClickDevices);
  if (!zeroClickDevices.length) {
    console.log("No devices to zero-click with, aborting");
    return;
  }
  // For each device that can be zero clicked
  console.log("Attempting to zero-click login");
  let attempts = 0;
  let loadingInterval = setInterval(async () => {
    if (signal.aborted) {
      console.log("Zero click aborted before attempt ", attempts + 1);
      clearInterval(loadingInterval);
      return;
    }
    // Only continue the load if on the same tab, because the prompt screen is one thing, and Duo picking the device is another
    let [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (!tab || tab.id != id) {
      console.log("Waiting for user to navigate to login page");
      return;
    }
    // Update attempts
    let result = await chrome.action.setBadgeText({ text: `${++attempts}/${maxAttempts}`, tabId: id }).catch((e) => {
      // The tab was closed
      console.log("Tab was closed");
      clearInterval(loadingInterval);
      return false;
    });
    if (result === false) return;
    // Keep searching until one of the devices succeeds
    for (let info of zeroClickDevices) {
      console.log("Checking " + info.name);
      let transactions = (
        await buildRequest(info, "GET", "/push/v2/device/transactions").catch((error) => {
          // Stop trying if getting transactions failed (for any of them?)
          console.error(error);
          stopClickLogin(loadingInterval, "#FC0D1B", "Fail", id);
        })
      ).response.transactions;
      // If there's just 1 login attempt
      if (transactions.length == 1) {
        lastSuccessfulZeroClick = Date.now();
        // Ensure the IPs match
        // let duoIP = extractIP(transactions[0]);
        // Approve it ONLY IF IPs match
        // if(clientIP == duoIP) {
        //     await approveTransaction(info, transactions, transactions[0].urgid);
        //     stopClickLogin(loadingInterval, "#67B14A", "Done", id);
        // } else {
        //     // nah
        //     stopClickLogin(loadingInterval, "FC0D1B", "IP");
        // }
        console.log("Transaction found for device " + info.name);
        await approveTransactionHandler(info, transactions, transactions[0].urgid, verificationCode)
          .then((success) => {
            // Signal success
            chrome.action.setBadgeTextColor({ color: `#FFF`, tabId: id }).catch((e) => { });
            stopClickLogin(loadingInterval, "#67B14A", "Done", id);
          })
          .catch((e) => {
            // Signal failure
            chrome.action.setBadgeTextColor({ color: `#FFF`, tabId: id }).catch((e) => { });
            stopClickLogin(loadingInterval, "#FC0D1B", "Err", id);
          });
        // Don't try other devices, we're done
        break;
      } else if (transactions.length > 1) {
        // Multiple push requests are happening on this particular device, stop immediately
        stopClickLogin(loadingInterval, "#FF9333", "Open", id);
        // Don't try other devices, we're done
        break;
      } else {
        // Increase the counter (theoretically I could intentionally do attempts == maxAttempts as it should never happen but not in prod lol)
        if (attempts >= maxAttempts) {
          stopClickLogin(loadingInterval, "#FC0D1B", `None`, id);
          // Don't try other devices, we're done
          break;
        }
      }
    }
  }, zeroClickCooldown);
}

// function extractIP(attributes) {
//     for (let group of attributes) {
//         for (let attribute of group) {
//             if (attribute[0] === "IP Address") {
//                 return attribute[1];
//             }
//         }
//     }
//     return null;
// }
async function stopClickLogin(loadingInterval, badgeColor, badgeText, id) {
  clearInterval(loadingInterval);
  // Tab is supposed to exist
  chrome.action.setBadgeBackgroundColor({ color: badgeColor, tabId: id }).catch((e) => { });
  chrome.action.setBadgeText({ text: badgeText, tabId: id }).catch((e) => { });
  // Clear
  setTimeout(() => clearBadge(id), 5000);
}

async function clearBadge(id) {
  chrome.action.setBadgeText({ text: ``, tabId: id }).catch((e) => { });
  chrome.action.setBadgeTextColor({ color: `#000`, tabId: id }).catch((e) => { });
  chrome.action.setBadgeBackgroundColor({ color: "#FFF", tabId: id }).catch((e) => { });
}

// Gets the device info
function getDeviceInfo() {
  return new Promise((resolve) => {
    chrome.storage.sync.get("deviceInfo", (json) => {
      resolve(json.deviceInfo);
    });
  }).then(sanitizeData);
}

async function setDeviceInfo(info) {
  let sanitized = await sanitizeData(info);
  // if (JSON.stringify(sanitized) !== JSON.stringify(info)) {
  console.log("Contents changed! Updating device info");
  console.log("Old", info, "New", sanitized);
  await chrome.storage.sync.set({ deviceInfo: sanitized });
  // }
  return sanitized;
}

async function sanitizeData(info) {
  let newInfo = !info ? undefined : JSON.parse(JSON.stringify(info)); // create a full copy
  // If there's no info yet OR it's old info (presence of any single values (like pkey) indicates it's a single device)
  if (!info || info.pkey) {
    // Update 1.4.3 data -> 1.5.0
    // Data is still json object, update to array
    newInfo = {
      // If there's already a device available use pkey for identifier, otherwise -1 for new device
      activeDevice: info && info.host ? info.pkey : -1,
      // Add default name too. Earlier versions of DuOSU didn't have clickLevel yet, so we're defaulting one here
      devices: info ? [{ ...info, clickLevel: info.clickLevel ?? "2", name: "Device 1" }] : [],
    };
  }
  // New in 1.6.0
  // ... and this is also necessary for imports
  // If we have individual device data still in devices
  if (newInfo?.devices?.some((device) => !!device.pkey)) {
    // Break apart each device into their own JSON objects
    for (let device of newInfo.devices) {
      console.log("Setting device info for ", device.pkey)
      await chrome.storage.sync.set({ [device.pkey]: device }); // fuck it, don't remove pkey from device. One duplicate row ain't gonna hurt
    }
    // Devices array now only holds it's pkey, and it stores the device info under that pkey separately
    newInfo.devices = newInfo.devices.map((device) => device.pkey);
  }
  // Now ensure activeDevice is pointing to a valid place
  if (newInfo.activeDevice != -1) {
    newInfo.activeDevice = newInfo.devices.includes(newInfo.activeDevice) ? newInfo.activeDevice : newInfo.devices[0] || -1;
  }
  return newInfo;
}

// Approves the transaction ID provided, denies all others
// Throws an exception if no transactions are active
async function approveTransaction(singleDeviceInfo, transactions, txID, extraParam = {}) {
  if(!transactions) throw "Transactions is undefined";
  if (transactions.length == 0) throw "No transactions found (request expired)";
  for (let i = 0; i < transactions.length; i++) {
    let urgID = transactions[i].urgid;
    if (txID == urgID) {
      console.log("Found transaction matching UrgID: ", txID);
      // Only approve this one
      await buildRequest(singleDeviceInfo, "POST", "/push/v2/device/transactions/" + urgID, {
        ...extraParam,
        answer: "approve",
        txId: urgID,
      });
    } else {
      // Deny all others
      await buildRequest(singleDeviceInfo, "POST", "/push/v2/device/transactions/" + urgID, { answer: "deny", txId: urgID });
    }
  }
}

// Makes a request to the Duo API
async function buildRequest(singleDeviceInfo, method, path, extraParam = {}) {
  // 1. Get the Date header in UTC form
  let now = new Date();
  let date = now.toUTCString(); // e.g. "Thu, 05 Jun 2025 01:26:58 GMT"

  // 2. Build the canonical request string exactly as Duo expects:
  //    <date>\n
  //    <HTTP_METHOD>\n
  //    <host>\n
  //    <path>\n
  //    <sorted query string>
  //
  const host = singleDeviceInfo.host.trim(); // e.g. "api-46217189.duosecurity.com"
  let canonicalRequest = "";
  canonicalRequest += date + "\n";
  canonicalRequest += method.toUpperCase() + "\n";
  canonicalRequest += host + "\n";
  canonicalRequest += path + "\n";

  // 3. Sort and URL-encode extraParam lexicographically by key
  //
  // Convert each key/value to string, sort by key (ASCII order), then
  // create a queryString like "answer=approve&step_up_code=123456&txId=67890"
  const sortedEntries = Object.entries(extraParam)
    .map(([k, v]) => [String(k), String(v)])
    .sort((a, b) => a[0].localeCompare(b[0], "en", { numeric: false }));
  let queryString = "";
  if (sortedEntries.length > 0) {
    queryString = sortedEntries
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join("&");
  }
  // If queryString is nonempty, append it to canonicalRequest (no leading “?”)
  if (queryString.length > 0) {
    canonicalRequest += queryString;
  }

  // (Optional) Debug: print canonicalRequest to console
  // console.debug("[Duo Signature] Canonical Request:\n" + canonicalRequest);

  // 4. Import the RSA keys for signing/verification
  const publicKeyBuffer = base64ToArrayBuffer(singleDeviceInfo.publicRaw);
  const privateKeyBuffer = base64ToArrayBuffer(singleDeviceInfo.privateRaw);
  const publicKey = await crypto.subtle.importKey(
    "spki",
    publicKeyBuffer,
    { name: "RSASSA-PKCS1-v1_5", hash: { name: "SHA-512" } },
    true,
    ["verify"]
  );
  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    privateKeyBuffer,
    { name: "RSASSA-PKCS1-v1_5", hash: { name: "SHA-512" } },
    true,
    ["sign"]
  );

  // 5. Sign the canonical request
  const encoder = new TextEncoder();
  const dataToSign = encoder.encode(canonicalRequest);
  const signatureArrayBuffer = await crypto.subtle.sign(
    { name: "RSASSA-PKCS1-v1_5" },
    privateKey,
    dataToSign
  );

  // (Optional) Verify the signature locally—purely for debugging
  // const locallyVerified = await crypto.subtle.verify(
  //   { name: "RSASSA-PKCS1-v1_5" },
  //   publicKey,
  //   signatureArrayBuffer,
  //   dataToSign
  // );
  // if (!locallyVerified) {
  //   throw new Error("Duo buildRequest: Local verification of signature failed");
  // }

  // 6. Base64-encode the signature
  const signatureBase64 = arrayBufferToBase64(signatureArrayBuffer);

  // 7. Form the Authorization header
  const credentialString = `${singleDeviceInfo.pkey}:${signatureBase64}`;
  const authHeaderValue = "Basic " + btoa(credentialString);

  // 8. Assemble the full URL (prepend “?” if queryString is nonempty)
  const url = `https://${host}${path}${queryString ? "?" + queryString : ""}`;

  // 9. Dispatch the actual HTTP request using fetch()
  let fetchResponse;
  try {
    fetchResponse = await fetch(url, {
      method: method.toUpperCase(),
      headers: {
        Authorization: authHeaderValue,
        "x-duo-date": date,
      },
    });
  } catch (networkErr) {
    console.error("[Duo buildRequest] Network error fetching", url, networkErr);
    throw new Error(`Failed to fetch ${url}: ${networkErr}`);
  }

  // 10. If not OK, throw a detailed error with Duo’s JSON payload
  if (!fetchResponse.ok) {
    let errorPayload = await fetchResponse.text();
    let statusText = fetchResponse.statusText;
    let statusCode = fetchResponse.status;
    let parsed;
    try {
      parsed = JSON.parse(errorPayload);
    } catch (_) {
      parsed = null;
    }
    console.error(
      `[Duo buildRequest] Duo responded ${statusCode} ${statusText}:`,
      parsed || errorPayload
    );
    throw new Error(
      `<pre>${statusText} (${statusCode}):<br>${JSON.stringify(
        parsed || errorPayload,
        null,
        2
      )}</pre>`
    );
  }

  // 11. Otherwise, return the JSON response
  return fetchResponse.json();
}

// Convert an ArrayBuffer to Base64 encoded string
function arrayBufferToBase64(buffer) {
  let binary = "";
  let bytes = new Uint8Array(buffer);
  let len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Convert Base64 string to an ArrayBuffer
function base64ToArrayBuffer(base64) {
  var binary_string = atob(base64);
  var len = binary_string.length;
  var bytes = new Uint8Array(len);
  for (var i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
}
