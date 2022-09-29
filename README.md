# DuOSU
Pass Duo Mobile push requests in your browser.

Opening Duo Mobile on your phone to login is too time consuming. Duo doesn't offer the ability to accept push notifications on your computer, so this chrome extension offers that support.

The chrome extension was built in HTML / JS. DuOSU was built for Ohio State University students, but it works for other organizations as well. I've also included an example Java program on how to incorporate this in a full-scale application. Include the following Maven repositories in your pom.xml:

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

Privacy
-------
DuOSU stores the device information for each account in Chrome's storage API. No DuOSU information is sent anywhere but to Duo's secure API to identify yourself and log you in, so you can rest easy. Users can reset the data by clicking the gear icon on the top right of the extension and clicking the reset button.

Contributing
------------

Feel free to help develop for DuOSU! Please submit pull requests to help with formatting, styling, or general execution of the extension.

You are also encouraged to adapt this repository into a project of your own. Just keep in mind that the purpose of this project is to share knowledge on how to make Duo Mobile more accessible than it already offers. Credit to the original would be appreciated.
