// otplib
import "./libs/buffer.js";
import "./libs/index.js";
const { totp } = window.otplib;

async function showDeleteModal(prompt, onAccept = () => { }) {
  if (window.confirm(prompt)) {
    onAccept();
  }
}

// Import button
let dataSplash = document.getElementById("importSplash");
document.getElementById("importButton").addEventListener("click", async function () {
  // Warn if we're going to override devices
  if ((await getDeviceInfo()).devices?.length > 0) {
    showDeleteModal(`This will replace all data! Continue?`, () => {
      document.getElementById("importFile").click();
    });
  } else {
    document.getElementById("importFile").click();
  }
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
      dataSplash.innerHTML = "Checking...";
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
        dataSplash.innerHTML = `Verifying ${Number(index) + 1} / ${newData.devices.length}...`;
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
      dataSplash.innerHTML = `Updating data...`;
      await setDeviceInfo(newData);
      if (invalidDevices > 0) {
        dataSplash.innerHTML = `Data imported, but ${invalidDevices} device${invalidDevices == 1 ? "" : "s"} failed validation`;
      } else {
        dataSplash.innerHTML = "Data imported!";
      }
      // You can now populate fields or use the data as needed
    } catch (err) {
      console.error("Failed to verify data", err);
      // If it failed, go back to OG data
      setDeviceInfo(ogData).then(() => {
        // Tell the user this is an invalid code
        dataSplash.innerText = `Invalid data`;
      }).catch(e => {
        console.error("Failed to set back to original data", e);
        // If the OG data had devices
        if (ogData.devices?.length > 0) {
          dataSplash.innerText = `Failed to set back to old data${ogData.devices?.length > 0 ? '. Reimport this later!' : ''}`;
          downloadFile(btoa(JSON.stringify(ogData)), "auto-2fa.txt");
        } else {
          dataSplash.innerText = `Failed to verify data`;
        }
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
  if ((await getDeviceInfo()).devices?.length > 0) {
    downloadFile(btoa(JSON.stringify(await getExportableData())), "auto-2fa.txt");
    dataSplash.innerText = `Data exported!`;
  } else {
    dataSplash.innerText = `No data to export!`;
  }
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
    dataSplash.innerHTML = "No devices have TOTP data!";
  } else {
    downloadFile(totps.join("\n"), "duo-mobile-totps.txt");
    if (totps.length == info.devices.length) {
      dataSplash.innerHTML = `Exported all devices`;
    } else {
      dataSplash.innerHTML = `Exported ${totps.length} of ${info.devices.length}`;
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
    resetSplash.innerHTML = "Data reset";
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

// Returns a promise of the device info
async function getDeviceInfo() {
  return sendToWorker({ intent: "deviceInfo" });
}

// Returns a promise of setting the device info (for consistency)
async function setDeviceInfo(info) {
  return sendToWorker({
    intent: "setDeviceInfo",
    params: {
      info,
    },
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

// Handles errors with service worker which stores all the important functions
async function sendToWorker(intent) {
  let response = await chrome.runtime.sendMessage(intent);
  if (response && response.error) {
    throw response.reason;
  }
  return response;
}
