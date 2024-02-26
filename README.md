# Duochrome
Login through Duo Mobile in your browser.

Using the Duo Mobile app can be frustrating; you might've lost your phone or get distracted by social media. Duo doesn't officially support approving push requests on your computer, but this extension gives you that option.

Duochrome is currently on [Chrome, Edge](https://chrome.google.com/webstore/detail/duochrome/bnfooenhhgcnhdkdjelgmmkpaemlnoek), and [Firefox](https://addons.mozilla.org/en-US/firefox/addon/duochrome/). Safari was considered, but there's no way I'm paying $100/yr to be an Apple Developer. Outdated Safari source is available on this page if you would like to build it yourself, but it won't be on the App Store unless someone with a developer membership wants to publish it. If you'd like to see Duochrome added to another browser, open an issue.

How it Works
------------
1. Activate Duochrome as a new Duo Mobile device. Duochrome will communicate with Duo's API activation endpoint and register itself as your new Android device (it's called Android due to the way the API works). Device information is created during this, and it's synced to your browser account (see [Privacy](#privacy)).
2. Click Duochrome to log in. When clicked, Duochrome approves a single push request (login attempt) without asking you for approval for a seamless login (this behavior can be changed. See [One-Click Login](#one-click-login)). If there are multiple push requests, you'll compare their details to weed out old/malicious push requests.

Duochrome can only approve push requests sent to the device it created during activation, meaning it can't approve a push request sent to the user's phone. This is not my decision, this is Duo's security. With this in mind, please don't make Duochrome your only device. It should be used as another option, not as the only option.

Security
--------
> [!CAUTION]
> Duochrome relies entirely on the security of your browser. If a malicious third party got access to your browser, and you have syncing on both Duochrome and your passwords, they could log in to your Duo Mobile account.

To preface, I am not a cyber security expert. I have a basic understanding of 2FA. I do not recommend using this extension if Duo is protecting access to the nuclear football. Duochrome should only be used when both the risk and cost of compromising an account are practically zero.

Duochrome is a *practical* secure alternative to the Duo Mobile app. For typical Duo Mobile users, this extension strikes a great balance between security and convenience. The primary example is an average student who wants a more convenient way to access their Duo protected university's sites.

2-step verification is something you know, and something you have. The premise of this extension is that you *know* your password, and you *have* Duochrome. But by using Duochrome, you're introducing a new risk of being compromised. Here are some examples of how Duochrome introduces new risks:
1. Your browser account (such as your Google profile if you're on Chrome) is remotely hacked because you have a poor password, no 2FA, and syncing is enabled.
2. You signed into a public machine, synced all your data to it, and walked away.
3. Someone, who already has your Duo Mobile account password, and who also knows you use Duochrome, decides to steal your exported login data off your computer when you're away from the machine.
4. You are socially engineered to click Duochrome to log someone in, or you export your own Duo Mobile device information to an unauthorized party.
5. You click Duochrome by accident, and as it just so happens, someone who knows your username and your password tried to login at the same time and you just approved their login.

What should be clear is that these kinds of attacks are pretty unlikely to happen to someone who has a basic sense of security. As a result of this reasoning, and in my humble (and biased) opinion, you can rest easy knowing using Duochrome won't increase your chances of being the victim of any related cyber-attacks due to basic security measures and can safely use this extension.

#### Does this extension hack my Duo account to work?
No. Duochrome establishes itself as a new device using Duo's API.

#### Are browser extensions safe to be used as 2-factor authenticators?
Yes. Extensions rely on the security of the browser they reside in. If the browser account is secure, then you shouldn't have anything to worry about. Modern browsers also protect extensions by using a system of [Isolated Worlds](https://developer.chrome.com/docs/extensions/mv3/content_scripts/#isolated_world) to separate them from each other and malicious web page JavaScript.

#### What happens if there are multiple login attempts at the same time?
If 2 or more push requests are active, they are presented to you to filter out the suspicious login attempts by comparing their details. This is true regardless if One-Click Logins is enabled or not.

#### What's the safest way to use Duochrome?
1. Disable one-click logins. This allows you to review every login attempt without auto-approving.
2. Disable syncing extension/add-on data with your account. Device information will stay local to your machine in case your browser account is compromised.
3. Use strong passwords. Protect your browser!

No Logins Found
----------------
If you keep seeing **No logins found!**, it means no push requests were sent to Duochrome. You probably sent the push request to another device (like your phone).

Duochrome can't approve a request sent to your phone. You need to select **Other options** on the Duo login page, and choose **Android** (default name created at activation) to send the push request to Duochrome. It's only then that you can click Duochrome and log in.

One-Click Login
---------------
When enabled (on by default), clicking on the extension will approve a single push request. If disabled, Duochrome will ask for your permission to approve one. Keep in mind that if there are multiple login attempts, Duochrome will always prompt you with their details to select the correct one regardless of this setting.

Privacy
-------
Duochrome syncs its Duo Mobile device information to your browser's account, meaning it's accessible to all browsers that the user is signed into if their sync preferences support extensions/add-ons (this is usually on by default). This is convenient for most users, as wherever they log in, they still have Duochrome with them to log in through their Duo Mobile account. However, this setting allows your Duo Mobile account to be at risk if your browser account is compromised (see [Security](#security)). You can disable syncing in your browser's settings.

No information created by this extension is sent anywhere but to Duo Mobile, and there are no outside servers involved. However, your Duo Mobile device information can be exported in settings. Do not send your data to anyone! This is strictly for manually transferring login data to other private machines.

----------------
Here are repositories that helped make Duochrome possible or achieve similar purposes:

- [Ruo](https://github.com/falsidge/ruo) (Python program that approves Duo push requests)
- [Bye DUO](https://github.com/yuchenliu15/bye-duo) (Operates same as above)
- [Duo One Time Password Generator](https://github.com/revalo/duo-bypass) (Python program for creating HOTPs)

Contributing
------------
Feel free to share security concerns or adapt Duochrome to a project of your own. If you encounter a bug or otherwise need to share something, please open an issue.
