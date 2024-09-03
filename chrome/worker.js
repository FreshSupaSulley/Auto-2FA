// Welcome page on install
chrome.runtime.onInstalled.addListener((event) => {
    if(event.reason == "install") {
        chrome.tabs.create({ url: "welcome.html" });
    }
});

// Trying to keep all of the methods in the same place to reduce space
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    let params = message.params;
    switch(message.intent) {
        case "deviceInfo": {
            getDeviceInfo().then(sendResponse).catch(reason => onError(reason, sendResponse));
            break;
        }
        case "buildRequest": {
            buildRequest(params.info, params.method, params.path).then(sendResponse).catch(reason => onError(reason, sendResponse));
            break;
        }
        case "approveTransaction": {
            // sendResponse is still required to break the await in popup.js
            approveTransaction(params.info, params.transactions, params.txID).then(sendResponse).catch(reason => onError(reason, sendResponse));
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
    sendResponse({error: true, reason: `${reason}`});
}

// Does nothing to stop multiple redirect spams to the same page
const maxAttempts = 7;
const zeroClickCooldown = 1000;
var lastZeroClick = 0;
async function zeroClickLogin(id) {
    // If there was another request to start a zero-click login while this one is going, OR it hasn't been long enough since the last zero-click login, ignore it
    // I am arbitrarily setting the zero-click login cooldown to be twice as long as it takes
    let time = Date.now();
    if(time - lastZeroClick < maxAttempts * zeroClickCooldown * 2) return;
    lastZeroClick = time;
    let info = await getDeviceInfo();
    // 1 indicates zero-click login (1-3 range)
    if(info && info.clickLevel == "1") {
        console.log("Attempting to zero-click login");
        let attempts = 0;
        let loadingInterval = setInterval(async () => {
            let result = await chrome.action.setBadgeText({ text: `${++attempts} / ${maxAttempts}`, tabId: id }).catch((e) => {
                // The tab was closed
                console.log("Tab was closed");
                clearInterval(loadingInterval);
                return false;
            });
            if(result === false) return;
            // Stop trying if getting transactions failed
            let transactions = (await buildRequest(info, "GET", "/push/v2/device/transactions").catch((error) => {
                stopClickLogin(loadingInterval, false, id);
            })).response.transactions;
            // If there's just 1 login attempt
            if(transactions.length == 1) {
                // Approve it
                await approveTransaction(info, transactions, transactions[0].urgid);
                stopClickLogin(loadingInterval, true, id);
            } else if(transactions.length > 1) {
                // Multiple push requests are happening, stop immediately
                stopClickLogin(loadingInterval, false, id);
            } else {
                // Increase the counter
                if(attempts == maxAttempts) {
                    stopClickLogin(loadingInterval, false, id);
                }
            }
        }, zeroClickCooldown);
    }
}

async function stopClickLogin(loadingInterval, success, id) {
    clearInterval(loadingInterval);
    // We don't care about the errors that the tab might not exist
    if(success) {
        chrome.action.setBadgeBackgroundColor({ color: "#67B14A", tabId: id }).catch(e => {});
        chrome.action.setBadgeText({ text: `Done`, tabId: id }).catch(e => {});
    } else {
        // chrome.action.setBadgeBackgroundColor({ color: "#FC0D1B", tabId: id }).catch(e => {});
        // Clear badge
        chrome.action.setBadgeText({ text: ``, tabId: id }).catch(e => {});
    }
}

// Gets the device info
async function getDeviceInfo() {
    return await new Promise((resolve) => {
        chrome.storage.sync.get('deviceInfo', (json) => {
            resolve(json.deviceInfo);
        });
    });
}

// Approves the transaction ID provided, denies all others
// Throws an exception if no transactions are active
async function approveTransaction(info, transactions, txID) {
    if(transactions.length == 0) {
        throw "No transactions found (request expired)";
    }
    for(let i = 0; i < transactions.length; i++) {
        let urgID = transactions[i].urgid;
        if(txID == urgID) {
          // Only approve this one
          await buildRequest(info, "POST", "/push/v2/device/transactions/" + urgID, {"answer": "approve"}, {"txId": urgID});
        } else {
          // Deny all others
          await buildRequest(info, "POST", "/push/v2/device/transactions/" + urgID, {"answer": "deny"}, {"txId": urgID});
        }
    }
}

// Makes a request to the Duo API
async function buildRequest(info, method, path, extraParam = {}) {
    // Manually convert date to UTC
    let now = new Date();
    var utc = new Date(now.getTime() + now.getTimezoneOffset() * 60000);

    // Manually format time because JS doesn't provide regex functions for this
    // let date = utc.toLocaleString('en-us', {weekday: 'long'}).substring(0, 3) + ", ";
    // date += utc.getDate() + " ";
    // date += utc.toLocaleString('en-us', {month: 'long'}).substring(0, 3) + " ";
    // date += 1900 + utc.getYear() + " ";
    // date += twoDigits(utc.getHours()) + ":";
    // date += twoDigits(utc.getMinutes()) + ":";
    // date += twoDigits(utc.getSeconds()) + " -0000";
    let date = utc.toUTCString();

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
    if(params.length != 0) {
        // Cutoff first '&'
        params = params.substring(1);
        canonRequest += params;
        // Add '?' for URL when we make fetch request
        params = "?" + params
    }

    // Import keys (convert form Base64 back into ArrayBuffer)
    let publicKey = await crypto.subtle.importKey("spki", base64ToArrayBuffer(info.publicRaw), {name: "RSASSA-PKCS1-v1_5", hash: {name: 'SHA-512'},}, true, ["verify"]);
    let privateKey = await crypto.subtle.importKey("pkcs8", base64ToArrayBuffer(info.privateRaw), {name: "RSASSA-PKCS1-v1_5", hash: {name: "SHA-512"},}, true, ["sign"]);

    // Sign canonicalized request using RSA private key
    let toEncrypt = new TextEncoder().encode(canonRequest);
    let signed = await crypto.subtle.sign({name: "RSASSA-PKCS1-v1_5"}, privateKey, toEncrypt);
    let verified = await crypto.subtle.verify({name: "RSASSA-PKCS1-v1_5"}, publicKey, signed, toEncrypt);

    // Ensure keys match
    if(!verified) {
        throw("Failed to verify signature with RSA keys");
    }

    // Required headers for all requests
    let headers = {
        "Authorization": "Basic " + btoa(info.pkey + ":" + arrayBufferToBase64(signed)),
        "x-duo-date": date
    }

    let finalPath = "https://" + info.host + path + params;
    let result = await fetch(finalPath, {
        method: method,
        headers: headers
    }).then(async response => {
        if(!response.ok) {
          // Banking on it actually returning JSON, which it should
          let apiData = await response.json();
          throw `<b>${response.status}</b> - ${response.statusText}<br>${JSON.stringify(apiData)}`;
        } else {
          return response.json();
        }
    }).catch(e => {
        console.error(e);
        throw `Failed to fetch @${finalPath}:<br><br>${e}`;
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

// For formatting date header
function twoDigits(input) {
    return input.toString().padStart(2, '0');
}
