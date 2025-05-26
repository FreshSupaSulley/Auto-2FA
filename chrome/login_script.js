(function () {
    // Notify the service worker we are on a login page
    function notify() {
        chrome.runtime.sendMessage({
            intent: "onLoginPage", params: {
                // If a verification code exists on this page, this will notify the extension
                verificationCode: document.querySelector(".verification-code")?.innerText
            }
        });
    };

    // Notify immediately on load
    notify();

    // Might as well retry if they hit "Other options" which changes the URL
    window.navigation.addEventListener("navigate", (e) => {
        notify(); // worker will handle if we already approved something recently and ignore this
    })

    // Try to find the verification code if it becomes available
    function checkVerificationCode() {
        const code = document.querySelector(".verification-code");
        if (code && code.innerText.trim() !== "") {
            console.log("Verification code detected: " + code.innerText);
            notify();
            observer.disconnect();
        }
    }
    const observer = new MutationObserver(() => {
        checkVerificationCode();
        // If we really want to be nit-picky we can distinguish between other options and an actual page but idk if that's backwards compatible with traditional prompt
        // const currentUrl = window.location.href;
        // // Check if the URL matches the patterns you're interested in
        // if (currentUrl.match(/https:\/\/api-\w+.duosecurity.com\/frame\/v4\/auth\/all_methods\?sid=.*/)) {
        //     console.log("Currently on all_methods page");
        // } else if (currentUrl.match(/https:\/\/api-\w+.duosecurity.com\/frame\/v4\/auth\/prompt\?sid=.*/)) {
        //     console.log("Currently on prompt page");
        //     // Optionally, notify whenever the URL switches to the "prompt" page
        //     notify();
        // }
    });
    observer.observe(document.body, {
        childList: true,
        subtree: true,
    });
    // Just in case the element is already there on load
    checkVerificationCode();

    // FOR TESTING: Inject a fake verification code after 2 seconds
    // setTimeout(() => {
    //     const fakeCodeElement = document.createElement("div");
    //     fakeCodeElement.className = "verification-code";
    //     fakeCodeElement.innerText = "123456"; // fake code
    //     document.body.appendChild(fakeCodeElement);
    //     console.log("Fake verification code injected for testing.");
    // }, 2000);
})();
