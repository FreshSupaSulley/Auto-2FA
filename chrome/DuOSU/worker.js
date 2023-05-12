chrome.runtime.onInstalled.addListener((event) => {
    if(event.reason == "install") {
        chrome.tabs.create({ url: "welcome.html" });
    }
});
