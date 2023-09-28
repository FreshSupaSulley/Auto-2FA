package duo;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.URLEncoder;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Map;
import java.util.TimeZone;

import javax.annotation.Nullable;

import org.apache.http.HttpEntity;
import org.apache.http.HttpHeaders;
import org.apache.http.HttpResponse;
import org.apache.http.NameValuePair;
import org.apache.http.StatusLine;
import org.apache.http.client.methods.HttpGet;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.client.methods.HttpRequestBase;
import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.impl.client.HttpClients;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.supasulley.main.Main;

/**
 * Creates HTTP requests for interacting with third-parties.
 */
public class WebUtils {
	
	// For parsing JSON
	private static final TypeReference<Map<String, Object>> ARRAY = new TypeReference<Map<String, Object>>() {};
	private static final ObjectMapper mapper = new ObjectMapper();
	
	// Web-standard text encoding
	private static final Charset HTTP_ENCODING = StandardCharsets.UTF_8;
	
	/**
	 * Makes an HTTP GET request to the provided URI.
	 * @param uri The URI to make the request to
	 * @param headers Optional additional headers
	 * @return Response from provided URI
	 * @throws IOException an error occurred making the request or if server returned an error code
	 */
	public static String getRequest(String uri, @Nullable NameValuePair... headers) throws IOException
	{
		HttpGet get = null;
		
		// Merge URISyntaxException into IOException
		try {
			get = new HttpGet(new URI(uri));
		} catch(URISyntaxException e) {
			Main.logException(e);
			throw new IOException(e);
		}
		
		get.setHeader(HttpHeaders.CONTENT_TYPE, "application/x-www-form-urlencoded");
		
		for(NameValuePair pair : headers)
		{
			get.setHeader(pair.getName(), pair.getValue());
		}
		
		return buildRequest(get);
	}
	
	/**
	 * Makes an HTTP POST request to the provided URI.
	 * @param uri The URI to make the request to
	 * @param entity The HTTPEntity to attach to the request, such as a body with StringEntity.
	 * @param headers Optional additional headers
	 * @return Response from provided URI
	 * @throws IOException an error occurred making the request or if server returned an error code
	 */
	public static String postRequest(String uri, @Nullable HttpEntity entity, @Nullable NameValuePair... headers) throws IOException
	{
		HttpPost post = null;
		
		// Merge URISyntaxException into IOException
		try {
			post = new HttpPost(new URI(uri));
		} catch(URISyntaxException e) {
			Main.logException(e);
			throw new IOException(e);
		}
		
		post.setEntity(entity);
		post.setHeader(HttpHeaders.CONTENT_TYPE, "application/x-www-form-urlencoded");
		
		for(NameValuePair pair : headers)
		{
			post.setHeader(pair.getName(), pair.getValue());
		}
		
		return buildRequest(post);
	}
	
	public static String postRequest(String uri, @Nullable NameValuePair... headers) throws IOException
	{
		return WebUtils.postRequest(uri, null, headers);
	}
	
	private static String buildRequest(HttpRequestBase request) throws IOException
	{
		// Execute request and read response
		CloseableHttpClient client = HttpClients.createDefault();
		HttpResponse response = client.execute(request);
		
		// Throw error for unexpected result
		StatusLine status = response.getStatusLine();
		int code = status.getStatusCode();
		
		// Get response
		StringBuilder result = new StringBuilder();
		InputStream stream = response.getEntity().getContent();
		
		for(int read = 0; (read = stream.read()) != -1;)
		{
			result.append((char) read);
		}
		
		if(code < 200 || code > 299)
		{
			throw new IOException("Bad HTTP code: " + status.getStatusCode() + " - " + status.getReasonPhrase() + "\n\n" + result.toString());
		}
		
		return result.toString();
	}
	
	/**
	 * Formats the provided time into GMT time with the specified pattern. This method uses the universal time zone (UTC/GMT).
	 * @param pattern The pattern describing the date and time format
	 * @param time The time in milliseconds
	 * @return Formatted time
	 */
	public static String formatTime(String pattern, long time)
	{
		SimpleDateFormat format = new SimpleDateFormat(pattern);
		format.setTimeZone(TimeZone.getTimeZone("GMT"));
		return format.format(new Date(time));
	}
	
	/**
	 * Encodes text into the HTML standard ISO 8859-1 charset.
	 * @param text the text to encode
	 * @return text
	 */
	public static String urlEncode(String text)
	{
		return URLEncoder.encode(text, HTTP_ENCODING);
	}
	
	/**
	 * Parses a raw JSON array with simple name and value mapping.
	 * @param raw raw JSON data as string
	 * @return map of JSON data, or null if an error occurs
	 */
	public static Map<String, Object> getJSONArray(String raw)
	{
		try {
			return mapper.readValue(raw, ARRAY);
		} catch(JsonProcessingException e) {
			Main.error("An error occured reading JSON array from raw: " + raw);
			Main.logException(e);
			return null;
		}
	}
	
	/**
	 * Creates an ObjectNode object to build JSON objects.
	 * @return new ArrayNode
	 */
	public static ObjectNode createObjectNode()
	{
		return mapper.createObjectNode();
	}
}
