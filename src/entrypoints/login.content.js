export default defineContentScript({
    matches: ["https://*.duosecurity.com/frame/*/auth/prompt*", "https://*.duosecurity.com/frame/prompt*"],
    main() {
        // Notify the service worker we are on a login page
        function notify() {
            browser.runtime.sendMessage({
                intent: "onLoginPage", params: {
                    // If a verification code exists on this page, this will notify the extension
                    verificationCode: document.querySelector(".verification-code")?.innerText
                }
            });
        };

        // Notify immediately on load
        notify();

        // Try to find the verification code if it becomes available
        // function checkVerificationCode() {
        //     const code = document.querySelector(".verification-code");
        //     if (code && code.innerText.trim() !== "") {
        //         console.log("Verification code detected: " + code.innerText);
        //         notify();
        //         observer.disconnect();
        //     }
        //     notify(); // worker will handle if we already approved something recently and ignore this
        // }
        const observer = new MutationObserver(() => {
            notify(); // worker will handle if we already approved something recently and ignore this
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
        });

        // Just in case the element is already there on load
        notify();

        // FOR TESTING: Inject a fake verification code after 2 seconds
        // setTimeout(() => {
        //     const fakeCodeElement = document.createElement("div");
        //     fakeCodeElement.className = "verification-code";
        //     fakeCodeElement.innerText = "123456"; // fake code
        //     document.body.appendChild(fakeCodeElement);
        //     console.log("Fake verification code injected for testing.");
        // }, 2000);
    }
});
