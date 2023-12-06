# Duochrome
Login through Duo Mobile in your browser.

Using the Duo Mobile app can be frustrating; you might've lost your phone, get distracted by social media, or it could be charging. Duo doesn't officially support the ability to approve push requests on your computer and forces usage of their app, but this extension gives you that choice.

Supported Browsers
------------------
**[Chrome, Edge](https://chrome.google.com/webstore/detail/duosu/bnfooenhhgcnhdkdjelgmmkpaemlnoek), and [Firefox](https://addons.mozilla.org/en-US/firefox/addon/duosu/)** are the supported browsers.

Safari was considered, but Apple requires $100/year (yet another reason to hate Apple). The build is available on this page if you would like to build it yourself, but it's currently not on the App Store.

Development
-----------
Like all extensions, this is built in HTML / JS. Its purpose was to help Ohio State students log in, but was designed to work for all Duo Mobile organizations. This project is kept open-sourced to reassure users of its intention and to allow for feedback on its security.

Originally named DuOSU, I had to change the name to avoid a potential cease-and-desist from the university. This extension has only been tested with a few organizations. Although designed to work for all, it's possible that it might not work for others. Open an issue if it doesn't seem to work with yours.

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

How it Works
------------
1. You set up Duochrome to be a new Duo Mobile device. During activation, Duochrome communicates with Duo's API activation endpoint and registers itself as your new Android device. Device information is created during this, and it's synced to your browser account (see [Privacy](#privacy)).
2. Click Duochrome to log in. When clicked, Duochrome approves a single push request without asking the user for approval for a seamless login (this behavior can be changed. See [One-Click Login](#one-click-login)). If there are multiple logins (push requests), the user will compare their details to weed out malicious login attempts.

Duochrome can only approve push requests sent to the device it created during activation, meaning it can't approve a push request sent to the user's phone. This is not a decision, this is Duo's security.

Security
--------
> [!CAUTION]
> Duochrome relies entirely on the security of your browser. If a malicious third party is logged in to your browser account, they have access to Duochrome and your passwords (assuming your settings sync them), therefore, they could log in to your Duo Mobile account.

To preface, I am not a cyber security expert. I have a basic understanding of 2FA. I do not recommend using this extension if Duo is protecting access to the nuclear football. Duochrome should only be used when both the risk and cost of compromising an account are practically zero. It's my argument 

Duochrome is a *practical* secure alternative to the Duo Mobile app. For typical Duo Mobile users, this extension strikes a great balance between security and convenience. The primary example is students who constantly need to access their university's sites. The perfect counterexample is business accounts that hold access to important records.<br>

2-step verification is something you know, and something you have. The premise of this extension is that you *know* your password, and you *have* Duochrome as proof it's you. By using Duochrome, you're introducing a greater risk of being compromised if your browser account (like your Google profile if you're on Chrome) is hacked or if you signed into a public machine and didn't log out. Although incredibly unlikely, users could be socially engineered to click Duochrome during a malicious login attempt or export their Duo Mobile device information to an unauthorized party.

#### Does this extension hack my Duo account to work?
No. Duochrome establishes itself as a new device using the same process as your phone.

#### Are browser extensions safe to be used as 2-factor authenticators?
Only for practical, low-risk purposes. As mentioned before, extensions rely on the security of the browser they reside in. If the browser account is secure, then you shouldn't have anything to worry about. Modern browsers protect their extensions by using a system of [Isolated Worlds](https://developer.chrome.com/docs/extensions/mv3/content_scripts/#isolated_world) to separate them from each other and malicious web page JavaScript. In other words, it's ensured by the browser that extensions cannot be accessed by malicious code.

#### What happens if there's multiple login attempts at the same time?
If only 1 push request is active, that login attempt is approved and its details are displayed (time, location, etc.). You can review the push request before it's approved by disabling one-click logins in settings for extra security. If 2 or more push requests are active, they are presented to you to filter out the suspicious login attempts by comparing their details.

#### What's the safest way to use Duochrome?
1. Disable one-click logins. This allows you to review every login attempt without auto-approving one of them.
2. Disable syncing extension/add-on data with your account. Device information will stay local to your machine in case your browser account is compromised.
3. Protect your browser. Use strong passwords, and never export your device information to anyone.

No Logins Found
----------------
If you keep seeing **No logins found!**, it means no push requests were sent to the device it created during activation. This means it was likely sent to another device (like your phone). When logging in through Duo Mobile, Duo will automatically pick *just one* of your registered devices to send a push request to. This extension cannot approve a push request that was sent to any other device.

You need to select **Other options** on the Duo login page, and choose **Android** (default name created at activation) to properly send the push request to Duochrome. It's only then that you can click Duochrome and log in.

One-Click Login
---------------
When enabled (on by default), clicking on the extension will approve a single push request. If disabled, Duochrome will ask for your permission to approve one. Keep in mind that if there's multiple login attempts, Duochrome will always prompt you with their details to select the correct one regardless of this setting.

Privacy
-------
Duochrome syncs its Duo Mobile device information to your browser's account, meaning it's accessible to all browsers that the user is signed into if their sync preferences support extensions / add-ons (this is usually on by default). This is convenient for most users, as wherever they log in, they still have Duochrome with them to log in through their Duo Mobile account. However, this setting allows your Duo Mobile account to be at risk if your browser account is compromised (see [Security](#security)). You can disable syncing in your browser's settings.

No information created by this extension is sent anywhere but to Duo Mobile, and there are no outside servers involved. However, your Duo Mobile device information can be exported in settings. Obviously, do not send your data to anyone! This is strictly for manually transferring login data to other private machines.

Acknowledgements
----------------
Here are repositories that helped make Duochrome possible or achieve similar purposes:

- [Ruo](https://github.com/falsidge/ruo) (Python program that approves Duo push requests)
- [Easy Duo Authentication](https://github.com/SparkShen02/Easy-Duo-Authentication) (Chrome extension that dynamically creates HOTPs for users)
- [Bye DUO](https://github.com/yuchenliu15/bye-duo) (Operates same as above)
- [Duo One Time Password Generator](https://github.com/revalo/duo-bypass) (Python program for creating HOTPs)

Contributing
------------
Feel free to pull, share security concerns, and adapt Duochrome into a project of your own.
