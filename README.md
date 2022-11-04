# DuOSU v1.3.3
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
DuOSU is a secure digital two-factor authenticator that serves an alternative to using the mobile app. This extension doesn't hack or bypass Duo Mobile's security; it creates a digital device in your browser that's used to approve push requests.

#### Is this extension safe to use?
Yes. This extension uses the browser's storage API to protect the user's login data. Google Chrome and Firefox use a system of "Isolated Worlds" to separate extensions from each other and from web page JavaScript. It's ensured by the browser that extensions cannot be accessed in any way by malicious JavaScript code (you can read more [here](https://developer.chrome.com/docs/extensions/mv3/content_scripts/#isolated_world)).

#### Can my Duo account be hacked?
DuOSU cannot approve any push requests unless you directly tell it to. If a hacker was attempting to hijack your account, they would need access to the extension to approve the login. This is only possible if they have physical possession of your computer, or they've hacked into your Google account and are syncing the DuOSU data to their computer. If your Google account has a strong password and your computer can't be stolen, your Duo account is safe.

The largest threat to your Duo account is you. Because DuOSU supports importing / exporting your login information, it's possible to be socially engineered to send this data to an unauthorized party. **DO NOT SEND YOUR LOGIN INFORMATION TO ANYONE**. This information allows DuOSU to authenticate with Duo. Only export your login data to use on another machine you own. DO NOT use this login information on a public machine that can be accessed by others.

#### What happens when I click DuOSU?
If only 1 push request is active, that login attempt is approved and its details are displayed to the user (a button will be added to make this optional).
If 2 or more push requests are active, the login attempts are not approved and are listed to the user where they can weed out the unauthorized login attempts by comparing IP addresses, locations, integrations, etc. This ensures the user doesn't mistakingly approve an unauthorized push request.

### What happened to Auto-Logins?
Auto-Logins was a feature supported in v1.3.2 and earlier. Without increasing the permissions required by DuOSU to monitor the Duo authentication flow, Auto-Logins had to be removed because they approved all push requests rather than only the authorized one. It's unlikely this feature will return, as the permissions required to use this feature safely would concern users.

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
