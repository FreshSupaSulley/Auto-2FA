# Auto 2FA
Login through Duo Mobile in your browser.

The Duo Mobile app can be a nuisance; you might've lost your phone or maybe you're prone to getting distracted by Instagram. Now you can login with just a click.

Auto 2FA is currently on [Chrome, Edge](https://chrome.google.com/webstore/detail/duochrome/bnfooenhhgcnhdkdjelgmmkpaemlnoek), and [Firefox](https://addons.mozilla.org/en-US/firefox/addon/duochrome/). Safari was considered, but there's no way I'm paying $100/yr to be an Apple Developer. Outdated Safari source is available on this page if you would like to build it yourself, but it won't be on the App Store unless someone with a developer membership wants to publish it. If you'd like to see Auto 2FA added to another browser, open an issue.

Disclaimer
----------
This is an independent project and is not recognized, endorsed, or affiliated with Duo Mobile or Cisco Technology. All product names, logos, and brands are property of their respective owners.

This project was named from DuOSU to Duochrome, and now to Auto 2FA in an effort to combat trademark violations.

How it Works
------------
Auto 2FA utilizes the knowledge gained from reverse engineering the official phone app (checkout [this repo](https://github.com/revalo/duo-bypass)). Turns out it's a simple process:

1. Activate Auto 2FA as a new Duo Mobile device. Auto 2FA will communicate with Duo's API activation endpoint and register itself as your new Android device. "Device information" is created during this, and it's synced to your browser account if your settings allow it (see [Privacy](#privacy)).
2. Approve transactions. A transaction, or a push request, represents a login attempt. When clicked, Auto 2FA approves a single transaction without asking you for approval for a seamless login (see [Login Clicks](#login-clicks)). If there are multiple push requests, you'll compare their details to weed out old or malicious ones.

Auto 2FA can only approve push requests sent to the device it created during activation, meaning it can't approve a push request sent to the user's phone. This is not my decision, this is Duo's security. With this in mind, don't make Auto 2FA your only device capable of logging you in. It should be used as another option, not as the only option.

Security
--------
> [!CAUTION]
> This extension is experimental! Auto 2FA relies entirely on the security of your browser. If a malicious party got access to your browser and you have syncing enabled for both Auto 2FA and your passwords, they could log in to your Duo Mobile protected service.

To preface, I am not a cyber security expert. I have a basic understanding of 2FA. I do not recommend using this extension if Duo is protecting access to the nuclear football. Auto 2FA should only be used when both the risk and cost of compromising an account are practically zero.

Auto 2FA is a *practical* secure alternative to the Duo Mobile app. For typical Duo Mobile users, this extension strikes a great balance between security and convenience.

2-step verification is something you know, and something you have. The premise of this extension is that you *know* your password, and you *have* Auto 2FA. But by using Auto 2FA, you're introducing new risks to your Duo Mobile protected account being compromised. Here's some examples:
1. Your browser account (such as your Google profile if you're on Chrome) is hacked because you have a poor password, no 2FA, and syncing is enabled.
2. You signed into a public machine, synced all your data to it, and walked away.
3. Someone, who already has your Duo Mobile account password, and who also knows you use Auto 2FA, decides to steal your exported login data off your computer when you're away from the machine.
4. You are socially engineered to export your own Duo Mobile device information to an unauthorized party.
5. You click Auto 2FA by accident, and as it just so happens, someone who knows your username and your password tried to login at the same time and you just approved their login.

What should be clear is that these kinds of attacks are pretty unlikely to happen to someone who has a basic sense of security. As a result of this reasoning, and in my humble (and biased) opinion, you can rest easy knowing using Auto 2FA won't practically increase your chances of being the victim of any related cyber-attacks, and can safely use this extension.

#### Does this extension hack my Duo account to work?
No. Auto 2FA establishes itself as a new device using the same process as the phone app.

#### Are browser extensions safe to be used as 2-factor authenticators?
Yes. Extensions rely on the security of the browser they reside in. If the browser account is secure, then you shouldn't have anything to worry about. Modern browsers also protect extensions by using a system of [Isolated Worlds](https://developer.chrome.com/docs/extensions/mv3/content_scripts/#isolated_world) to separate them from each other and malicious web page JavaScript.

#### What happens if there are multiple login attempts at the same time?
If 2 or more push requests are active, they are presented to you to filter out the suspicious login attempts by comparing their details.

#### What's the safest way to use Auto 2FA?
1. Use two-click logins. This allows you to review every login attempt without auto-approving.
2. Disable syncing extension/add-on data with your account. Device information will stay local to your machine in case your browser account is compromised.
3. Use strong passwords (duh).

No Logins Found
----------------
If you keep seeing **No logins found!**, it means no push requests were sent to Auto 2FA. You probably sent the push request to another device (like your phone).

Auto 2FA can't approve a request sent to your phone. You need to select **Other options** on the Duo login page, and choose **Android** (default name created at activation) to send the push request to Auto 2FA. It's only then that you can click Auto 2FA and log in.

Login Clicks
------------
You can set the amount of clicks required to log you in with the slider in settings.
If there are multiple active login attempts, Auto 2FA will always require you to review and select the correct one regardless of this setting.

### Zero-clicks
Least safe, most convenient. When you browse to a Duo login page, Auto 2FA will start trying to approve a single login the moment it finds one. No click required.
This is unsafe as it always approves a single login attempt, and it doesn't have to be yours. It will start checking for login attempts before yours fully loads. I'm considering requiring at least the IP addresses of the client and the transaction to match in order to approve this type of login.

### One-click
The default behavior. Clicking on the extension will approve a single login.

### Two-clicks
Most safe, least convenient. This is the Duo Mobile app behavior. Every login attempt will require you to review it before it's approved.

Privacy
-------
Auto 2FA syncs its Duo Mobile device information to your browser's account, meaning it's accessible to all browsers that the user is signed into if their sync preferences support extensions/add-ons (this is usually on by default). This is convenient for most users, as wherever they log in, they still have Auto 2FA with them to log in through their Duo Mobile account. However, this setting allows your Duo Mobile account to be at risk if your browser account is compromised (see [Security](#security)). You can disable syncing in your browser's settings.

No information created by this extension is sent anywhere but to Duo Mobile, and there are no outside servers involved. However, your Duo Mobile device information can be exported in settings. Do not send your data to anyone! This is strictly for manually transferring login data to other private machines.

----------------
Here are repositories that helped make Auto 2FA possible or achieve similar purposes:

- [Ruo](https://github.com/falsidge/ruo) (Python program that approves Duo push requests)
- [Bye DUO](https://github.com/yuchenliu15/bye-duo) (Operates same as above)
- [Duo One Time Password Generator](https://github.com/revalo/duo-bypass) (Python program for creating HOTPs)

Contributing
------------
Feel free to share security concerns or adapt Auto 2FA into a project of your own. If you encounter errors, dislike the UI, or otherwise need to share something, please open an issue.
