# DuOSU
Login through Duo Mobile in your browser.

Using the Duo Mobile app can be frustrating; you may end up looking for your phone you buried somewhere or get distracted by social media. Duo doesn't even offer the ability to approve push requests on your computer and forces usage of their app. But by simply clicking on this extension, you are logged into your account without hesistation.

Supported Browsers
------------------
**[Chrome, Edge](https://chrome.google.com/webstore/detail/duosu/bnfooenhhgcnhdkdjelgmmkpaemlnoek), and [Firefox](https://addons.mozilla.org/en-US/firefox/addon/duosu/)** (source code in its own branch) are the browsers DuOSU is available on. Check out their respective webstores to download.<br>
**Safari** was considered, but Apple requires $100 to register as a developer (they can go to hell). If you are a registered developer with Apple and would like to publish this to Safari, let me know.

Development
-----------
DuOSU was built in HTML / JS. Although originally designed for Ohio State University students, it's designed to work for all Duo Mobile users. This project is kept open-sourced to reassure users of its intention and to allow for feedback on its security.

#### Java Programmers
The authentication flow was first built in Java / Maven for testing before transferring it to JS. This Java program is included in this repository (located in the java branch) as a guide on how to incorporate this in a full-scale, more robust application. To demo, include the following Maven repositories in your pom.xml (both are optional, you may adapt your own implementations):

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
1. DuOSU activates itself as a new Duo Mobile device for the user's account. When the user clicks activate, DuOSU communicates with Duo's API activation endpoint and registers itself as that user's new Android device. This *device information* is usually synced to the user's browser account (see [Privacy](#privacy)).
2. Approve logins. When clicked, DuOSU by default approves a single push request without asking the user for approval for a seamless login (see [One-Click Login](#one-click-login)). If multiple push requests are active, the user is able to compare their details to weed out malicious login attempts. Keep in mind that DuOSU can only approve push requests sent to the device it created during activation, meaning it can't approve a push request sent to the user's iPhone.

Security
--------
**I am NOT a cyber security expert**. I have a decent understanding of 2-factor authentication and basic security practices. Therefore, I do not recommend using this extension if Duo Mobile guards incredibly sensitive data. DuOSU should only be used when both the risk and cost of compromising an account is incredibly low.<br>

DuOSU is a *practical* secure alternative to the Duo Mobile app. For typical Duo Mobile users, this extension strikes a great balance between security and convenience. The primary example is students who constantly need to access their university's sites. The perfect counterexample is business accounts that hold access to important records.<br>

Two-step verification is something you know, and something you have. The premise of this extension is that you *know* your password, and you *have* DuOSU as proof it's you. By using DuOSU, you're introducing a greater risk of being compromised if your browser account (such as your Google profile) is hacked or if you failed to log out of a public machine that DuOSU for your account is present on. Users could also be socially engineered to click DuOSU during a malicious login attempt or export their Duo Mobile device information to an unauthorized party.

#### Does this extension hack my Duo account to work?
**No**. DuOSU establishes itself as a new device, just as you would with your iPhone.

#### Are browser extensions safe to be used as 2-factor authenticators?
**Probably**, at least for practical purposes. The good news is that extensions are protected by modern web browsers, as they use a system of "Isolated Worlds" to separate them from each other and from potentially malicious web page JavaScript. In other words, it's ensured by the browser that extensions cannot be accessed by malicious code (you can read more [here](https://developer.chrome.com/docs/extensions/mv3/content_scripts/#isolated_world)). The bad news, however, is that browsers can be hacked due to a user's poor security practices.

#### What exactly happens when I click DuOSU? What happens if there's multiple login attempts?
If only 1 push request is active, that login attempt is approved and its details are displayed (time, location, etc.). You can review the push request before it's approved by disabling one-click logins in settings for extra security. If 2 or more push requests are active, they are presented to you to filter out the suspicious login attempts by comparing their details.

#### What's the safest way to use DuOSU?
1. Disable one-click logins. This allows you to review every login attempt before approving it.
2. Disable syncing extension/add-on data with your account. DuOSU device information will stay local to your machine in case your browser account is compromised.
3. Use strong passwords, and never export your device information to anyone.

It's Not Working
----------------
If DuOSU keeps saying "No logins found!", it means no push requests were sent to the device it created during activation. This means it was likely sent to another device (like your phone). When logging in through Duo Mobile, Duo will automatically pick **just one** of your registered devices to send a push request to. DuOSU cannot approve a push request that was sent to any other device.<br>
You need to select "Other options" on the Duo login page, and choose "Android" (that is the default name of DuOSU) to properly send the push request to DuOSU. It's only then that you can click DuOSU and login.

One-Click Login
---------------
When enabled (on by default), clicking on the extension will approve a single push request. If disabled, DuOSU will ask for your permission to approve one. Keep in mind that if there are multiple login attempts happening simultaneously, DuOSU will always prompt you with their details to select the correct one regardless of this setting.

Privacy
-------
DuOSU syncs its Duo Mobile device information to your browser's account, meaning it's accessible to all browsers that the user is signed into if their sync preferences support extensions / add-ons. Although this is convenient, it allows your Duo Mobile account to be at risk if your browser account is compromised (see [Security](#security)).<br><br>

No information created by this extension is sent anywhere but to Duo Mobile, and there are no servers or outside code involved. However, your Duo Mobile device information can be exported in settings. Do **NOT** send your data to anyone! This is strictly for using on other private machines.

Acknowledgements
----------------
Here are repositories that helped make DuOSU possible or achieve similar purposes:

- [Ruo](https://github.com/falsidge/ruo) (Python program that approves Duo push requests)
- [Easy Duo Authentication](https://github.com/SparkShen02/Easy-Duo-Authentication) (Chrome extension that dynamically creates HOTPs for users)
- [Bye DUO](https://github.com/yuchenliu15/bye-duo) (Operates same as above)
- [Duo One Time Password Generator](https://github.com/revalo/duo-bypass) (Python program for creating HOTPs)

Contributing
------------
Feel free to pull, share security concerns, and adapt DuOSU into a project of your own.
