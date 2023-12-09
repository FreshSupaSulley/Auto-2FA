# Duochrome
Login through Duo Mobile in your browser.

Using the Duo Mobile app can be frustrating; you might've lost your phone, get distracted by social media, or it could be charging. Duo doesn't officially support the ability to approve push requests on your computer and forces usage of their app, but this extension gives you that choice.

Duochrome is currently on [Chrome, Edge](https://chrome.google.com/webstore/detail/duochrome/bnfooenhhgcnhdkdjelgmmkpaemlnoek), and [Firefox](https://addons.mozilla.org/en-US/firefox/addon/duochrome/). Safari was considered, but Apple requires $100/year, even for a free extension (yet another reason to hate Apple). The source is available on this page if you would like to build it yourself, but it won't be on the App Store unless someone with a developer membership wants to publish it. If you'd like to see Duochrome added to another browser, open an issue.

How it Works
------------
1. Activate Duochrome as a new Duo Mobile device. Duochrome will communicate with Duo's API activation endpoint and register itself as your new Android device (it's called Android due to the way the API works). Device information is created during this, and it's synced to your browser account (see [Privacy](#privacy)).
2. Click Duochrome to log in. When clicked, Duochrome approves a single push request (login attempt) without asking you for approval for a seamless login (this behavior can be changed. See [One-Click Login](#one-click-login)). If there are multiple push requests, you'll compare their details to weed out old/malicious push requests.

Duochrome can only approve push requests sent to the device it created during activation, meaning it can't approve a push request sent to the user's phone. This is not my decision, this is Duo's security.

Security
--------
> [!CAUTION]
> Duochrome relies entirely on the security of your browser. If a malicious third party got access to your browser, and you have syncing on both Duochrome and your passwords, they could log in to your Duo Mobile account.

To preface, I am not a cyber security expert. I have a basic understanding of 2FA. I do not recommend using this extension if Duo is protecting access to the nuclear football. Duochrome should only be used when both the risk and cost of compromising an account are practically zero.

Duochrome is a *practical* secure alternative to the Duo Mobile app. For typical Duo Mobile users, this extension strikes a great balance between security and convenience. The primary example is students who constantly need to access their university's sites. The perfect counterexample is business accounts that hold access to important records.<br>

2-step verification is something you know, and something you have. The premise of this extension is that you *know* your password, and you *have* Duochrome as proof it's you. But by using Duochrome, you're introducing a new risk of being compromised. Here are some examples of how Duochrome introduces new risks:
1. Your browser account (such as your Google profile if you're on Chrome) is remotely hacked because you have a poor password, no 2FA, and syncing is enabled.
2. You signed into a public machine, synced all your data to it, and walked away.
3. Someone, who already knows your Duo Mobile account password, and who also knows you use Duochrome, decides to steal your exported login data off your computer when you're away from the machine.
4. You are socially engineered to click Duochrome to log someone in, or you export your own Duo Mobile device information to an unauthorized party.

What should be clear here is that these kinds of attacks are pretty unlikely to happen, especially to someone who has a basic sense of security. As a result of this reasoning, and in my humble (and biased) opinion, the average student will not be the target of any related cyber-attacks and can safely use this extension.

#### Does this extension hack my Duo account to work?
No. Duochrome establishes itself as a new device using the same process as your phone.

#### Are browser extensions safe to be used as 2-factor authenticators?
Only for practical, low-risk purposes. As mentioned before, extensions rely on the security of the browser they reside in. If the browser account is secure, then you shouldn't have anything to worry about. Modern browsers also protect extensions by using a system of [Isolated Worlds](https://developer.chrome.com/docs/extensions/mv3/content_scripts/#isolated_world) to separate them from each other and malicious web page JavaScript. In other words, it's ensured by the browser that extensions cannot be accessed by malicious code.

#### What happens if there are multiple login attempts at the same time?
If 2 or more push requests are active, they are presented to you to filter out the suspicious login attempts by comparing their details. This is true regardless of One-Click Logins.

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

Development
-----------
This is built in raw HTML / JavaScript, with no frameworks or external libraries. Its original purpose was to help Ohio State students (like me) log in, but was designed to work for all Duo Mobile organizations. This project is kept open-sourced mainly to allow for feedback on its security.

This extension was originally named DuOSU until v1.3.8, where the name was changed to avoid a cease-and-desist from the university (they are very infamously uptight about their branding). Duochrome has only been tested with a few organizations, but I'm pretty confident it should work for everyone. Open an issue if it doesn't seem to work with yours.

#### Java Programmers
The authentication flow was first built in Java / Maven for testing before transferring it to JS. The source is included in this repository as a guide on how to incorporate this in a full-scale, more robust application. I used the following Maven repositories for making HTTP requests and parsing the JSON from the Duo API:

```xml
<!-- Jackson JSON Library, for parsing HTTP responses - https://mvnrepository.com/artifact/com.fasterxml.jackson.core/jackson-core -->
<dependency>
  <groupId>com.fasterxml.jackson.core</groupId>
  <artifactId>jackson-databind</artifactId>
  <version>2.13.3</version>
</dependency>
<!-- Apache HTTP Sending / Receiving, for making the calls to Duo - https://mvnrepository.com/artifact/org.apache.httpcomponents/httpclient -->
<dependency>
  <groupId>org.apache.httpcomponents</groupId>
  <artifactId>httpclient</artifactId>
  <version>4.5.13</version>
</dependency>
```

Acknowledgements
----------------
Here are repositories that helped make Duochrome possible or achieve similar purposes:

- [Ruo](https://github.com/falsidge/ruo) (Python program that approves Duo push requests)
- [Easy Duo Authentication](https://github.com/SparkShen02/Easy-Duo-Authentication) (Chrome extension that dynamically creates HOTPs for users)
- [Bye DUO](https://github.com/yuchenliu15/bye-duo) (Operates same as above)
- [Duo One Time Password Generator](https://github.com/revalo/duo-bypass) (Python program for creating HOTPs)

Contributing
------------
Feel free to share security concerns or adapt Duochrome to a project of your own. If you encounter a bug or otherwise need to share something, please open an issue.
