// Welcome page on install
browser.runtime.onInstalled.addListener((event) => {
  if (event.reason == "install") {
    browser.tabs.create({ url: "welcome.html" });
  }
});

// Trying to keep all of the methods in the same place to reduce space
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  let params = message.params;
  switch (message.intent) {
    case "deviceInfo": {
      getDeviceInfo()
        .then(sendResponse)
        .catch((reason) => onError(reason, sendResponse));
      break;
    }
    case "buildRequest": {
      buildRequest(params.info, params.method, params.path)
        .then(sendResponse)
        .catch((reason) => onError(reason, sendResponse));
      break;
    }
    case "approveTransaction": {
      // sendResponse is still required to break the await in popup.js
      approveTransaction(params.info, params.transactions, params.txID)
        .then(sendResponse)
        .catch((reason) => onError(reason, sendResponse));
      break;
    }
    // Called when the content script is injected on a Duo login page
    case "onLoginPage": {
      zeroClickLogin(sender.tab.id);
      break;
    }
  }
  // Indicate this is asynchronous
  return true;
});

function onError(reason, sendResponse) {
  // Ok, new JS quirk discovered: you can't just say reason, you have to parse it to a string otherwise it'll get sent as {} sometimes
  sendResponse({ error: true, reason: `${reason}` });
}

const maxAttempts = 10;
const zeroClickCooldown = 1000;
var lastZeroClick = 0;
async function zeroClickLogin(id) {
  // let clientIP = await fetch('https://api.ipify.org?format=json').then(response => response.json()).then(data => {
  //     return data.ip;
  // }).catch(error => {
  //     console.log("Failed to get IP", error);
  // });
  // If there was another request to start a zero-click login while this one is going, OR it hasn't been long enough since the last zero-click login, ignore it
  // I am arbitrarily setting the zero-click login cooldown to be twice as long as it takes
  let time = Date.now();
  if (time - lastZeroClick < maxAttempts * zeroClickCooldown * 2) return;
  lastZeroClick = time;
  // Get all devices that use 0 clicks (1 indicates zero-click login, 1-3 total range)
  let zeroClickDevices = (await getDeviceInfo()).devices.filter((device) => device.clickLevel == "1");
  console.log("Eligible devices to 0 click in with", zeroClickDevices);
  if (!zeroClickDevices.length) {
    console.log("No devices to zero-click with, aborting");
    return;
  }
  // For each device that can be zero clicked
  console.log("Attempting to zero-click login");
  let attempts = 0;
  let loadingInterval = setInterval(async () => {
    // Only continue the load if on the same tab, because the prompt screen is one thing, and Duo picking the device is another
    let [tab] = await browser.tabs.query({ active: true, lastFocusedWindow: true });
    console.log("Waiting for user to navigate to login page");
    if (!tab || tab.id != id) return;
    // Update attempts
    let result = await browser.browserAction.setBadgeText({ text: `${++attempts} / ${maxAttempts}`, tabId: id }).catch((e) => {
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
        await approveTransaction(info, transactions, transactions[0].urgid)
          .then((success) => {
            // Signal success
            browser.browserAction.setBadgeTextColor({ color: `#FFF`, tabId: id }).catch((e) => {});
            stopClickLogin(loadingInterval, "#67B14A", "Done", id);
          })
          .catch((e) => {
            // Signal failure
            browser.browserAction.setBadgeTextColor({ color: `#FFF`, tabId: id }).catch((e) => {});
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
  browser.browserAction.setBadgeBackgroundColor({ color: badgeColor, tabId: id }).catch((e) => {});
  browser.browserAction.setBadgeText({ text: badgeText, tabId: id }).catch((e) => {});
  // Clear
  setTimeout(() => {
    browser.browserAction.setBadgeText({ text: ``, tabId: id }).catch((e) => {});
    browser.browserAction.setBadgeTextColor({ color: `#000`, tabId: id }).catch((e) => {});
  }, 5000);
}

// Gets the device info
async function getDeviceInfo() {
  return await new Promise((resolve) => {
    browser.storage.sync.get("deviceInfo", (json) => {
      resolve(json.deviceInfo);
    });
  }).then(async (info) => {
    let newInfo = info;
    // If there's no info yet OR it's old info (presence of info.host indicates this)
    if (!info || info.host) {
      // Update 1.4.3 data -> 1.5.0
      // Data is still json object, update to array
      newInfo = {
        // If there's already a device available use 0 otherwise -1 for new device
        activeDevice: info && info.host ? 0 : -1,
        // Add default name too. Earlier versions of DuOSU didn't have clickLevel yet, so we're defaulting one here
        devices: info ? [{ ...info, clickLevel: info.clickLevel ?? "2", name: "Device 1" }] : [],
      };
      await browser.storage.sync.set({ deviceInfo: newInfo });
    }
    return newInfo;
  });
}

// Approves the transaction ID provided, denies all others
// Throws an exception if no transactions are active
async function approveTransaction(info, transactions, txID) {
  if (transactions.length == 0) {
    throw "No transactions found (request expired)";
  }
  for (let i = 0; i < transactions.length; i++) {
    let urgID = transactions[i].urgid;
    if (txID == urgID) {
      // Only approve this one
      await buildRequest(info, "POST", "/push/v2/device/transactions/" + urgID, { answer: "approve" }, { txId: urgID });
    } else {
      // Deny all others
      await buildRequest(info, "POST", "/push/v2/device/transactions/" + urgID, { answer: "deny" }, { txId: urgID });
    }
  }
}

// Makes a request to the Duo API
async function buildRequest(info, method, path, extraParam = {}) {
  // Manually convert date to UTC
  let now = new Date();
  // var utc = new Date(now.getTime() + now.getTimezoneOffset() * 60000);

  // Manually format time because JS doesn't provide regex functions for this
  // let date = utc.toLocaleString('en-us', {weekday: 'long'}).substring(0, 3) + ", ";
  // date += utc.getDate() + " ";
  // date += utc.toLocaleString('en-us', {month: 'long'}).substring(0, 3) + " ";
  // date += 1900 + utc.getYear() + " ";
  // date += twoDigits(utc.getHours()) + ":";
  // date += twoDigits(utc.getMinutes()) + ":";
  // date += twoDigits(utc.getSeconds()) + " -0000";
  // let date = utc.toUTCString();
  let date = now.toUTCString();

  // Create canolicalized request (signature of auth header)
  // Technically, these parameters should be sorted alphabetically
  // But for our purposes we don't need to for our only extra parameter (answer=approve)
  let canonRequest = date + "\n" + method + "\n" + info.host + "\n" + path + "\n";
  let params = "";

  // We only use 1 extra parameter, but this shouldn't break for extra
  for (const [key, value] of Object.entries(extraParam)) {
    params += "&" + key + "=" + value;
  }

  // Add extra params to canonical request for auth
  if (params.length != 0) {
    // Cutoff first '&'
    params = params.substring(1);
    canonRequest += params;
    // Add '?' for URL when we make fetch request
    params = "?" + params;
  }

  // Import keys (convert form Base64 back into ArrayBuffer)
  let publicKey = await crypto.subtle.importKey("spki", base64ToArrayBuffer(info.publicRaw), { name: "RSASSA-PKCS1-v1_5", hash: { name: "SHA-512" } }, true, ["verify"]);
  let privateKey = await crypto.subtle.importKey("pkcs8", base64ToArrayBuffer(info.privateRaw), { name: "RSASSA-PKCS1-v1_5", hash: { name: "SHA-512" } }, true, ["sign"]);

  // Sign canonicalized request using RSA private key
  let toEncrypt = new TextEncoder().encode(canonRequest);
  let signed = await crypto.subtle.sign({ name: "RSASSA-PKCS1-v1_5" }, privateKey, toEncrypt);
  let verified = await crypto.subtle.verify({ name: "RSASSA-PKCS1-v1_5" }, publicKey, signed, toEncrypt);

  // Ensure keys match
  if (!verified) {
    throw "Failed to verify signature with RSA keys";
  }

  // Required headers for all requests
  let headers = {
    Authorization: "Basic " + btoa(info.pkey + ":" + arrayBufferToBase64(signed)),
    "x-duo-date": date,
  };

  let finalPath = "https://" + info.host + path + params;
  let result = await fetch(finalPath, {
    method: method,
    headers: headers,
  })
    .then(async (response) => {
      if (!response.ok) {
        // Banking on it actually returning JSON, which it should
        let apiData = await response.json();
        throw `<pre>${response.statusText} (${response.status}):<br>${JSON.stringify(apiData, null, 1)}</pre>`;
      } else {
        return response.json();
      }
    })
    .catch((e) => {
      console.error(e);
      throw `Failed to fetch ${finalPath}:<br><br>${e}`;
    });

  return result;
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
