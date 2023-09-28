// Wait for popup.js to ask for QR
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    /**
     * Credit to Easy Duo Authentication for this traditional and universal prompt detection
     * https://github.com/SparkShen02/Easy-Duo-Authentication/blob/main/content.js
    **/
    let code = document.querySelector('img.qr'); // Traditional Prompt
    code = (code) ? code : document.querySelector('img[data-testid="qr-code"]'); // Universal Prompt
    // Snip URL
    sendResponse((code) ? code.src.substring(code.src.indexOf('value=') + 6) : null);
});
