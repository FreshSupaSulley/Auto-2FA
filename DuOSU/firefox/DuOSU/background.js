let lastRequest = 0;
// Change icon when message is received
// Service worker is required to change icons because content scripts can't change icons
browser.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    browser.browserAction.setIcon({path: "images/" + message.value + ".png"});
    lastRequest = Date.now();
    let startTime = lastRequest;
    // Set icon back to normal after enough time
    await new Promise(res => setTimeout(res, 3000)).then(() => {
        // If this icon change is the newest
        if(startTime == lastRequest) {
            browser.browserAction.setIcon({path: "images/duo32.png"});
        }
    });
});

browser.runtime.onInstalled.addListener((event) => {
    if(event.reason == "install") {
        browser.tabs.create({ url: "welcome.html" });
    }
});
