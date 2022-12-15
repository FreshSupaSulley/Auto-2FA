# DuOSU v1.3.5
Login through Duo Mobile in your browser.

Using the Duo Mobile app can be frustrating; you may end up looking for your phone you buried somewhere or get distracted by social media. To make matters worse, Duo doesn't offer the ability to approve push requests on your computer and forces usage of their app. But by simply clicking on the extension, you are logged into your account without hesistation.

Supported Browsers
------------------

**[Chrome, Edge](https://chrome.google.com/webstore/detail/duosu/bnfooenhhgcnhdkdjelgmmkpaemlnoek), and [Firefox](https://addons.mozilla.org/en-US/firefox/addon/duosu/)** are the browsers DuOSU is available on. Check out their respective webstores to download.<br>
**Safari** was considered, but Apple requires $100 to register as a developer (that's not happening). If you are a registered developer with Apple and would like to publish this to Safari, open an issue or a pull request.

Development
-----------

DuOSU was built in HTML / JS. Although originally designed for Ohio State University students, it works for all Duo Mobile users. This project is kept open-sourced to reassure users of its integrity and to allow for feedback on the security of this extension.

#### Java Programmers
The authentication flow was first built in Java for testing before transferring it to JS. This Java program is included in this repository as a guide on how to incorporate this in a full-scale, more robust application. To use, include the following Maven repositories in your pom.xml (both are optional, you may adapt your own implementations):

```xml
<!-- Jackson JSON Library - https://mvnrepository.com/artifact/com.fasterxml.jackson.core/jackson-core -->
<dependency>
  <groupId>com.fasterxml.jackson.core</groupId>
  <artifactId>jackson-databind</artifactId>
  <version>2.13.3</version>
</dependency>
<!-- Apache HTTP Sending / Receiving - https://mvnrepository.com/artifact/org.apache.httpcomponents/httpclient -->
<dependency>
  <groupId>org.apache.httpcomponents</groupId>
  <artifactId>httpclient</artifactId>
  <version>4.5.13</version>
</dependency>
```

How it Works
------------
DuOSU is a simple 2-step program:

1. DuOSU activates itself as a new Duo Mobile device for the user's account. When the user clicks activate, DuOSU communicates with Duo's API activation endpoint and registers itself as a new Android device. This information is synced to the user's browser account (see [Privacy](#privacy)).
2. Login. When opened, DuOSU approves a push request returned by the transactions API endpoint. If multiple push requests are active, the user is able to compare their details to weed out malicious login attempts. Keep in mind that DuOSU can only approve push requests sent to itself (it can't approve a push request sent to the user's phone).

Security
--------
DuOSU is a secure alternative to the Duo Mobile app, yet ultimately relies on the security practices of the user. If the user's browser account is compromised due to a poor password or failure to log out of a public machine, the extension may also be compromised. Users may also be socially engineered to send their exported Duo Mobile device information to an unauthorized party. It's vital that users understand the importance of maintaining good security practices.

#### Are extensions safe to be used as 2-factor authenticators?
Yes. Modern web browsers use a system of "Isolated Worlds" to separate extensions from each other and from potentially malicious web page JavaScript. In other words, it's ensured by the browser that extensions cannot be accessed by malicious code (you can read more [here](https://developer.chrome.com/docs/extensions/mv3/content_scripts/#isolated_world)). The user's Duo Mobile device data (used to approve push requests) is also kept secure by this practice.

#### Does using this extension put me at risk for my Duo account to be hacked?
If you follow good security practices, no. DuOSU resides in your browser account and cannot approve push requests without direct action, meaning a hacker would need either physical possession of a computer with your browser account logged in, or its password. Make sure to only use DuOSU on a private computer that only you have access to.

Because DuOSU allows importing / exporting login information, it's possible that users could mistakenly send this information to an unauthorized party. This won't happen as long as you keep your login data private, so **DO NOT SEND YOUR LOGIN INFORMATION TO ANYONE**. You should only transfer your login data to another machine you own. Do **NOT** use DuOSU on a public machine where anyone can access your account.

#### What exactly happens when I click DuOSU? What happens if there's multiple login attempts?
If only 1 push request is active, that login attempt is approved and its details are displayed. You can review the push request before it's approved by disabling one-click logins in settings for extra security. If 2 or more push requests are active, they are presented to you to filter out the suspicious login attempts by comparing IP addresses, locations, integrations, etc.

#### What's the safest way to use DuOSU?
1. Disable one-click logins. This allows you to review every login attempt before approving it.
2. Disable syncing extension / add-ons with your account. DuOSU data will stay local to your machine in case your browser account is compromised.
3. Protect your browser account. Use strong passwords and always log out of public computers.
4. Never export and send your Duo Mobile device data to anyone. This is what allows DuOSU to log you in.

One-Click Login
---------------
If there's only one login attempt, it's immediately approved. Otherwise, DuOSU will ask for your permission to approve it. Keep in mind that if there's multiple login attempts, DuOSU will always ask for your permission regardless of one-click logins.

Privacy
-------
DuOSU syncs its Duo Mobile device information to your browser's account, meaning it's accessible to all browsers that the user is signed into if their sync preferences support extensions / add-ons. Although this is convenient, it allows your Duo Mobile account to be at risk if your browser account is compromised (see [Security](#security)).

No information created by this extension is sent anywhere but to Duo Mobile, and there are no servers or outside code involved. Users can rest assured that their login data is secure. However, your Duo Mobile device information can be exported in settings. Do **NOT** send your data to anyone!

Acknowledgements
----------------
Here are repositories that helped make DuOSU possible or achieve similar purposes:

- [Ruo](https://github.com/falsidge/ruo) (Python program that approves Duo push requests)
- [Easy Duo Authentication](https://github.com/SparkShen02/Easy-Duo-Authentication) (Chrome extension that dynamically creates HOTPs for users)
- [Bye DUO](https://github.com/yuchenliu15/bye-duo) (Operates same as above)
- [Duo One Time Password Generator](https://github.com/revalo/duo-bypass) (Python program for creating HOTPs)

Contributing
------------
Although development for the most part has concluded, feel free to submit pull requests for ideas on how to improve DuOSU. You are also encouraged to adapt this repository into a project of your own. For security concerns, open an issue.
