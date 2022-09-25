# DuOSU
Bypass Duo Mobile push requests on your browser.

Opening Duo Mobile on your phone to login is too time consuming. Duo doesn't offer the ability to accept push notifications on your computer, so this chrome extension offers that support.

The chrome extension was built in HTML / JS. DuOSU was built for Ohio State University students, but it still works for other platforms. I've also included an example Java program on how to incorporate this in a full-scale application. Include the following Maven repositories in your pom.xml:

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

Contributing
------------

Feel free to help develop for DuOSU! Please submit pull requests to help with formatting, styling, or general execution of the chrome extension.

You are also encouraged to adapt this repository into another project. Just keep in mind that the purpose of this project is to share knowledge on how to make Duo Mobile more accessible than it already offers, not to spread information that could lead to abusing / circumventing Duo Mobile's authentication system. Credit to the original would be appreciated.
