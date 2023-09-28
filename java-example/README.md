#### Hello Java diehards!
The authentication flow was first built in Java / Maven for testing before transferring it to JS. To demo, include the following Maven repositories in your pom.xml (both are optional, you may adapt your own implementations):

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
You do not need to use these libraries. Jackson is for parsing the JSON response data from the Duo API, and Apache is for sending the data.
