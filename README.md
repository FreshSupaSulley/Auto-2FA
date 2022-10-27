# DuOSU
Login through Duo Mobile with ease.

Using the Duo Mobile app is frustrating and time consuming. Duo doesn't offer the ability to approve push requests on your computer either and forces usage of their app.

This extension offers that ease of access Duo Mobile users want. By clicking on the extension (or enabling [auto-logins](#automatic-logins), you are logged into your account without hesistation.

To be clear, **DuOSU isn't malicious.** It behaves almost identically to the Duo Mobile app.

DuOSU was built in HTML / JS. It's designed for Ohio State University students, but it works for all Duo Mobile users.

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

1. DuOSU activates itself as a new Duo Mobile device. When the user clicks activate, DuOSU communicates with Duo's API activation endpoint and registers itself as a new Android device. The new device information is synced to the user's Google account (see [Privacy](#privacy)).
2. Login. When invoked, DuOSU approves all active push requests returned by the transactions endpoint. Keep in mind that DuOSU can only approve push requests sent to itself (it can't approve a push request sent to the user's phone, for example).

Automatic Logins
----------------
DuOSU supports automatic logins when it detects the browser on a Duo Mobile login screen. You can enable this in settings.

Privacy
-------
DuOSU stores device information via the browser's storage API. The information can be accessible to all Chrome browsers the user is signed into if their sync preferences support extensions / add-ons.
No information created by this extension is sent anywhere but to Duo's secure API to identify yourself and log you in. Users can rest assured that their login data is kept private to their browsers.

Acknowledgements
----------------
Here are repositories that helped make DuOSU possible or achieve similar purposes:

- [Ruo](https://github.com/falsidge/ruo) (Python Library for activating / passing Duo push requests)
- [Easy Duo Authentication](https://github.com/SparkShen02/Easy-Duo-Authentication) (Chrome extension that dynamically creates HOTPs for users)
- [Bye DUO](https://github.com/yuchenliu15/bye-duo) (Operates same as above)
- [Duo One Time Password Generator](https://github.com/revalo/duo-bypass) (Python Library for creating HOTPs)

Contributing
------------
Although development has (for the most part) concluded, feel free to submit pull requests for ideas on how to improve DuOSU.
You are also encouraged to adapt this repository into a project of your own. Credit to the original would be appreciated but not required.
