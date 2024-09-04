// Determines which slide should be visible on startup page
let slideIndex = 0;

// Next slide
let nextButton = document.getElementById("next");
let flashes = 0;
let defaultColor = nextButton.style.color;
let defaultBGColor = nextButton.style.backgroundColor;
let defaultBorder = nextButton.style.borderColor;
let tutorialFlash = new Timer(async () => {
  let flash = ++flashes % 2 == 0;
  nextButton.style.color = flash ? defaultColor : "white";
  nextButton.style.backgroundColor = flash ? defaultBGColor : "red";
  nextButton.style.borderColor = flash ? defaultBorder : "red";
  if(flashes > 5) tutorialFlash.stop();
}, 300, () => {
  nextButton.style.color = defaultColor;
  nextButton.style.backgroundColor = defaultBGColor;
  nextButton.style.borderColor = defaultBorder;
});
nextButton.addEventListener("click", function() {
  slideIndex += 1;
  updateSlide(slideIndex);
  tutorialFlash.stop();
});
nextButton.addEventListener("mouseover", function() {
  tutorialFlash.stop();
});

// Previous slide
document.getElementById("prev").addEventListener("click", function() {
  slideIndex -= 1;
  updateSlide(slideIndex);
  tutorialFlash.stop();
});

// Universal / Traditional buttons
let universalButton = document.getElementById("universal-button");
universalButton.addEventListener("change", e => {
  chrome.storage.session.set({"promptType": "universal"});
});
// Traditional button (no need for universal support, that's the default)
let traditionalButton = document.getElementById("traditional-button");
traditionalButton.addEventListener("change", e => {
  // Store in case user clicks off to browse to Duo tab so they don't have to flip back
  chrome.storage.session.set({"promptType": "traditional"});
});
// Get prompt
await chrome.storage.session.get('promptType', (e) => {
  if(e.promptType == "traditional") {
    traditionalButton.checked = true;
  }
  // No need to set universal to be checked, it's on by default
});

// Help button
document.getElementById("helpButton").addEventListener("click", function() {
  changeScreen("failedAttempts");
  failedAttempts = 0;
});

// Submit activation
let errorSplash = document.getElementById("errorSplash");
let activateButton = document.getElementById("activateButton");
let activateCode = document.getElementById("code");

activateButton.addEventListener("click", async function() {
  // Disable button so user can't spam it
  activateButton.disabled = true;
  errorSplash.innerText = "Activating...";
  activateButton.innerText = "Working...";

  try {
    // Make request. Throws an error if an error occurs
    await activateDevice(activateCode.value);
    // Hide setup page and show success page
    changeScreen("activationSuccess");
  } catch(error) {
    if(error == "Expired") {
      errorSplash.innerText = "Activation code expired. Create a new activation link and try again.";
    }
    else {
      // Timeouts will be caught here
      console.error(error);
      errorSplash.innerText = "Invalid code. Open the link inside the email, and copy the code inside the box.";
    }
  }

  // Re-enable button
  activateButton.disabled = false;
  activateButton.innerText = "Retry";
});

// Switch to main page after success button is pressed
let mainButtons = document.getElementsByClassName("toMainScreen");
for(let i = 0; i < mainButtons.length; i++) {
  mainButtons[i].addEventListener("click", function() {
    changeScreen("main");
  });
}

async function activateDevice(rawCode) {
  // Split activation code into its two components: identifier and host.
  let code = rawCode.split('-');
  // Decode Base64 to get host
  let host = atob(code[1]);
  let identifier = code[0];
  // Ensure this code is correct by counting the characters
  if(code[0].length != 20 || code[1].length != 38) {
    throw "Illegal number of characters in activation code";
  }

  let url = 'https://' + host + '/push/v2/activation/' + identifier;
  // Create new pair of RSA keys
  let keyPair = await crypto.subtle.generateKey({
    name: "RSASSA-PKCS1-v1_5",
    modulusLength: 2048,
    publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
    hash: "SHA-512"
  }, true, ["sign", "verify"]);

  // Convert public key to PEM format to send to Duo
  let pemFormat = await crypto.subtle.exportKey("spki", keyPair.publicKey);
  pemFormat = btoa(String.fromCharCode(...new Uint8Array(pemFormat))).match(/.{1,64}/g).join('\n');
  pemFormat = `-----BEGIN PUBLIC KEY-----\n${pemFormat}\n-----END PUBLIC KEY-----`;

  // Exporting keys returns an array buffer. Convert it to Base64 string for storing
  let publicRaw = arrayBufferToBase64(await crypto.subtle.exportKey("spki", keyPair.publicKey));
  let privateRaw = arrayBufferToBase64(await crypto.subtle.exportKey("pkcs8", keyPair.privateKey));

  // Initialize new HTTP request
  let request = new XMLHttpRequest();
  let error = false;
  request.open('POST', url, true);
  request.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
  // Put onload() in a Promise. It will be raced with a timeout promise
  let newData = new Promise((resolve, reject) => {
    request.onload = async function () {
      let result = JSON.parse(request.responseText);
      // If successful
      if (result.stat == "OK") {
        // Get device info as JSON
        let deviceInfo = {
          // akey not used but why not
          "akey": result.response.akey,
          "pkey": result.response.pkey,
          "host": host,
          "clickLevel": "2",
          // Encode keys to Base64 for JSON serializing
          "publicRaw": publicRaw,
          "privateRaw": privateRaw
        };
        // Store device info in chrome sync
        await setDeviceInfo(deviceInfo);
        resolve("Success");
      }
      else {
        // If we receive a result from Duo and the status is FAIL, the activation code is likely expired
        console.error(result);
        reject("Expired");
      }
    };
  });
  // await new Promise(resolve => setTimeout(resolve, 2000));
  // Append URL parameters and begin request. Stick our branding on it too why not
  request.send("?customer_protocol=1&pubkey=" + encodeURIComponent(pemFormat) + "&pkpush=rsa-sha512&jailbroken=false&architecture=arm64&region=US&app_id=com.duosecurity.duomobile&full_disk_encryption=true&passcode_status=true&platform=Android&app_version=4.59.0&app_build_number=459010&version=13&manufacturer=Auto%202FA&language=en&model=Extension&security_patch_level=2022-11-05");
  // Create timeout promise
  let timeout = new Promise((resolve, reject) => {
    setTimeout(() => {
      reject("Timed out");
    }, 1500);
  });
  // Wait for response, or timeout at 1.5s
  // We need a timeout because request.send() doesn't return an error when an exception occurs, and onload() is obviously never called
  await Promise.race([newData, timeout]);
}

// On settings gear clicked
let inSettings = false;
let gear = document.getElementById("gear");
gear.addEventListener("click", async function() {
  inSettings = !inSettings;
  // If we are now in settings
  if(inSettings) {
    // Set gear color to red
    gear.style.fill = "red";
    changeScreen("settings");
  }
  // If we already clicked this
  else {
    // In case the data was tampered with in the settings
    await initialize();
    // Set gear color back to gray
    gear.style.fill = "gray";
    // Don't count flipping back to main page as an attempt
    failedAttempts = 0;
  }
});

let splash = document.getElementById("splash");
let successDetails = document.getElementById("successDetails");
let transactionsSplash = document.getElementById("transactionsSplash");
let pushButton = document.getElementById("pushButton");
let approveTable = document.getElementById("approveTable");
let failedReason = document.getElementById("failedReason");
let failedAttempts = 0;
let loading = false;

// When the push button is pressed on the main screen (or on open)
pushButton.addEventListener("click", async function() {
  loading = true;
  // Disable button while making Duo request
  pushButton.disabled = true;
  pushButton.innerText = "Working...";
  let root = "Checking for Duo logins";
  let dots = 0;
  splash.innerHTML = `${root}...`;
  // Show loading ...
  let loadingInterval = setInterval(() => {
    splash.innerText = `${root}${'.'.repeat(dots + 1)}`;
    dots = (dots + 1) % 3;
  }, 300);
  try {
    // Get device info from storage
    let info = await getDeviceInfo();
    let transactions = (await buildRequest(info, "GET", "/push/v2/device/transactions")).response.transactions;
    // If no transactions exist at the moment
    if(transactions.length == 0) {
      failedAttempts++;
      splash.innerHTML = "No logins found!";
    }
    // Expected response: Only 1 transaction should exist
    // Only auto-approve this transaction if one-click logins aren't 3 (indicates two click login)
    else if(transactions.length == 1 && info.clickLevel != "3") {
      // Push the single transaction
      // Throws an error if something goes wrong
      await approveTransaction(info, transactions, transactions[0].urgid);
      // Switch to success screen
      successDetails.innerHTML = traverse(transactions[0].attributes);
      failedAttempts = 0;
      changeScreen("success");
    }
    // There shouldn't be more than one transaction
    // Present all to the user
    else {
      // If one-click logins are disabled
      if(transactions.length == 1) {
        transactionsSplash.innerHTML = "Is this you?";
      } else {
        // If multiple login attempts exist
        transactionsSplash.innerHTML = "There's " + transactions.length + " login attempts.<br>Picking one will deny all others.";
      }
      // Switch to transactions screen
      changeScreen("transactions");
      // Also reset the transactions page
      while(approveTable.firstChild) {
        approveTable.removeChild(approveTable.lastChild);
      }
      // For each transaction
      for(let i = 0; i < transactions.length; i++) {
        let row = document.createElement("tr");
        // First column
        let approve = document.createElement("button");
        // Checkmark
        approve.innerHTML = "&#x2713;";
        approve.className = "approve";
        approve.onclick = async () => {
          // Catch any possible errors
          try {
            // Display loading
            approveTable.style.display = "none";
            transactionsSplash.innerText = "Working...";
            // Approve the transaction
            await approveTransaction(info, transactions, transactions[i].urgid);
            successDetails.innerHTML = traverse(transactions[i].attributes);
            changeScreen("success");
          } catch(error) {
            // Catching the error a bit earlier than the one below but probably redundant
            failedReason.innerText = error;
            changeScreen("failure");
          } finally {
            // Reset elements
            approveTable.style.display = "block";
          }
        }
        let c1 = document.createElement("td");
        c1.appendChild(approve);

        // 2nd column
        let p = document.createElement("p");
        // I have no way of knowing if array sizes vary per organization, so pick and choose isn't an option
        // The solution is to traverse through the JSON and find all key/value pairs
        p.innerHTML = traverse(transactions[i].attributes);
        p.style = "text-align: left; font-size: 12px; margin: 10px 0px";
        let c2 = document.createElement("td");
        c2.appendChild(p);

        // Add first 2 columns to page, 3rd is only necessary if there's only one transaction
        row.appendChild(c1);
        row.appendChild(c2);

        // 3rd column (deny button)
        if(transactions.length == 1) {
          // First column
          let deny = document.createElement("button");
          // Checkmark
          deny.innerHTML = "&#x2717;";
          deny.className = "deny";
          deny.onclick = async () => {
            // Catch any possible errors
            try {
              // Display loading
              approveTable.style.display = "none";
              transactionsSplash.innerText = "Working...";
              // Approve an invalid transaction, which denies all transactions
              await approveTransaction(info, transactions, -1);
              changeScreen("denied");
            } catch(error) {
              // Catching the error a bit earlier than the one below but probably redundant
              console.error(error);
              failedReason.innerText = error;
              changeScreen("failure");
            } finally {
              // Reset elements
              approveTable.style.display = "block";
            }
          }
          let c3 = document.createElement("td");
          c3.appendChild(deny);
          // Add to row
          row.appendChild(c3);
        }

        // Add all to page
        approveTable.appendChild(row);
      }
    }
  } catch(error) {
    // buildRequest throws the failed promise
    failedReason.innerHTML = error;
    failedAttempts = 0;
    console.error(JSON.stringify(error));
    changeScreen("failure");
  } finally {
    clearInterval(loadingInterval);
    loading = false;
    // Re-enable button
    pushButton.disabled = false;
    pushButton.innerHTML = "Try Again";
    // If we couldn't login after many attemps
    if(failedAttempts >= 4) {
      failedAttempts = 0;
      // Remind the user how this extension works
      changeScreen("failedAttempts");
    }
  }
});

function traverse(json) {
  // If JSON is an array
  if(json !== null && Array.isArray(json)) {
    // If first object is a string (it's a key)
    if(json.length == 2 && typeof json[0] === 'string') {
      let key = json[0];
      let value = json[1];
      // Toss out the unnecessary key/value pairs
      switch (json[0]) {
        // These values should stay the same regardless of the login, because it's the same account
        case "Username": case "Organization":
          return null;
        // Convert time to better form
        case "Time":
          // Epoch millis are returned as seconds
          // Convert to millis
          let d = new Date(Math.round(value) * 1000);
          // Day month year
          let display = (d.getMonth() + 1) + "/" + d.getDate() + "/" + d.getFullYear();
          display += " at ";
          let AMPM = (d.getHours() > 11) ? "PM" : "AM";
          let scaled = (d.getHours() < 13 ? d.getHours() : d.getHours() - 12);
          // Convert from military time
          display += (scaled % 12 == 0 ? 12 : scaled) + ":" + twoDigits(d.getMinutes()) + ":" + twoDigits(d.getSeconds()) + " " + AMPM;
          value = display;
          break;
      }
      return `<b>${key}</b>: ${value}<br>`;
    } else {
      // Traverse
      let data = "";
      for(let i = 0; i < json.length; i++) {
        let branch = traverse(json[i]);
        if(branch !== null) {
          data += branch;
        }
      }
      return data;
    }
  } else {
    // Wrong format (shouldn't happen)
    console.error("Unexpected JSON format: " + json);
    return null;
  }
}

// For formatting date header
function twoDigits(input) {
  return input.toString().padStart(2, '0');
}

// When the user presses the 'Got it' button on the failure screen
document.getElementById("failureButton").addEventListener("click", function() {
  changeScreen("main");
});

// When the user presses the button on the intro screen, switch to activation
document.getElementById("introButton").addEventListener("click", function() {
  tutorialFlash.start();
  changeScreen("activation");
});


// Change the current slide on activation screen
function Timer(fn, timeout, onStop = () => {}) {
  let runner = null;
  this.start = () => {
    if(!runner) {
      runner = setInterval(fn, timeout);
    }
    return this;
  }
  this.stop = () => {
    if(runner) {
      clearInterval(runner);
      onStop();
      runner = null;
    }
    return this;
  }
}

let qrSearchText = document.getElementById("qrSearchText");
let qrErrorText = document.getElementById("qrErrorText");

// QR searcher
let root = "Searching for a QR code";
let qrDots = 0;

let checkQR = new Timer(async () => {
  splash.innerHTML = `${root}...`;
  qrSearchText.innerText = `${root}${'.'.repeat(qrDots + 1)}`;
  qrDots = (qrDots + 1) % 3;

  if(qrDots == 0) {
    try {
      let code = await getQRLinkFromPage().catch(e => { throw "Tab not found" });
      // If successful, stop the timer
      checkQR.stop();
      qrSearchText.innerText = "Activating...";
      try {
        await activateDevice(code);
        changeScreen("activationSuccess");
      } catch(e) {
        qrSearchText.innerText = "Hmm... something went wrong. Go to Step 6 instead.";
        console.error(e);
      }
    } catch(e) {
      switch(e) {
        case "Error: Could not establish connection. Receiving end does not exist.": {
          root = "Can't establish a connection";
          break;
        } case "Tab not found": {
          root = "Generate a QR code";
          break;
        } case "QR not found": {
          root = "Flip through previous steps to generate QR";
          break;
        } default: {
          console.error(`An unexpected error occured finding QR code\n${e}`);
          console.log(e);
          break;
        }
      }
    }
  }
}, 300);

// Changes the active screen of the page (activation or main)
async function changeScreen(id) {
  if(id == "activation") {
    // Initialize the active slide (this is necessary on startup)
    updateSlide(slideIndex);
  } else {
    checkQR.stop();
    // Settings
    if(id == "settings") {
      // Set the one-click login box if enabled or not
      let info = await getDeviceInfo();
      if(!info) {
        clickSlider.disabled = true;
      } else {
        clickSlider.disabled = false;
        // 1-3 slider states. 1 == zero click, 2 == one click, 3 == two click
        // Default is one-click login
        updateSlider(info.clickLevel !== undefined ? info.clickLevel : "2");
      }
      // Make sure when we go to settings, we reset the main page
      splash.innerHTML = "Click to approve Duo Mobile logins.";
      pushButton.innerText = "Login";
    }
    else {
      // Auto press the button on open
      if(id == "main") {
        pushButton.click();
      }
      // Sometimes you can get booted out of the settings screen without clicking the button, so you need to programmically set the settings button back to normal
      inSettings = false;
      gear.style.fill = "gray";
    }
  }

  let screens = document.getElementsByClassName("screen");
  // For each screen div
  for(let i = 0; i < screens.length; i++) {
    let div = screens[i];
    // If this is the screen we want to switch to
    if(div.id == id) {
      // Make it visible
      div.style.display = "block";
    }
    // Make all others invisible
    else {
      div.style.display = "none";
    }
  }
}

function updateSlide(newIndex) {
  if(newIndex == 3) {
    checkQR.start();
  } else {
    checkQR.stop();
  }
  let slides = document.getElementsByClassName("slide");

  for(let i = 0; i < slides.length; i++) {
    slides[i].style.display = "none";
  }

  // Clamp newIndex within bounds
  if(newIndex > slides.length - 1) slideIndex = 0;
  else if(newIndex < 0) slideIndex = slides.length - 1;

  // Store in case user clicks off to browse to Duo tab so they don't have to flip back
  chrome.storage.session.set({"activeSlide": slideIndex});
  slides[slideIndex].style.display = "block";

  // Update slide count
  let count = document.getElementById("counter");
  count.textContent = (slideIndex + 1) + "/" + slides.length;
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

// Click login slider
var clickSlider = document.getElementById("clickLogins");
var clickSliderState = document.getElementById("clickLoginState");

// Update the current slider value (each time you drag the slider handle)
clickSlider.oninput = function() {
  updateSlider(this.value);
}

async function updateSlider(value) {
  clickSlider.disabled = false;
  clickSlider.value = value;
  switch(value) {
    case "1":
      clickSliderState.innerText = "Zero-click login";
      break;
    case "2":
      clickSliderState.innerText = "One-click login";
      break;
    case "3":
      clickSliderState.innerText = "Two-click login";
      break;
  }
  // Update data if it changed
  let data = await getDeviceInfo();
  if(data.clickLevel != value) {
    data.clickLevel = value;
    await setDeviceInfo(data).catch(e => {
      // In case the user is literally MASHING the slider just tell them if it refuses to save their data
      clickSliderState.innerText = e;
    });
  }
}

// Import button
let importText = document.getElementById("importText");
let importSplash = document.getElementById("importSplash");
document.getElementById("importButton").addEventListener("click", async function() {
  try {
    let decoded = atob(importText.value);
    let json = JSON.parse(decoded);
    // Tell user we are verifying the integrity of the data
    importSplash.innerHTML = "Verifying..."
    // We do this by running it through a transactions call
    let transactions = (await buildRequest(json, "GET", "/push/v2/device/transactions")).response.transactions;
    // If an error wasn't thrown, set new data in chrome sync
    await setDeviceInfo(json);
    importSplash.innerHTML = "Data imported! You will now login with this data.";
  } catch(e) {
    console.error(e);
    // Tell the user this is an invalid code
    importSplash.innerHTML = `<b>Invalid data</b>:<br>${e}`;
  }
});

// Export button
let exportText = document.getElementById("exportText");
document.getElementById("exportButton").addEventListener("click", async function() {
  let info = await getDeviceInfo();
  // If the user tried to export when we have no data
  if(info == null) {
    exportText.value = "No data!";
  }
  else {
    // Set text to be data. Scramble with Base64 so the user doesn't try to tamper any of this
    exportText.value = btoa(JSON.stringify(info));
  }
});

// Reset button
let resetSplash = document.getElementById("resetSplash");
document.getElementById("resetButton").addEventListener("click", function() {
  // Delete chrome local / sync data
  // We are not using local storage anymore, but it WAS being used because I didn't know about it 0_0
  // I also don't know what happens if the user doesn't have syncing enabled
  chrome.storage.session.clear(function() {
    chrome.storage.sync.clear(function() {
      chrome.storage.local.clear(function() {
        // Disable check box
        clickSlider.disabled = true;
        clickSlider.value = 2;
        clickSliderState.innerText = "No data";
        // Reset main page
        slideIndex = 0;
        errorSplash.innerText = "Use arrows to flip through instructions:";
        activateButton.innerText = "Activate";
        resetSplash.innerText = "Data cleared. Import data or reactivate."
      });
    });
  });
});

// Returns a promise of the device info
async function getDeviceInfo() {
  return await new Promise((resolve) => {
    chrome.storage.sync.get('deviceInfo', (json) => {
      resolve(json.deviceInfo);
    });
  });
}

// Returns a promise of setting the device info (for consistency)
async function setDeviceInfo(json) {
  // Only allow certain device info to be accepted so you can't just store an endless amount of information
  let trueJson = {
    "akey": json.akey,
    "pkey": json.pkey,
    "host": json.host,
    // Click level is optional as it wasn't included in older versions. Missing clickLevel is handled below
    // "clickLevel": json.clickLevel,
    "publicRaw": json.publicRaw,
    "privateRaw": json.privateRaw
  }
  // Check if any are null
  for(let item in trueJson) {
    if(trueJson[item] === undefined) {
      throw `Missing "${item}"`;
    }
  }
  // Set click level if it doesn't exist to one-click login
  if(json.clickLevel !== undefined) {
    // Ensure the slider level is [1-3]
    let parsed = parseInt(json.clickLevel);
    if(parsed < 1 || parsed > 3) throw `Expected clickLevel to be [1-3], got ${parsed}`;
    trueJson.clickLevel = `${parsed}`;
    clickSlider.value = trueJson.clickLevel;
  } else {
    trueJson.clickLevel = clickSlider.value;
  }
  await chrome.storage.sync.set({"deviceInfo": trueJson});
  updateSlider(trueJson.clickLevel);
}

// On startup
await initialize();
// Changes the current screen to what it should be depending on if deviceInfo is present
async function initialize() {
  let data = await getDeviceInfo();
  // If we have device data
  if(data) {
    // Set to main screen
    changeScreen("main");
  } else {
    let activeSlide = (await chrome.storage.session.get('activeSlide')).activeSlide;
    // If first time opened
    if(!activeSlide && activeSlide !== 0) {
      changeScreen("intro");
    } else {
      slideIndex = activeSlide;
      // Only flash if we're not on the last screen (or searching for QR)
      if(slideIndex != 3 && slideIndex != 5) {
        tutorialFlash.start();
      }
      document.getElementById("errorSplash").innerHTML = "";
      // Set HTML screen to activate
      changeScreen("activation");
    }
  }
}

// Glory to Easy Duo Authentication <3
async function getQRLinkFromPage() {
  // Send a request to the content script
  let [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if(!tab) throw "Tab not found";
  return await chrome.tabs.sendMessage(tab.id, { task: 'getQRCode' }).then((response) => {
    // Response is the QR code parsed and ready to be activated
    if(!response) throw "QR not found";
    return response;
  });
}

// Makes a request to the Duo API
async function buildRequest(info, method, path) {
  return sendToWorker({intent: "buildRequest", params: {
    info, method, path
  }});
}

// Approves the transaction ID provided, denies all others
// Throws an exception if no transactions are active
async function approveTransaction(info, transactions, txID) {
  return sendToWorker({intent: "approveTransaction", params: {
    info, transactions, txID
  }});
}

// Handles errors with service worker which stores all the important functions
async function sendToWorker(intent, params = {}) {
  let response = await chrome.runtime.sendMessage(intent, params);
  if(response && response.error) {
    throw response.reason;
  }
  return response;
}
