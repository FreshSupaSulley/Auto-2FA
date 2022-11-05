# DuOSU v1.3.5
Login through Duo Mobile in your browser.

Using the Duo Mobile app is frustrating and time consuming. Duo doesn't offer the ability to approve push requests on your computer either and forces usage of their app.
This extension offers that ease of access Duo Mobile users want. By simply clicking on the extension, you are logged into your account without hesistation.

To be clear, **DuOSU isn't malicious.** It behaves almost identically to the Duo Mobile app. DuOSU can't login when you don't want it to, and none of your login data is sent anywhere but to Duo (see [Privacy](#privacy)).

Supported Browsers
------------------

**[Chrome, Edge](https://chrome.google.com/webstore/detail/duosu/bnfooenhhgcnhdkdjelgmmkpaemlnoek), and [Firefox](https://addons.mozilla.org/en-US/firefox/addon/duosu/)** are the browsers DuOSU is available on. Check out their respective webstores to download.<br>
**Safari** was considered, but Apple requires $100 to register as a developer (that's not happening). If you are a registered developer with Apple and would like to publish this to Safari, contact me.

DuOSU was built in HTML / JS. Although originally designed for Ohio State University students, it works for all Duo Mobile users.

## Java Developers
This authentication flow was first built in Java before transferring it to JS. This Java program is included in this repository as a guide on how to incorporate this in a full-scale application. To use, include the following Maven repositories in your pom.xml (both are optional, you may adapt your own implementations):

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

1. DuOSU activates itself as a new Duo Mobile device. When the user clicks activate, DuOSU communicates with Duo's API activation endpoint and registers itself as a new Android device. The new device information is synced to the user's account (see [Privacy](#privacy)).
2. Login. When invoked, DuOSU approves all active push requests returned by the transactions endpoint. Keep in mind that DuOSU can only approve push requests sent to itself (it can't approve a push request sent to the user's phone, for example).

Security
--------
DuOSU is a digital two-factor authenticator that serves an alternative to the mobile app. This extension doesn't hack or bypass Duo Mobile's security; it creates a digital device in your browser that's used to approve push requests, just like your phone.

#### Are extensions safe to be used as 2-factor authenticators?
Yes. Google Chrome and Firefox use a system of "Isolated Worlds" to separate extensions from each other and from web page JavaScript. It's ensured by the browser that extensions cannot be accessed in any way by malicious code (you can read more [here](https://developer.chrome.com/docs/extensions/mv3/content_scripts/#isolated_world)). The user's login data (the data used to authenticate DuOSU with Duo, created during activation) is also protected by the browser, ensuring the data is kept private.

#### Can my Duo account be hacked?
No. DuOSU is protected by the security of your browser and cannot approve any push requests unless you directly tell it to. If a hacker was attempting to hijack your account, they would need access to the extension to approve the login. This is only possible if they have physical possession of your computer, or they've hacked into your Google account and are syncing the DuOSU data to their computer. As long as your Google account has a strong password and your computer isn't stolen, your Duo account is safe.

The most serious threat to your Duo account is you. Because DuOSU supports importing / exporting your login information, it's possible that this information could fall into the hands of an unauthorized party. This won't happen as long as you keep your login data private, so **DO NOT SEND YOUR LOGIN INFORMATION TO ANYONE**. You should only transfer your login data to a machine you own. DO NOT transfer your login information to a public machine that can be accessed by others.

#### What exactly happens when I click DuOSU?
If only 1 push request is active, that login attempt is approved and its details are displayed to the user. You can review the push request before it's pushed by disabling one-click logins.
If 2 or more push requests are active, they are listed to the user to filter out the suspicious login attempts by comparing IP addresses, locations, integrations, etc.

#### What happened to Auto-Logins?
Auto-Login was a feature introduced in v1.3.1. By utilizing a content script, DuOSU was able to detect when the user navigates to the OSU Duo login URL and would automatically approve all push requests. Due to the limitations of this extension's permissions, it's not possible to approve the user's login without approving all push requests, which may include unauthorized login attempts; that is, without more extension permissions that could allow DuOSU to monitor all web traffic on the login website. Obviously, an extension asking for such a permission can leave users skeptical. Combined with the fact that the login URL doesn't work for every organization, it simply isn't a smart decision to ask for more permissions for a feature that can be utilized by only a portion of the users. It's unlikely this feature will return, unless a safe alternative is discovered (pull requests are open!).

One-Click Login
---------------
Approves a login upon clicking the extension. If more than one login attempt is active, no logins are approved to allow the user to filter suspicious logins. This is enabled by default in settings.

Privacy
-------
DuOSU stores device information via the browser's storage API. The information is accessible to all browsers that the user is signed into if their sync preferences support extensions / add-ons.
No information created by this extension is sent anywhere but to Duo Mobile to log you in, and there are no servers or outside code involved. Users can rest assured that their login data is secure.
Keep in mind, however, that it's possible to export login data to other DuOSU extensions. It's the user's responsibility to keep this data secure and to never send it to an unauthorized party.

Acknowledgements
----------------
Here are repositories that helped make DuOSU possible or achieve similar purposes:

- [Ruo](https://github.com/falsidge/ruo) (Python Library for activating / passing Duo push requests)
- [Easy Duo Authentication](https://github.com/SparkShen02/Easy-Duo-Authentication) (Chrome extension that dynamically creates HOTPs for users)
- [Bye DUO](https://github.com/yuchenliu15/bye-duo) (Operates same as above)
- [Duo One Time Password Generator](https://github.com/revalo/duo-bypass) (Python Library for creating HOTPs)

Contributing
------------
Although development for the most part has concluded, feel free to submit pull requests for ideas on how to improve DuOSU.
You are also encouraged to adapt this repository into a project of your own.
