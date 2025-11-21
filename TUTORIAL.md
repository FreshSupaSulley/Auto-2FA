# Tutorial
Welcome to Auto 2FA! This guide is meant to be a more detailed walkthrough of how to use this extension.

- [Setup](#setup)
- [Usage](#usage)

## Setup
Before you begin, navigate to your organization's Duo Mobile devices page. If you don't know where the link is, you can usually google the name of your organization followed by "duo mobile".

> [!NOTE]
> Your organization's Duo Mobile devices page either uses the new Universal Prompt, or the dated Traditional Prompt. You can toggle between them with these buttons:
> 
> ![Select Universal or Traditional Instructions](https://github.com/user-attachments/assets/8d62b5ed-a71c-4eea-87d1-7bbff29efd5e)

Quick links:
- [Universal Instructions](#universal-instructions)
- [Traditional Instructions](#traditional-instructions)

### Universal Instructions
#### 1. Add a new device
<img width="296" alt="Add a new device" src="public/images/universal/0.png"></img>

Once you navigate to your organization's Duo Mobile device manager website, click the *Add a new Device* button.

#### 2. Click Duo Mobile
<img width="296" alt="Click Duo Mobile" src="public/images/universal/1.png"></img>

Auto 2FA is treated like the app, so click the Duo Mobile app option.

#### 3. Click I have a tablet, then Next
<img width="296" alt="Click tablet" src="public/images/universal/2.png"></img>

You don't need to enter a phone number. Click the *I have a tablet* button instead. If you include your phone number, it'll simply associate the number with the device and have no impact on functionality.

#### 4. Scan the QR Code
A QR code will be generated. Open Auto 2FA on the same page as the QR code and it should handle the rest. If you don't see a QR code (or it's failing to scan it) keep reading.

> [!WARNING]
> If the QR code didn't work, keep reading. Otherwise you are good to go!

#### 5. Email code to yourself
<img width="296" alt="Get an activation link" src="public/images/universal/4.png"></img>

If the QR code didn't work, click *Get an activation link* and get your inbox ready to receive the code. Duo will email you the activation code. Once you receive it, click the link provided in the email. Make sure you open this link on your computer and not your phone to prevent the Duo Mobile app from auto-opening it.

#### 6. Activate
<img width="296" alt="Copy the code in the box" src="public/images/6.png"></img>

After opening the link, you'll see a box in the center of the page containing the activation code. Copy and paste it into the box in Auto 2FA on Step 6, then click activate.

### Traditional Instructions
#### 1. Add a new device
<img width="296" alt="Add a new device" src="public/images/traditional/0.png"></img>

Once you navigate to your organization's Duo Mobile device manager website, click the *Add a new Device* button.

#### 2. Click Tablet, then iOS
<img width="296" alt="Click tablet, then iOS" src="public/images/traditional/1.png"></img>

Auto 2FA works like the phone app, so click the tablet option, then iOS.

#### 3. Click I have Duo Mobile installed.
<img width="296" alt="Click I have Duo Mobile installed" src="public/images/traditional/2.png"></img>

#### 4. Scan the QR Code
A QR code will be generated. Open Auto 2FA on the same page as the QR code and it should handle the rest. If you don't see a QR code (or it's failing to scan it) keep reading.

> [!WARNING]
> If the QR code didn't work, keep reading. Otherwise you are good to go!

#### 5. Email code to yourself
<img width="296" alt="Get an activation link" src="public/images/traditional/4.png"></img>

If the QR code didn't work, click *Get an activation link* and get your inbox ready to receive the code. Duo will email you the activation code. Once you receive it, click the link provided in the email. Make sure you open this link on your computer and not your phone to prevent the Duo Mobile app from auto-opening it.

#### 6. Activate
<img width="296" alt="Copy the code in the box" src="public/images/6.png"></img>

After opening the link, you'll see a box in the center of the page containing the activation code. Copy and paste it into the box in Auto 2FA on Step 6, then click activate. Then you can click the continue button back on the website.

## Usage
Now that Auto 2FA is setup, you're ready to start logging in with it. Whenever you try to login to your Duo-protected service, a push request is sent to *just one* of your devices (typically it would be your phone). Instead of approving it with your phone, you can click *Other options* to choose another device, and clicking on the device Auto 2FA created for you. Then click on Auto 2FA to approve the login.

> [!TIP]
> If Duo is always sending that first request to your phone, you may be able to configure a "default device" in your organization's device control panel. For me, that unfortunately meant deleting my phone and adding it again to append it behind Auto 2FA in the device list.
