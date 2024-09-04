// Notify the service worker we are on a login page
chrome.runtime.sendMessage({intent: "onLoginPage"});
