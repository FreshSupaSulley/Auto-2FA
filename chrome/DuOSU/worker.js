let lastRequest = 0;
// Change icon when message is received
// Service worker is required to change icons because content scripts can't change icons
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    chrome.action.setIcon({path: "images/" + message.value + ".png"});
    lastRequest = Date.now();
    let startTime = lastRequest;
    // Set icon back to normal after enough time
    await new Promise(res => setTimeout(res, 3000)).then(() => {
        // If this icon change is the newest
        if(startTime == lastRequest) {
            chrome.action.setIcon({path: "images/duo32.png"});
        }
    });
});

chrome.runtime.onInstalled.addListener((event) => {
    if(event.reason == "install") {
        chrome.tabs.create({ url: "welcome.html" });
    }
});
