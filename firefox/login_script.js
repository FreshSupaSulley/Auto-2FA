// Notify the service worker we are on a login page
browser.runtime.sendMessage({intent: "onLoginPage"});
