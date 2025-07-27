export default defineContentScript({
    matches: ["https://*.duosecurity.com/*"],
    main() {
        // Wait for popup.js to ask for QR
        browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
            /**
             * Credit to Easy Duo Authentication for this traditional and universal prompt detection
             * repo got deleted tho idk why ):
             * https://github.com/SparkShen02/Easy-Duo-Authentication/blob/main/content.js
            */
            let code = document.querySelector('img.qr'); // Traditional Prompt (idk if this works anymore)
            code = (code) ? code : document.querySelector('img[data-testid="qr-code"]'); // Universal Prompt
            console.log("Found QR image", code);
            // v1.6.1:
            // There appears to be a new format for the QR code src... so we're handling that here
            // We convert it to the form used when sending an activation code your email inbox
            // New format looks something like this:
            // https://api-********.duosecurity.com/frame/qr?value=https%3A%2F%2Fm-********.duosecurity.com%2Factivate%2F********************
            if (code) {
                console.log("Converting image src to email format");
                const parsedMainUrl = new URL(code.src);
                const parsedActivationUrl = new URL(decodeURIComponent(parsedMainUrl.searchParams.get('value'))); // decode the URL in value
                // Get the host and activation code
                const host = parsedMainUrl.host;
                const activationCode = parsedActivationUrl.pathname.split('/')[2];
                console.log("Parsed host", host);
                console.log("Parsed activation code", activationCode);
                code = `${activationCode}-${btoa(host)}`; // convert to the email format
            } else {
                // Handled upstream
                code = null;
            }
            sendResponse(code);
        });
    }
})
