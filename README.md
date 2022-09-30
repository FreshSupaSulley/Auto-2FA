# DuOSU
Login through Duo Mobile in your browser.

Using the Duo Mobile app to login is frustrating and time consuming. To make matters worse, Duo doesn't offer the ability to approve push requests on your computer.

This chrome extension offers that ease of access students want. By simply clicking on the extension, you are immediately logged into your account without hesistation. Unlike other extensions offered on the [Web Store](https://chrome.google.com/webstore), DuOSU doesn't make you copy and paste a password to login.

DuOSU was built in HTML / JavaScript. It's built for Ohio State University students, but it works for all organizations too. An example Java program is packaged in this repository as well to guide programmers on how to incorporate this in a full-scale application. To use, include the following Maven repositories in your pom.xml:

```xml
<!-- https://mvnrepository.com/artifact/com.fasterxml.jackson.core/jackson-core -->
<dependency>
  <groupId>com.fasterxml.jackson.core</groupId>
  <artifactId>jackson-databind</artifactId>
  <version>2.13.3</version>
</dependency>
<!-- https://mvnrepository.com/artifact/org.apache.httpcomponents/httpclient -->
<dependency>
  <groupId>org.apache.httpcomponents</groupId>
  <artifactId>httpclient</artifactId>
  <version>4.5.13</version>
</dependency>
```

How it Works
------------
DuOSU is a simple 2-step program:

1. Activate DuOSU as a new Duo Mobile device. DuOSU communicates with Duo's API activation endpoint and registers itself as a new Android device. The new device information is synced to the user's Google account (see Privacy).
2. Login. When the extension is clicked, DuOSU approves all active push requests returned by the transactions API endpoint for this device.

Privacy
-------
DuOSU stores device information (the data necessary to identify itself to Duo) via Chrome's storage API. This means that the information stored by this extension is accessible to all Chrome browsers the user is signed into rather than just the local machine (you can change these preferences [here](https://support.google.com/chromebook/answer/2914794?hl=en)). No information created by this extension is sent anywhere but to Duo's secure API to identify yourself and log you in, so users can rest assured that their data is kept private. Users can clear their data by clicking the gear icon on the top right of the extension and clicking the reset button.

Acknowledgements
----------------
Here are similar repositories that helped make DuOSU possible:

- [Easy Duo Authentication](https://github.com/SparkShen02/Easy-Duo-Authentication) (Chrome extension that dynamically creates HOTPs for users)
- [Bye DUO](https://github.com/yuchenliu15/bye-duo/blob/master/backend/server.py) (Operates same as above)
- [Duo One Time Password Generator](https://github.com/revalo/duo-bypass) (Python Library for creating HOTPs)
- [Ruo](https://github.com/falsidge/ruo) (Python Library for activating / passing Duo push requests)

Contributing
------------
Feel free to help develop for DuOSU! Please submit pull requests to help with formatting, styling, or general execution of the extension.

You are also encouraged to adapt this repository into a project of your own. Please keep in mind that the purpose of this repository is to share knowledge on how to make Duo Mobile more accessible than it already offers. Credit to the original would be appreciated but not required.
