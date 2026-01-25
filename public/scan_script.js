console.log("Auto 2FA QR scan script injected");
// Wait for popup.js to ask for QR
(typeof browser !== 'undefined' ? browser : chrome).runtime.onMessage.addListener((_message, _sender, sendResponse) => {
    console.log("Received QR code request");
    // Find any <img> on the page that has a src of https://api-********.duosecurity.com/frame/qr?value=https%3A%2F%2Fm-********.duosecurity.com%2Factivate%2F********************
    const qrImg = document.querySelector('img[src*=".duosecurity.com/frame/qr?value="]');
    let response;
    if (qrImg) {
        console.log("QR img found: ", qrImg);
        const baseQRURL = new URL(qrImg.src);
        const valueURL = new URL(decodeURIComponent(baseQRURL.searchParams.get('value')));
        console.log("Value URL:", valueURL);
        let activationCode, host;
        // Value can apparently be in a couple different forms (see #24)
        if (valueURL.protocol == "duo:") {
            // QR format (https://m-********.duosecurity.com/activate/XXXXXXXXXXXXXXXXXXXX)
            console.log(valueURL);
            activationCode = valueURL.hostname.substring(0, 20);
            host = valueURL.hostname.substring(21);
        } else {
            // Email format (duo://XXX-YYY)
            host = btoa(baseQRURL.host);
            activationCode = valueURL.pathname.split('/')[2];
        }
        // Get the host and activation code
        console.log("Parsed host:", host);
        console.log("Parsed activation code:", activationCode);
        response = `${activationCode}-${host}`; // convert to the email format (base64 hostname)
    } else {
        // Handled upstream
        response = null;
    }
    sendResponse(response);
});
