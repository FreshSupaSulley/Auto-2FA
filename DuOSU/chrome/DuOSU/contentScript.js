// Determine if we have auto-login enabled
chrome.storage.sync.get('deviceInfo', (info) => {
  // If data exists and auto-login is enabled
  if(info.deviceInfo != null && info.deviceInfo.autoLogin == true) {
    autoLogin(info.deviceInfo);
  }
});

// Millis before trying to login
const waitTime = 1000;
const maxAttempts = 5;

async function autoLogin(info) {
  let success = false;
  try {
    // Attempt loop
    for(let i = 0; i < maxAttempts; i++) {
      console.log("Attempt " + (i + 1));
      // Get transactions
      let transactions = (await buildRequest(info, "GET", "/push/v2/device/transactions")).response.transactions;
      // Only safe if we have 1 transaction
      if(transactions.length == 1) {
        let urgID = transactions[0].urgid;
        let response = await buildRequest(info, "POST", "/push/v2/device/transactions/" + urgID, {"answer": "approve"}, {"txId": urgID});
        if(response.stat != "OK") {
          console.error(response);
          throw "Duo returned error status " + response.stat + " while trying to login";
        }
        // On success, break the loop
        success = true;
        break;
      } else if(transactions.length > 1) {
        // Break out of attempt loop. Keep success false
        break;
      } else {
        // Change icon (wait waitTime before trying again)
        for(let j = 0; j < 3; j++) {
          chrome.runtime.sendMessage({
            value: "load" + (j + 1)
          });
          await new Promise(res => setTimeout(res, waitTime / 3));
        }
      }
    }
  } catch(error) {
    console.error(error);
  }
  // Display icon on success or not
  if(success) {
    chrome.runtime.sendMessage({value: "approved"});
  } else {
    chrome.runtime.sendMessage({value: "failed"});
  }
}

// Makes a request to the Duo API
async function buildRequest(info, method, path, extraParam = {}, extraHeader = {}) {
  // Manually convert date to UTC
  let now = new Date();
  var utc = new Date(now.getTime() + now.getTimezoneOffset() * 60000);

  // Manually format time because JS doesn't provide regex functions for this
  let date = utc.toLocaleString('en-us', {weekday: 'long'}).substring(0, 3) + ", ";
  date += utc.getDate() + " ";
  date += utc.toLocaleString('en-us', {month: 'long'}).substring(0, 3) + " ";
  date += 1900 + utc.getYear() + " ";
  date += twoDigits(utc.getHours()) + ":";
  date += twoDigits(utc.getMinutes()) + ":";
  date += twoDigits(utc.getSeconds()) + " -0000";

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

  // Append additional headers (we only use txId during transaction reply)
  // Unlike extraParams, this won't break if more are supplied (which we don't need)
  for (const [key, value] of Object.entries(extraHeader)) {
    headers[key] = value;
  }

  let result = await fetch("https://" + info.host + path + params, {
    method: method,
    headers: headers
  }).then(response => {
    return response.json();
  });

  return result;
}

// For formatting date header
function twoDigits(input) {
  return input.toString().padStart(2, '0');
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
