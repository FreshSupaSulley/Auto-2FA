// otplib
import "./libs/buffer.js";
import "./libs/index.js";
const { totp } = window.otplib;

// Determines which slide should be visible on startup page
let slideIndex = 0;

// Next slide
let nextButton = document.getElementById("next");
let flashes = 0;
let defaultColor = nextButton.style.color;
let defaultBGColor = nextButton.style.backgroundColor;
let defaultBorder = nextButton.style.borderColor;
let tutorialFlash = new Timer(
  async () => {
    let flash = ++flashes % 2 == 0;
    nextButton.style.color = flash ? defaultColor : "white";
    nextButton.style.backgroundColor = flash ? defaultBGColor : "red";
    nextButton.style.borderColor = flash ? defaultBorder : "red";
    if (flashes > 5) tutorialFlash.stop();
  },
  300,
  () => {
    nextButton.style.color = defaultColor;
    nextButton.style.backgroundColor = defaultBGColor;
    nextButton.style.borderColor = defaultBorder;
  }
);
nextButton.addEventListener("click", function () {
  slideIndex += 1;
  updateSlide(slideIndex);
  tutorialFlash.stop();
});
nextButton.addEventListener("mouseover", function () {
  tutorialFlash.stop();
});

// Previous slide
document.getElementById("prev").addEventListener("click", function () {
  slideIndex -= 1;
  updateSlide(slideIndex);
  tutorialFlash.stop();
});

// Universal / Traditional buttons
let universalButton = document.getElementById("universal-button");
universalButton.addEventListener("change", (e) => {
  chrome.storage.session.set({ promptType: "universal" });
});
// Traditional button (no need for universal support, that's the default)
let traditionalButton = document.getElementById("traditional-button");
traditionalButton.addEventListener("change", (e) => {
  // Store in case user clicks off to browse to Duo tab so they don't have to flip back
  chrome.storage.session.set({ promptType: "traditional" });
});
// Get prompt
await chrome.storage.session.get("promptType", (e) => {
  if (e.promptType == "traditional") {
    traditionalButton.checked = true;
  }
  // No need to set universal to be checked, it's on by default
});

// Help button
document.getElementById("helpButton").addEventListener("click", function () {
  changeScreen("failedAttempts");
  failedAttempts = 0;
});

// Submit activation
let errorSplash = document.getElementById("errorSplash");
let activateButton = document.getElementById("activateButton");
let activateCode = document.getElementById("code");

activateButton.addEventListener("click", async function () {
  // Disable button so user can't spam it
  activateButton.disabled = true;
  errorSplash.innerText = "Activating...";
  activateButton.innerText = "Working...";

  try {
    // Make request. Throws an error if an error occurs
    await activateDevice(activateCode.value);
    // Hide setup page and show success page
    changeScreen("activationSuccess");
  } catch (error) {
    if (error == "Expired") {
      errorSplash.innerText = "Activation code expired. Create a new activation link and try again.";
    } else {
      // Timeouts will be caught here
      console.error(error);
      errorSplash.innerText = "Invalid code. Open the link sent to your inbox, and paste the code below.";
    }
  } finally {
    // Re-enable button
    activateButton.disabled = false;
    activateButton.innerText = "Retry";
  }
});

// Switch to main page after success button is pressed
let mainButtons = document.getElementsByClassName("toMainScreen");
for (let i = 0; i < mainButtons.length; i++) {
  mainButtons[i].addEventListener("click", function () {
    changeScreen("main");
  });
}

async function activateDevice(rawCode) {
  // Split activation code into its two components: identifier and host.
  let code = rawCode.split("-");
  // Decode Base64 to get host
  let host = atob(code[1]);
  let identifier = code[0];
  // Ensure this code is correct by counting the characters
  if (code[0].length != 20 || code[1].length != 38) {
    throw "Illegal number of characters in activation code";
  }

  let url = "https://" + host + "/push/v2/activation/" + identifier;
  // Create new pair of RSA keys
  let keyPair = await crypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 2048,
      publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
      hash: "SHA-512",
    },
    true,
    ["sign", "verify"]
  );

  // Convert public key to PEM format to send to Duo
  let pemFormat = await crypto.subtle.exportKey("spki", keyPair.publicKey);
  pemFormat = btoa(String.fromCharCode(...new Uint8Array(pemFormat)))
    .match(/.{1,64}/g)
    .join("\n");
  pemFormat = `-----BEGIN PUBLIC KEY-----\n${pemFormat}\n-----END PUBLIC KEY-----`;

  // Exporting keys returns an array buffer. Convert it to Base64 string for storing
  let publicRaw = arrayBufferToBase64(await crypto.subtle.exportKey("spki", keyPair.publicKey));
  let privateRaw = arrayBufferToBase64(await crypto.subtle.exportKey("pkcs8", keyPair.privateKey));

  // Pick a randomized model and tablet
  const appleDevices = ["iPad", "iPad Air", "iPad Pro", "iPad mini"];
  const androidDevices = ["Galaxy Tab A8", "Galaxy Tab A7 Lite", "Galaxy Tab S10 Ultra", "Lenovo Tab P11"];
  const activationInfo = {
    customer_protocol: "1",
    pubkey: pemFormat,
    pkpush: "rsa-sha512",
    jailbroken: "false",
    architecture: "arm64",
    region: "US",
    app_id: "com.duosecurity.duomobile",
    full_disk_encryption: true,
    passcode_status: true,
    app_version: "4.59.0",
    app_build_number: "459010",
    version: "13",
    manufacturer: "unknown",
    language: "en",
    security_patch_level: "2022-11-05",
  };
  // New discovery: Platform = iOS is case-sensitive, Android is not
  if (Math.random() < 0.5) {
    // Apple
    activationInfo.platform = "iOS";
    activationInfo.model = appleDevices[Math.floor(Math.random() * appleDevices.length)];
  } else {
    // Android
    activationInfo.platform = "Android";
    activationInfo.model = androidDevices[Math.floor(Math.random() * androidDevices.length)];
  }

  // Grab number of devices for naming the new device
  let deviceInfo = await getDeviceInfo();
  let devicesCount = deviceInfo.devices.length;
  // Initialize new HTTP request
  let request = new XMLHttpRequest();
  request.open("POST", url, true);
  request.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
  // Put onload() in a Promise. It will be raced with a timeout promise
  let newData = new Promise((resolve, reject) => {
    request.onload = async function () {
      let result = JSON.parse(request.responseText);
      // If successful
      if (result.stat == "OK") {
        // Get device info as JSON
        let newDevice = result.response;
        delete newDevice.customer_logo; // takes up too much space
        // Add custom data per device
        (newDevice.name = `${activationInfo.model} (#${devicesCount + 1})`), // not gonna do a bounds check on this one
          (newDevice.clickLevel = "2"); // default value is one click login (this is what 2 means)
        newDevice.host = host;
        newDevice.publicRaw = publicRaw;
        newDevice.privateRaw = privateRaw;

        document.getElementById("newDeviceDisplay").innerHTML = `<b>${activationInfo.model}</b> (${activationInfo.platform})`;
        // Create new storage slot for device
        await chrome.storage.sync.set({ [newDevice.pkey]: newDevice });
        // Add new device to info
        deviceInfo.devices.push(newDevice.pkey);
        // Set active device to one just added
        deviceInfo.activeDevice = newDevice.pkey;
        await setDeviceInfo(deviceInfo);
        resolve("Success");
      } else {
        // If we receive a result from Duo and the status is FAIL, the activation code is likely expired
        console.error(result);
        reject("Expired");
      }
    };
  });
  // await new Promise(resolve => setTimeout(resolve, 2000));
  // Append URL parameters and begin request
  request.send(new URLSearchParams(activationInfo));
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

// On device change
const deviceSelect = document.getElementById("deviceSelect");
deviceSelect.addEventListener("change", async (e) => {
  let info = await getDeviceInfo();
  // This will cause updatePage to be fired
  try {
    // Can fail from MAX_WRITE quotas
    await setDeviceInfo({ ...info, activeDevice: e.target.value });
  } catch (e) {
    // Go back if we couldn't switch the device
    deviceSelect.value = info.activeDevice;
  }
  // If not in settings, reinitialize
  if (!inSettings) {
    // Trigger a refresh
    // This way if you're in settings, you stay in settings
    initialize();
  }
});

// TOTP code
let totpCode = document.getElementById("totpCode");

// On TOTP
let totpWrapper = document.getElementById("totp");
totpWrapper.addEventListener("mouseleave", () => updateTOTP());
totpWrapper.addEventListener("click", () => {
  navigator.clipboard.writeText(totpCode.innerText); // Copy code to clipboard
  totpCode.innerText = "Copied";
});

// On settings gear clicked
let inSettings = false;
let gear = document.getElementById("gear");
gear.addEventListener("click", async function () {
  // If we are now in settings
  if ((inSettings = !inSettings)) {
    // Set gear color to red
    changeScreen("settings");
  } else {
    // In case the data was tampered with in the settings
    await initialize();
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
// TODO: fix this try catch nested hell. A more global error handler would help. Buttons have their own try catches too... ugly
pushButton.addEventListener("click", async function () {
  loading = true;
  // Disable button while making Duo request
  pushButton.disabled = true;
  pushButton.innerText = "Working...";
  let root = "Checking for Duo logins";
  let dots = 0;
  splash.innerHTML = `${root}...`;
  // Show loading ...
  let loadingInterval = setInterval(() => {
    splash.innerText = `${root}${".".repeat(dots + 1)}`;
    dots = (dots + 1) % 3;
  }, 300);
  try {
    let info = await getSingleDeviceInfo(); // this gets the active device when no pkey is supplied
    let transactions = (await buildRequest(info, "GET", "/push/v2/device/transactions")).response.transactions;
    // If no transactions exist at the moment
    if (transactions.length == 0) {
      failedAttempts++;
      splash.innerHTML = "No logins found!";
    }
    // Expected response: Only 1 transaction should exist
    // Only auto-approve this transaction if one-click logins aren't 3 (indicates two click login)
    else if (transactions.length == 1 && info.clickLevel != "3") {
      // Push the single transaction
      await handleTransaction(info, transactions, transactions[0].urgid); // this will handle switching screens
    }
    // There shouldn't be more than one transaction
    // Present all to the user
    else {
      // If one-click logins are disabled
      transactionsSplash.innerHTML = transactions.length == 1 ? "Is this you?" : "There's " + transactions.length + " login attempts.<br>Pick one. Others will be denied.";
      // Switch to transactions screen
      changeScreen("transactions");
      // Also reset the transactions page
      approveTable.replaceChildren();
      // For each transaction
      for (let i = 0; i < transactions.length; i++) {
        let row = document.createElement("tr");
        // First column
        let approve = document.createElement("button");
        // Checkmark
        approve.innerHTML = "&#x2713;";
        approve.className = "approve";
        approve.onclick = async () => {
          // Catch any possible errors
          // Even though this is wrapped in a try catch, you still HAVE to have inner try catch blocks because outer ones aren't called
          try {
            // Display loading
            approveTable.style.display = "none";
            transactionsSplash.innerText = "Working...";
            // Approve the transaction
            await handleTransaction(info, transactions, transactions[i].urgid);
            // successDetails.innerHTML = traverse(transactions[i].attributes);
            // changeScreen("success");
          } catch (error) {
            // Catching the error a bit earlier than the one below but probably redundant
            failedReason.innerHTML = error;
            changeScreen("failure");
          } finally {
            approveTable.style.display = "";
          }
        };

        // Generate table content
        // 1st column (approve button)
        let c1 = document.createElement("td");
        c1.appendChild(approve);

        // 2nd column (transaction details)
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
        if (transactions.length == 1) {
          // First column
          let deny = document.createElement("button");
          // Checkmark
          deny.innerHTML = "&#x2717;";
          deny.className = "deny";
          deny.onclick = async () => {
            // Catch any possible errors
            // Even though this is wrapped in a try catch, you still HAVE to have inner try catch blocks because outer ones aren't called
            try {
              // Display loading
              approveTable.style.display = "none";
              transactionsSplash.innerText = "Working...";
              // Approve an invalid transaction, which denies all transactions
              await handleTransaction(info, transactions, -1); // this handles switching to denied screen
            } catch (error) {
              // Catching the error a bit earlier than the one below but probably redundant
              failedReason.innerHTML = error;
              changeScreen("failure");
            } finally {
              approveTable.style.display = "";
            }
          };
          let c3 = document.createElement("td");
          c3.appendChild(deny);
          // Add to row
          row.appendChild(c3);
        }
        // Add all to page
        approveTable.appendChild(row);
      }
    }
  } catch (error) {
    console.error(error);
    failedReason.innerHTML = error;
    failedAttempts = 0;
    changeScreen("failure");
  } finally {
    clearInterval(loadingInterval);
    loading = false;
    // Re-enable button
    pushButton.disabled = false;
    pushButton.innerHTML = "Try Again";
    // If we couldn't login after many attemps
    if (failedAttempts >= 4) {
      failedAttempts = 0;
      // Remind the user how this extension works
      changeScreen("failedAttempts");
    }
  }
});

function traverse(json) {
  // If JSON is an array
  if (json !== null && Array.isArray(json)) {
    // If first object is a string (it's a key)
    if (json.length == 2 && typeof json[0] === "string") {
      let key = json[0];
      let value = json[1];
      // Toss out the unnecessary key/value pairs
      switch (json[0]) {
        // These values should stay the same regardless of the login, because it's the same account
        case "Username":
        case "Organization":
          return null;
        // Convert time to better form
        case "Time":
          // Epoch millis are returned as seconds
          // Convert to millis
          let d = new Date(Math.round(value) * 1000);
          // Day month year
          let display = d.getMonth() + 1 + "/" + d.getDate() + "/" + d.getFullYear();
          display += " at ";
          let AMPM = d.getHours() > 11 ? "PM" : "AM";
          let scaled = d.getHours() < 13 ? d.getHours() : d.getHours() - 12;
          // Convert from military time
          display += (scaled % 12 == 0 ? 12 : scaled) + ":" + twoDigits(d.getMinutes()) + ":" + twoDigits(d.getSeconds()) + " " + AMPM;
          value = display;
          break;
      }
      return `<b>${key}</b>: ${value}<br>`;
    } else {
      // Traverse
      let data = "";
      for (let i = 0; i < json.length; i++) {
        let branch = traverse(json[i]);
        if (branch !== null) {
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
  return input.toString().padStart(2, "0");
}

// When the user presses the 'Got it' button on the failure screen
document.getElementById("failureButton").addEventListener("click", function () {
  changeScreen("main");
});

// When the user presses the button on the intro screen, switch to activation
document.getElementById("introButton").addEventListener("click", function () {
  tutorialFlash.start();
  changeScreen("activation");
});

// Change the current slide on activation screen
function Timer(fn, timeout, onStop = () => { }) {
  let runner = null;
  this.start = () => {
    if (!runner) {
      runner = setInterval(fn, timeout);
    }
    return this;
  };
  this.stop = () => {
    if (runner) {
      clearInterval(runner);
      onStop();
      runner = null;
    }
    return this;
  };
}

let qrSearchText = document.getElementById("qrSearchText");
let qrErrorText = document.getElementById("qrErrorText");

// QR searcher
let root = "Searching for a QR code";
let qrDots = 0;

let checkQR = new Timer(async () => {
  splash.innerHTML = `${root}...`;
  qrSearchText.innerText = `${root}${".".repeat(qrDots + 1)}`;
  qrDots = (qrDots + 1) % 3;

  if (qrDots == 0) {
    try {
      let code = await getQRLinkFromPage().catch((e) => {
        throw "Tab not found";
      });
      // If successful, stop the timer
      checkQR.stop();
      qrSearchText.innerText = "Activating...";
      try {
        await activateDevice(code);
        changeScreen("activationSuccess");
      } catch (e) {
        qrSearchText.innerText = "Something went wrong. Go to Step 6 instead.";
        console.error(e);
      }
    } catch (e) {
      switch (e) {
        case "Error: Could not establish connection. Receiving end does not exist.": {
          root = "Can't establish a connection";
          break;
        }
        case "Tab not found": {
          root = "Generate a QR code";
          break;
        }
        case "QR not found": {
          root = "Flip through previous steps to generate QR";
          break;
        }
        default: {
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
  chrome.storage.sync.get(null, function (items) {
    console.log("ALL DATA", items);  // This will log all the data stored in chrome.storage.sync
  });
  // Global resetting
  checkQR.stop();
  inSettings = false;
  gear.style.fill = "grey";
  switch (id) {
    case "activation": {
      // Initialize the active slide (this is necessary on startup)
      updateSlide(slideIndex);
      break;
    }
    case "settings": {
      // Make sure when we go to settings, we reset the main page
      splash.innerHTML = "Click to approve Duo Mobile logins.";
      pushButton.innerText = "Login";
      inSettings = true;
      gear.style.fill = "red";
      break;
    }
    case "main": {
      pushButton.click();
      break;
    }
  }

  let screens = document.getElementsByClassName("screen");
  // For each screen div
  for (let i = 0; i < screens.length; i++) {
    let div = screens[i];
    // If this is the screen we want to switch to
    if (div.id == id) {
      // Make it visible
      div.style.display = "";
    }
    // Make all others invisible
    else {
      div.style.display = "none";
    }
  }
}

function updateSlide(newIndex) {
  if (newIndex == 3) {
    checkQR.start();
  } else {
    checkQR.stop();
  }
  let slides = document.getElementsByClassName("slide");

  for (let i = 0; i < slides.length; i++) {
    slides[i].style.display = "none";
  }

  // Clamp newIndex within bounds
  if (newIndex > slides.length - 1) slideIndex = 0;
  else if (newIndex < 0) slideIndex = slides.length - 1;

  // Store in case user clicks off to browse to Duo tab so they don't have to flip back
  chrome.storage.session.set({ activeSlide: slideIndex });
  slides[slideIndex].style.display = "";

  // Update slide count
  let count = document.getElementById("counter");
  count.textContent = slideIndex + 1 + "/" + slides.length;
}

// Convert Base64 string to an ArrayBuffer
function base64ToArrayBuffer(base64) {
  let binary_string = atob(base64);
  let len = binary_string.length;
  let bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
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

// Delete modals
let deleteModal = document.getElementById("deleteModal");
let modalPrompt = document.getElementById("modalPrompt");

async function showDeleteModal(prompt, onAccept = () => { }) {
  modalPrompt.innerText = prompt;
  document.getElementById("confirmDialog").onclick = onAccept;
  deleteModal.showModal();
}

// Update device name
let deviceNameResponse = document.getElementById("deviceNameFeedback");
let deviceName = document.getElementById("deviceName");
deviceName.oninput = async (e) => {
  let value = e.target.value;
  if (value.length <= 0 || value.length > 64) {
    deviceNameResponse.innerHTML = `Must be within 1-64 characters`;
    return;
  }
  let info = await getSingleDeviceInfo();
  info.name = value;
  await setSingleDeviceInfo(info).then(() => {
    deviceSelect.querySelector(`option[value="${info.pkey}"]`).innerText = value;
    // updatePage();
  }).catch((e) => {
    deviceNameResponse.innerHTML = `<b>Invalid data</b>:<br>${e}`;
  });
};

// Click login slider
const clickSlider = document.getElementById("clickLogins");
const clickSliderState = document.getElementById("clickLoginState");

// Update the current slider value (each time you drag the slider handle)
clickSlider.oninput = async function (event) {
  let value = event.target.value;
  // Update data if it changed
  let data = await getSingleDeviceInfo();
  if (data.clickLevel != value) {
    data.clickLevel = value;
    // No need to update the page here, slider already updated it
    await setSingleDeviceInfo(data).then(() => {
      updateClickSlider(value);
    }).catch((e) => {
      console.error(e);
      // Go back to old value
      updateClickSlider();
      // In case the user is literally MASHING the slider just tell them if it refuses to save their data
      clickSliderState.innerText = e;
    });
  }
};

// Delete device
document.getElementById("deleteButton").onclick = async () => {
  let data = await getSingleDeviceInfo();
  showDeleteModal(`Are you sure you want to delete this device (${data.name})? You'll need to delete it from your Duo account too.`, async () => {
    let data = await getDeviceInfo();
    // Delete the single device data
    await chrome.storage.sync.remove(data.activeDevice);
    // Remove from devices
    data.devices = data.devices.filter(item => item != data.activeDevice);
    // Go back to previous device, or if on the only device, this should take them to the add device screen
    data.activeDevice = data.devices.length ? data.devices[data.devices.length - 1] : -1;
    await setDeviceInfo(data);
  });
};

// Import button
let importSplash = document.getElementById("importSplash");
document.getElementById("importButton").addEventListener("click", async function () {
  document.getElementById("importFile").click();
});

const importFile = document.getElementById("importFile");
importFile.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  // Get original (working) data
  let ogData = await getExportableData();
  const reader = new FileReader();
  reader.onload = async (e) => {
    console.log("Importing data");
    try {
      importSplash.innerHTML = "Checking...";
      // In case this is successful data, we need to clear all devices so old ones don't get retained
      await clearAll();
      // Set the data with new data. If it fails we simply fallback to ogData
      await setDeviceInfo(JSON.parse(atob(e.target.result)), false);
      // Get sanitized data
      let newData = await getDeviceInfo();
      // Ensure transactions for all devices still work
      let invalidDevices = 0;
      for (let index in newData.devices) {
        let device = newData.devices[index];
        importSplash.innerHTML = `Verifying ${Number(index) + 1} / ${newData.devices.length}...`;
        // Grab that data
        // Wait for the device data to load
        let singleDevice = await getSingleDeviceInfo(device);
        try {
          // Attempt to simply get the transactions
          await buildRequest(singleDevice, "GET", "/push/v2/device/transactions");
        } catch (e) {
          console.error("Failed to verify device", e);
          invalidDevices++;
        }
      }
      // If none of the devices worked
      if (invalidDevices == newData.devices.length) throw new Error("None of the devices passed validation");
      // Success! Above code didn't throw errors
      importSplash.innerHTML = `Updating data...`;
      await setDeviceInfo(newData);
      if (invalidDevices > 0) {
        importSplash.innerHTML = `Data imported, but ${invalidDevices} device${invalidDevices == 1 ? "" : "s"} failed validation`;
      } else {
        importSplash.innerHTML = "Data imported!";
      }
      // You can now populate fields or use the data as needed
    } catch (err) {
      console.error("Failed to verify data", err);
      // If it failed, go back to OG data
      setDeviceInfo(ogData).then(() => {
        // Tell the user this is an invalid code
        importSplash.innerText = `Invalid data`;
      }).catch(e => {
        console.error("Failed to set back to original data");
        // Tell the user this is an invalid code
        importSplash.innerText = `Failed to set back to old data. Reimport this later!`;
        downloadFile(btoa(JSON.stringify(ogData)), "auto-2fa.txt");
      });
    } finally {
      importFile.value = "";
    }
  };
  reader.readAsText(file);
});

// Export button
document.getElementById("exportButton").addEventListener("click", async function () {
  // Needs to save a file
  // Set text to be data. Scramble with Base64
  downloadFile(btoa(JSON.stringify(await getExportableData())), "auto-2fa.txt");
});

async function getExportableData() {
  // Always will have data thanks to sanitization
  let info = await getDeviceInfo();
  // Get all device data by keys
  let allDevices = await new Promise((resolve) => chrome.storage.sync.get(info.devices, resolve)); // so ig you can grab multiple storage values at once
  info.devices = info.devices.map((key) => allDevices[key]);
  return info;
}

// Export TOTPs
document.getElementById("exportTOTPButton").addEventListener("click", async function () {
  let info = await getDeviceInfo();
  let allDevices = await new Promise((resolve) => chrome.storage.sync.get(info.devices, resolve));
  let totps = [];
  // Get all devices that have TOTP data
  for (let index in allDevices) {
    let device = allDevices[index];
    if (device.hotp_secret) {
      totps.push(totp.keyuri(device.name, "Duo Mobile", base32Encode(device.hotp_secret)));
    }
  }
  if (!totps.length) {
    importSplash.innerHTML = "No devices have TOTP data";
  } else {
    downloadFile(totps.join("\n"), "duo-mobile-totps.txt");
    if (totps.length == info.devices.length) {
      importSplash.innerHTML = `Exported all devices`;
    } else {
      importSplash.innerHTML = `Exported ${totps.length} of ${info.devices.length}`;
    }
  }
});

function base32Encode(input) {
  const base32Alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let binary = "";
  for (let i = 0; i < input.length; i++) {
    binary += input[i].charCodeAt(0).toString(2).padStart(8, "0");
  }
  let encoded = "";
  for (let i = 0; i < binary.length; i += 5) {
    const chunk = binary.slice(i, i + 5).padEnd(5, "0");
    const index = parseInt(chunk, 2);
    encoded += base32Alphabet[index];
  }
  // while (encoded.length % 8 !== 0) {
  //   encoded += "=";
  // }
  return encoded;
}

// thank you authenticator <3
function downloadFile(data, filename) {
  const blob = new Blob([data], { type: "text/plain" });
  // Simulate pressing <a> tag
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

// Reset button
let resetSplash = document.getElementById("resetSplash");
document.getElementById("resetButton").onclick = () => {
  showDeleteModal(`Are you sure you want to delete all data?`, async () => {
    await clearAll();
    // Reset main page
    slideIndex = 0;
    errorSplash.innerText = "Use arrows to flip through instructions:";
    activateButton.innerText = "Activate";
    getDeviceInfo().then(updatePage);
  });
};

// Delete the entire thing
// We are not using local storage anymore, but it WAS being used in earlier versions
// I also don't know what happens if the user doesn't have syncing enabled (i think just uses local)
async function clearAll() {
  await new Promise((resolve) => chrome.storage.session.clear(resolve));
  await new Promise((resolve) => chrome.storage.sync.clear(resolve));
  await new Promise((resolve) => chrome.storage.local.clear(resolve));
}

// Updates page information to new device information
const deviceSettingsDiv = document.getElementById("deviceSettingsDiv");
async function updatePage(deviceInfo) {
  // Reset globals
  importSplash.innerHTML = "Manage data";
  // Remove devices already added
  Array.from(deviceSelect.options).forEach(option => {
    if (option.value !== "-1") deviceSelect.removeChild(option);
  });
  let allDevices = await new Promise((resolve) => chrome.storage.sync.get(deviceInfo.devices, resolve));
  // Add to select device box
  for (let device in allDevices) {
    let newDevice = document.createElement("option");
    newDevice.value = device;//deviceInfo.devices.indexOf(device);
    newDevice.innerText = allDevices[device].name;
    deviceSelect.appendChild(newDevice);
    deviceSelect.insertBefore(newDevice, deviceSelect.firstChild);
  }
  // If we're not on the "Add device..." device
  if (deviceInfo.activeDevice != -1) {
    let activeDevice = allDevices[deviceInfo.activeDevice];
    deviceSettingsDiv.style.display = "revert";
    deviceName.value = activeDevice.name;
    deviceNameResponse.innerHTML = "Name";
    // Update selected device value
    deviceSelect.value = deviceInfo.activeDevice;
    updateClickSlider(activeDevice.clickLevel);
  } else {
    // Hide device settings
    deviceSettingsDiv.style.display = "none";
  }
  // Show device TOTP
  updateTOTP();
}

function updateClickSlider(clickLevel) {
  // Update slider for this device
  clickSlider.value = clickLevel;
  switch (clickSlider.value) {
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
}

async function updateTOTP() {
  let deviceInfo = await getDeviceInfo();
  let hideTOTP = true;
  if (deviceInfo.activeDevice != -1) {
    let activeDevice = await getSingleDeviceInfo();
    if (activeDevice.use_totp) {
      hideTOTP = false;
      totpCode.innerText = totp.generate(activeDevice.hotp_secret);
    }
  }
  // Hide or show
  // Setting display stops the animation so this is the alternative
  totpWrapper.style.visibility = hideTOTP ? "hidden" : "inherit";
}

// Constantly update TOTPs
// updateTOTP handles if there's no active device
setTimeout(() => {
  updateTOTP();
  setInterval(updateTOTP, 30000);
}, 30000 - (Date.now() % 30000));

// On startup
await initialize().finally(() => {
  document.getElementById("totpCircle").style.animationDelay = `-${(Date.now() % 30000) / 1000}s`;
  // Show body when done
  document.getElementById("content").style.display = "";
});

// Changes the current screen to what it should be depending on if deviceInfo is present
async function initialize() {
  failedAttempts = 0;
  let data = await getDeviceInfo();
  updatePage(data);
  // If we're offline
  if (!navigator.onLine) {
    changeScreen("offline");
  } else if (data.activeDevice != -1) {
    // If we have device data, set to main screen
    changeScreen("main");
  } else {
    let activeSlide = (await chrome.storage.session.get("activeSlide")).activeSlide;
    // If first time opened
    if (!activeSlide && activeSlide !== 0) {
      changeScreen("intro");
    } else {
      slideIndex = activeSlide;
      // Only flash if we're not on the last screen (or searching for QR)
      if (slideIndex != 3 && slideIndex != 5) {
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
  if (!tab) throw "Tab not found";
  return await chrome.tabs.sendMessage(tab.id, { task: "getQRCode" }).then((response) => {
    // Response is the QR code parsed and ready to be activated
    if (!response) throw "QR not found";
    return response;
  });
}

// Returns a promise of the device info
async function getDeviceInfo() {
  return sendToWorker({ intent: "deviceInfo" });
}

// Returns a promise of setting the device info (for consistency)
async function setDeviceInfo(info, update = true) {
  return sendToWorker({
    intent: "setDeviceInfo",
    params: {
      info,
    },
  }).then((response) => {
    // Response is the sanitized data
    if (update) updatePage(response);
    // Might as well return it even if it does nothing atm
    return response;
  });
}

async function getSingleDeviceInfo(pkey) {
  if (!pkey) {
    const info = await getDeviceInfo();
    pkey = info.activeDevice;
  }
  return await new Promise((resolve) =>
    chrome.storage.sync.get(pkey, (json) => {
      // First key is always the identifier
      resolve(json[Object.keys(json)[0]]);
    })
  );
}

function setSingleDeviceInfo(rawDevice) {
  return chrome.storage.sync.set({ [rawDevice.pkey]: rawDevice });
}

// Makes a request to the Duo API
function buildRequest(info, method, path, extraParam) {
  return sendToWorker({
    intent: "buildRequest",
    params: {
      info,
      method,
      path,
      extraParam,
    },
  });
}

let verifiedTransactions;
let verifiedPushUrgID;

let verifyButton = document.getElementById("verifyButton");
verifyButton.addEventListener("click", async () => {
  // Disable button so user can't spam it
  verifyButton.disabled = true;
  verifyButton.innerText = "Working...";

  try {
    let info = await getSingleDeviceInfo(); // get active device
    let response = await sendToWorker({
      intent: "approveTransaction",
      params: {
        info,
        verifiedTransactions,
        verifiedPushUrgID,
        // Presence of verificationCode signals to add step_up_code bs to approve request
        verificationCode: Array.from(document.querySelectorAll(".pin-input"))
          .map((input) => input.value)
          .join(""), // assemble all digits into one string
      },
    });
    console.log("Response from worker: ", response);
    // If successful (throws an error otherwise)
    successDetails.innerHTML = traverse(transactions[i].attributes);
    failedAttempts = 0;
    changeScreen("success");
  } catch (error) {
    console.error(error);
    failedReason.innerHTML = error;
    failedAttempts = 0;
    changeScreen("failure");
  } finally {
    // Probably doesn't hurt to reset it although there's no need to
    verifiedTransactions = null;
    verifiedPushUrgID = null;
    // Re-enable button
    verifyButton.disabled = false;
    verifyButton.innerText = "Verify";
  }
});

// Approves the transaction ID provided, denies all others
// Throws an exception if no transactions are active
async function handleTransaction(info, transactions, txID) {
  if (transactions.length == 0) {
    throw "No transactions found (request expired)";
  }
  let selectedTransaction = transactions.find((sample) => sample.urgid == txID);
  if (selectedTransaction) {
    // Only approve this one
    // First check if its a duo verified push
    let stepUpCode = selectedTransaction.step_up_code_info;
    if (stepUpCode) {
      console.log("Duo verified push");
      let container = document.getElementById("pin-container");
      container.innerHTML = ""; // clear previous elements
      container.style.gridTemplateColumns = `repeat(${stepUpCode.num_digits}, 1fr)`;
      // Set input box to # of digits requested
      for (let i = 0; i < stepUpCode.num_digits; i++) {
        const input = document.createElement("input");
        input.maxLength = 1;
        input.className = "pin-input";
        // Validate only digits
        input.addEventListener("beforeinput", (e) => {
          let value = e.target.value;
          let nextVal = value.substring(0, e.target.selectionStart) + (e.data ?? "") + value.substring(e.target.selectionEnd);
          // Only allow a single digit
          if (!/^\d?$/.test(nextVal)) {
            e.preventDefault();
          }
        });
        // Go to next entry when there's an input
        input.addEventListener("input", (e) => {
          const value = e.target.value;
          const nextInput = container.children[i + 1];
          if (value.length === 1 && nextInput) {
            nextInput.focus();
          }
        });
        // Go back
        input.addEventListener("keydown", (e) => {
          if (e.key === "Backspace" && !input.value && i > 0) {
            container.children[i - 1].focus();
          }
        });
        container.appendChild(input);
      }
      // Store this transaction for after we receive the code
      verifiedTransactions = transactions;
      verifiedPushUrgID = urgID;
      changeScreen("verifiedPush");
    } else {
      // Not a verified push, approve it
      await sendToWorker({
        intent: "approveTransaction",
        params: {
          info,
          transactions,
          txID,
        },
      });
      // await buildRequest(info, "POST", "/push/v2/device/transactions/" + urgID, { answer: "approve", txId: urgID });
      // If successful (throws an error otherwise)
      successDetails.innerHTML = traverse(selectedTransaction.attributes);
      failedAttempts = 0;
      changeScreen("success");
    }
  } else {
    // Selected transaction not found! Deny everything (txID == -1 [probably])
    await sendToWorker({
      intent: "approveTransaction",
      params: {
        info,
        transactions,
        txID,
      },
    });
    changeScreen("denied");
  }
}

// Handles errors with service worker which stores all the important functions
async function sendToWorker(intent) {
  let response = await chrome.runtime.sendMessage(intent);
  if (response && response.error) {
    throw response.reason;
  }
  return response;
}
