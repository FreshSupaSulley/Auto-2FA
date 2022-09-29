// Determines which slide should be visible on startup page
let index = 0;

await chrome.storage.local.get('activeSlide', async (info) => {
  if(info.activeSlide == null) return;
  index = info.activeSlide;
});

// Previous slide
document.getElementById("prev").addEventListener("click", function() {
  index -= 1;
  updateSlide(index);
});

// Next slide
document.getElementById("next").addEventListener("click", function() {
  index += 1;
  updateSlide(index);
});

// Submit activation
let errorSplash = document.getElementById("errorSplash");
let activateButton = document.getElementById("activateButton");

activateButton.addEventListener("click", async function() {
  // Disable button so user can't spam it
  activateButton.disabled = true;
  activateButton.innerText = "Working...";

  // Split activation code into its two components: identifier and host.
  let host = null, identifier = null;
  try {
    let code = document.getElementById('code').value.split('-');
    // Decode Base64 to get host
    let host = atob(code[1]);
    let identifier = code[0];
    // Throw error if host is malformed
    if(host == "null") throw "";
    // Make request
    await activateDevice(host, identifier);
    // Hide setup page and show success page
    changeScreen("success");
  } catch(error) {
    errorSplash.innerText = "Invalid code. Please copy the activation code inside the box and paste here.";
  }

  // Re-enable button
  activateButton.disabled = false;
  activateButton.innerText = "Try Again";
});

// Switch to main page after success button is pressed
document.getElementById("successButton").addEventListener("click", function() {
  changeScreen("main");
});

async function activateDevice(host, identifier) {
  let url = 'https://' + host + '/push/v2/activation/' + identifier;

  // Create new pair of RSA keys
  let keyPair = null;

  try {
    keyPair = await createRSAKeys();
  } catch(e) {
    console.error(e);
    throw "Error occured generating RSA keys (report to developers).";
  }

  // Convert public key to PEM format to send to Duo
  let pemFormat = await window.crypto.subtle.exportKey("spki", keyPair.publicKey);
  pemFormat = window.btoa(String.fromCharCode(...new Uint8Array(pemFormat))).match(/.{1,64}/g).join('\n');
  pemFormat = `-----BEGIN PUBLIC KEY-----\n${pemFormat}\n-----END PUBLIC KEY-----`;

  // Exporting keys returns an array buffer. Convert it to Base64 string for storing
  let publicRaw = arrayBufferToBase64(await window.crypto.subtle.exportKey("spki", keyPair.publicKey));
  let privateRaw = arrayBufferToBase64(await window.crypto.subtle.exportKey("pkcs8", keyPair.privateKey));

  // Initialize new HTTP request
  let request = new XMLHttpRequest();
  request.open('POST', url, true);
  request.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
  request.onload = function () {
    let result = JSON.parse(request.responseText);

    // If successful
    if (result.stat == "OK") {
      // Get device info as JSON
      let akey = result.response.akey;
      let pkey = result.response.pkey;

      let deviceInfo = {
        "akey": akey,
        "pkey": pkey,
        "host": host,
        // Encode keys to Base64 for JSON serializing
        "publicRaw": publicRaw,
        "privateRaw": privateRaw
      };

      // Store device info in chrome sync
      chrome.storage.sync.set({"deviceInfo": deviceInfo});
    }
    else {
      console.error(result);
      throw "Malformed activation link";
    }
  };
  // Append URL parameters
  request.send("?customer_protocol=1&pubkey=" + encodeURIComponent(pemFormat) + "&pkpush=rsa-sha512&jailbroken=false&architecture=arm64&region=US&app_id=com.duosecurity.duomobile&full_disk_encryption=true&passcode_status=true&platform=Android&app_version=3.49.0&app_build_number=323001&version=11&manufacturer=unknown&language=en&model=Chrome%20Extension&security_patch_level=2021-02-01");
}

// Creates a pair of RSA keys for signing and verifying
async function createRSAKeys() {
  return await window.crypto.subtle.generateKey({
    name: "RSASSA-PKCS1-v1_5",
    modulusLength: 2048,
    publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
    hash: "SHA-512"
  }, true, ["sign", "verify"])
  .then((result) => {
      return result;
  })
  .catch(function(err){
      console.error("An error occured creating RSA keys: " + err);
      throw err;
  });
}

let splash = document.getElementById("splash");
let pushButton = document.getElementById("pushButton");
let failedAttempts = 1;

// When the push button is pressed on the main screen
pushButton.addEventListener("click", async function() {
  // Disable button while making Duo request
  pushButton.disabled = true;
  pushButton.innerText = "Working...";
  splash.innerHTML = "Checking for Duo Mobile logins...";

  try {
    let transactions = (await buildRequest("GET", "/push/v2/device/transactions")).response.transactions;
    // If no transactions exist at the moment
    if(transactions.length == 0) {
      failedAttempts++;
      splash.innerHTML = "No Duo logins found. Did you send a push to DuOSU (<u>default name is Android</u>)?";
    }
    // Push every transaction
    else {
      // Approve all push requests
      for(let i = 0; i < transactions.length; i++) {
        let urgID = transactions[i].urgid;
        let response = await buildRequest("POST", "/push/v2/device/transactions/" + urgID, {"answer": "approve"}, {"txId": urgID});

        if(response.stat != "OK") {
          console.error(response);
          throw "Duo returned error status " + response.stat + " while trying to login";
        }
      }

      // If successful, print this message
      splash.innerHTML = "Logged in!";
      failedAttempts = 0;
    }
  } catch(error) {
    console.error(error);
    splash.innerHTML = "Failed to approve Duo login.<br><br>" +
      "Check if DuOSU is one of your Duo Mobile devices. " +
      "<b>You can re-activate DuOSU by clicking the gear icon and pressing reset.</b>\n\n";
  }

  // Re-enable button
  pushButton.disabled = false;
  pushButton.innerHTML = "Try Again";

  // If we couldn't login after many attemps
  if(failedAttempts > 10) {
    failedAttempts = 0;
    // Remind the user how DuOSU works
    changeScreen("failedAttempts");
  }
});

// When the user presses the 'Got it' button on the failure screen
document.getElementById("failureButton").addEventListener("click", function() {
  changeScreen("main");
});

// Makes a request to the Duo API
async function buildRequest(method, path, extraParam = {}, extraHeader = {}) {
  // Get info
  let info = await new Promise(function(resolve) {
    chrome.storage.sync.get('deviceInfo', function(json) {
      resolve(json.deviceInfo);
    });
  });

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
  let publicKey = await window.crypto.subtle.importKey("spki", base64ToArrayBuffer(info.publicRaw), {name: "RSASSA-PKCS1-v1_5", hash: {name: 'SHA-512'},}, true, ["verify"]);
  let privateKey = await window.crypto.subtle.importKey("pkcs8", base64ToArrayBuffer(info.privateRaw), {name: "RSASSA-PKCS1-v1_5", hash: {name: "SHA-512"},}, true, ["sign"]);

  // Sign canonicalized request using RSA private key
  let toEncrypt = new TextEncoder().encode(canonRequest);
  let signed = await window.crypto.subtle.sign({name: "RSASSA-PKCS1-v1_5"}, privateKey, toEncrypt);
  let verified = await window.crypto.subtle.verify({name: "RSASSA-PKCS1-v1_5"}, publicKey, signed, toEncrypt);

  // Ensure keys match
  if(!verified) {
    throw("Failed to verify signature with RSA keys");
  }

  // Required headers for all requests
  let headers = {
    "Authorization": "Basic " + window.btoa(info.pkey + ":" + arrayBufferToBase64(signed)),
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

// For formatting date as header
function twoDigits(input) {
  return input.toString().padStart(2, '0');
}

// Changes the active screen of the page (activation or main)
function changeScreen(id) {
  // If we're going to the activation screen
  if(id == "activation") {
    // Make sure slides start at 0
    let index = 0;
    updateSlide(index);
  }

  let screens = document.getElementsByClassName("screen");

  for(let i = 0; i < screens.length; i++) {
    let div = screens[i];

    // If this is the screen we want to switch to
    if(div.id == id) {
      // Make it visible
      div.style.display = "block";
    }
    else {
      // Make all others invisible
      div.style.display = "none";
    }
  }
}

// Change the current slide on activation screen
function updateSlide(newIndex) {
  let slides = document.getElementsByClassName("slide");

  for(let i = 0; i < slides.length; i++) {
    slides[i].style.display = "none";
  }

  // Clamp newIndex within bounds
  if(newIndex > slides.length - 1) index = 0;
  else if(newIndex < 0) index = slides.length - 1;

  // Store in case user clicks off to browse to Duo tab so they don't have to flip back
  chrome.storage.local.set({"activeSlide": index});
  slides[index].style.display = "block";

  // Update slide count
  let count = document.getElementById("counter");
  count.textContent = (index + 1) + "/" + slides.length;
}

// Convert Base64 string to an ArrayBuffer
function base64ToArrayBuffer(base64) {
  var binary_string = window.atob(base64);
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
  return window.btoa(binary);
}

// Check for deviceInfo
await chrome.storage.sync.get('deviceInfo', async (info) => {
  // If this is the first time lauching / no data found
  if(info.deviceInfo == null) {
    // Set HTML screen to activate
    changeScreen("activation");
  }
  else {
    // Set to main screen
    changeScreen("main");
    // Auto press the button on open
    pushButton.click();
  }
});