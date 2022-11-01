# DuOSU v1.3.2
Login through Duo Mobile in your browser.

Using the Duo Mobile app is frustrating and time consuming. Duo doesn't offer the ability to approve push requests on your computer either and forces usage of their app.
This extension offers that ease of access Duo Mobile users want. By clicking on the extension (or enabling [auto-logins](#automatic-logins), you are logged into your account without hesistation.

To be clear, **DuOSU isn't malicious.** It behaves almost identically to the Duo Mobile app. DuOSU can't login when you don't want it to, and none of your login data is sent anywhere but to Duo (see [Privacy](#privacy)).

Supported Browsers
------------------

**[Chrome, Edge](https://chrome.google.com/webstore/detail/duosu/bnfooenhhgcnhdkdjelgmmkpaemlnoek), and [Firefox](https://addons.mozilla.org/en-US/firefox/addon/duosu/)** are the browsers DuOSU is available on. Check out their respective webstores to download.<br>
**Safari** was considered, but Apple requires $100 to register as a developer (that's not happening). If you are a registered developer with Apple and would like to publish this to Safari, contact me.

DuOSU was built in HTML / JS. It's designed for Ohio State University students, but it works for all Duo Mobile users.<br>
An example Java program is packaged in this repository as a guide on how to incorporate this in a full-scale application. To use, include the following Maven repositories in your pom.xml (these are both optional, you may adapt your own implementations):

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
While DuOSU is a genuine alternative to Duo's in-app two-factor authentication, it introduces unique security vulnerabilities that should be addressed:

1. The hacker could time their login in sync with the user. Because DuOSU approves all push requests when clicked, if an attacker were to steal their victim's account information and try to log in at the same time the user clicks the extension (~30-second window before their push request expires), they would be able to gain access.
2. The user could be socially engineered. DuOSU provides the ability for users to export their login data to use it on another extension. The user could be socially engineered to send a hacker their login data.
3. The user's Google account could be compromised. DuOSU uses the browser's storage sync API to keep information synced to their account. This means that all browsers the user is signed into share the same DuOSU login data (this can be changed according to the account's sync policy). If the hacker has access to the user's Google account and their login credentials, they could gain access as well.

These scenarios require the hacker to obtain their victim's login credentials _and_ have knowledge that their victim uses the extension. A foreign hacker would be no way of knowing this without some sort of inside information.

This extension uses the browser's storage API to protect the user's login data. Google Chrome and Firefox use a system of "Isolated Worlds" to separate extensions from each other and from web page JavaScript. It's ensured by the browser that extensions cannot be accessed in any way by malicious JavaScript code (you can read more [here](https://developer.chrome.com/docs/extensions/mv3/content_scripts/#isolated_world)).

Automatic Logins
----------------
DuOSU supports automatic logins when it detects the browser on a Duo Mobile login site. You can enable this in settings.

**<ins>THIS DOES NOT WORK FOR ALL ORGANIZATIONS.</ins>**<br>
Ohio State uses the URL scheme *https://\*.duosecurity.com/frame/v4/auth/prompt\** for their unique Duo login page. Only when you visit a website with this URL scheme does DuOSU know when to log you in.<br>
Some colleges, like the University of Cincinnati, have unique login websites that do not match DuOSU's Auto-Login URL. As of now, it's not possible to dynamically change this for each user due to extension permission reasons.<br>

If your college has a login website that doesn't match *https://\*.duosecurity.com/frame/v4/auth/prompt\**, DuOSU will continue to work when you tap on it, but you're out of luck with Auto-Logins.<br>

Privacy
-------
DuOSU stores device information via the browser's storage API. The information is accessible to all browsers that the user is signed into if their sync preferences support extensions / add-ons.
No information created by this extension is sent anywhere but to Duo Mobile to log you in, and there are no servers or outside code involved. Users can rest assured that their login data is secure.

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
You are also encouraged to adapt this repository into a project of your own. Credit to the original would be appreciated but not required.
