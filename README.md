# Auto 2FA
Login through Duo Mobile on [Chromium](https://chromewebstore.google.com/detail/auto-2fa/bnfooenhhgcnhdkdjelgmmkpaemlnoek) browsers and [Firefox](https://addons.mozilla.org/en-US/firefox/addon/auto-2fa/). Safari is not supported (I'm broke).

> [!TIP]
> See the [tutorial](https://github.com/FreshSupaSulley/Auto-2FA/blob/main/TUTORIAL.md) for a dummies guide to Auto 2FA.

Disclaimer
-
The motivation of this project was to avoid picking up my phone everytime I need to check something as trivial as my email inbox. This is an independent project and is not recognized, endorsed, or affiliated with Duo Mobile or Cisco Technology. All product names, logos, and brands are property of their respective owners. If you use this extension, you understand the risks!

How it Works
-
Auto 2FA utilizes the knowledge gained from reverse engineering the official phone app (checkout [this repo](https://github.com/revalo/duo-bypass)). Turns out it's a simple process:

1. Activation
> Auto 2FA as a new Duo Mobile device. Auto 2FA will communicate with Duo's API activation endpoint and register itself as your new iOS / Android tablet. "Device information" is created during this, and it's synced to your browser account if your settings allow it (see [Privacy](#privacy)).
2. Approving transactions
> A transaction, or a push request, represents a login attempt. When clicked, Auto 2FA approves a single transaction without asking you for approval for a seamless login (see [Login Clicks](#login-clicks)). If there are multiple push requests, you'll compare their details to weed out old or malicious ones.

Security
-
> [!CAUTION]
> This extension is less secure than the official phone app. If you value security above convenience, don't use this extension.

To preface, I am not a cyber security expert. I have a basic understanding of 2FA. I do not recommend using this extension if Duo is protecting access to the nuclear football. Auto 2FA should only be used when both the risk and cost of compromising an account are practically zero.

Auto 2FA is a *practical* secure alternative to the Duo Mobile app. It relies entirely on the security of your browser. For typical Duo Mobile users, this extension strikes a great balance between security and convenience.

2-step verification is something you know, and something you have. The premise of this extension is that you *know* your password, and you *have* Auto 2FA. But by using Auto 2FA, you're introducing new risks to your Duo Mobile protected account being compromised. Here's some examples:
1. Your browser account (such as your Google profile if you're on Chrome) is hacked because you have a poor password, no 2FA, and syncing is enabled.
2. You signed into a public machine, synced all your data to it, and walked away. Then someone decides to use your synced data to login to your Duo protected service.
3. Someone, who already has your Duo Mobile account password, and who also knows you use Auto 2FA, decides to steal your exported login data off your computer when you're away from the machine.
4. You are socially engineered to export your own Duo Mobile device information to an unauthorized party.
5. You click Auto 2FA by accident, and as it just so happens, someone who knows your username and your password tried to login at the same time and you just approved their login.

Additionally, your data is **NOT** encrypted in your browser (at least right now, this might be a feature down the line).

But what should be clear is that these kinds of attacks are pretty unlikely to happen to someone who has a basic sense of security. As a result of this reasoning, and in my humble (and biased) opinion, you can rest easy knowing using Auto 2FA won't *practically* increase your chances of being the victim of any related cyber-attacks, and can safely use this extension.

#### Does this extension hack my Duo account to work?
No. Auto 2FA establishes itself as a new device using the same process as the phone app.
> But Cisco doesn't like it!

#### Are browser extensions safe to be used as 2-factor authenticators?
Probably. Many already exist. Extensions rely on the security of the browser they reside in. If the browser account is secure, then you shouldn't have anything to worry about. Modern browsers also protect extensions by using a system of [Isolated Worlds](https://developer.chrome.com/docs/extensions/mv3/content_scripts/#isolated_world) to separate them from each other and malicious code.

#### What happens if there are multiple login attempts at the same time?
If 2 or more push requests are active, they are presented to you to filter out the suspicious login attempts by comparing their details.

#### What's the safest way to use Auto 2FA?
1. Use two-click logins. This allows you to review every login attempt without auto-approving.
2. Disable syncing extension/add-on data with your account. Device information will stay local to your machine in case your browser account is compromised.
3. Use strong passwords (duh).

Privacy
-
Auto 2FA syncs its Duo Mobile device information to your browser's account, meaning it's accessible to all browsers that the user is signed into if their sync preferences support extensions/add-ons (this is usually on by default). This is convenient for most users, as wherever they log in, they still have Auto 2FA with them to log in through their Duo Mobile account. However, this setting allows your Duo Mobile account to be at risk if your browser account is compromised (as explained in [Security](#security)). You can disable syncing in your browser's settings.

No information created by this extension is sent anywhere but to Duo Mobile, and there are no outside servers involved. However, your Duo Mobile device information can be exported in settings. Obviously, don't send this data to anyone! This is strictly for manually transferring login data to other private machines.

----------------
Here are repositories that helped make Auto 2FA possible or achieve similar purposes:

- [Ruo](https://github.com/falsidge/ruo) (Python program that approves Duo push requests)
- [Bye DUO](https://github.com/yuchenliu15/bye-duo) (Operates same as above)
- [Duo One Time Password Generator](https://github.com/revalo/duo-bypass) (Python program for creating HOTPs)

Contributing
-
This extension uses [WXT](wxt.dev), an awesome web extension framework that supports building to multiple platforms. If you'd like to contribute, get familiar with this framework first.

Feel free to open pull requests / issues, share security concerns, or adapt Auto 2FA into a project of your own.
