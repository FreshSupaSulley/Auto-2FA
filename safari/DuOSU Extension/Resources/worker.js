browser.runtime.onInstalled.addListener((event) => {
    if(event.reason == "install") {
        browser.tabs.create({ url: "welcome.html" });
    }
});
