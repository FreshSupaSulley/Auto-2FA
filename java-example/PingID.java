package org.example;

import java.math.BigInteger;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.NoSuchAlgorithmException;
import java.security.PrivateKey;
import java.security.spec.InvalidKeySpecException;
import java.security.spec.RSAPrivateKeySpec;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Base64;
import java.util.concurrent.CompletableFuture;

import org.json.JSONObject;

import dev.samstevens.totp.code.CodeGenerator;
import dev.samstevens.totp.code.DefaultCodeGenerator;
import dev.samstevens.totp.code.HashingAlgorithm;
import dev.samstevens.totp.exceptions.CodeGenerationException;
import dev.samstevens.totp.time.SystemTimeProvider;

public class App {
	
	private static final BigInteger MODULUS = new BigInteger("31699142174809458850082382402788043663106991194823033018937598360175543864008929147299064252168453738943971427430573724299451532315792264426805566434465462934418283232907859404393018571514608788370423091472983586618753610753267691204574928448208043716881455949580766738255691280349814402624986309907947002933353231849001791191635190937132539826983405101078519868057148135558938382459177989299888762060399149632192621098665680524371521279226055278689674546320728943602920232032098494228433554236457762609352311775484579991903198376092701627874966808866193660346730954051618204007340985917068527050534376051268966999771");
	private static final BigInteger EXPONENT = new BigInteger("8390693331667715754486841459516999365942117120896479321543860529977649986738710932492645637036975315262074009145244330413121373527140490213833553011610077029080079472402903566194789045414798906819901957357333762132365354876517253966024742836188550565002991548062199230845028067898567303195705479517343037267195140328879700808761291392618146199430046719804491789584673789462898476730059543679735181586708922509533904621815010091105621437823269586493885296838942592259446770902301835233439160257329392427991032084412600737879553876421234934024950683990086122360023203904332094142305147536789666403169204321784566223333");
	
	private static JSONObject metaHeader;
	
	static
	{
		// Build the JSON payload using org.json
		metaHeader = new JSONObject();
		metaHeader.put("api_version", "18.0");
		metaHeader.put("app_version", "1.23.0(13063)");
		metaHeader.put("is_device_lock", false);
		metaHeader.put("device_type", "Android");
		metaHeader.put("is_biometrics_supported", true);
		metaHeader.put("locale", "en-US");
		metaHeader.put("disabled_location", true);
		metaHeader.put("pingid_mdm_token", "");
		metaHeader.put("model", "AOSP on IA Emulator");
		metaHeader.put("network_type", "wifi");
		metaHeader.put("networks_info", "base64:d3M6e2E6IHcsIHdkOnt7c3NpZDo8dW5rbm93biBzc2lkPixoc3NpZDp0cnVlLG1hYzoiMDI6MDA6MDA6MDA6MDA6MDAiLHJzc2k6LTUwLGlwOjQ4ODAxOTg0LGxzOjEzfX0sd2U6IFtdfSxtczp7cFQ6IEdTTSxuY3M6IHt9fQ==");
		metaHeader.put("os_version", "9");
		metaHeader.put("pretty_model", "You got trolled");
		metaHeader.put("is_root", false);
		metaHeader.put("vendor", "Google");
	}
	
	public void getGreeting()
	{
		final String activationCode = "445049883716";
		
		// Build the JSON payload using org.json
		JSONObject metaHeader = new JSONObject();
		metaHeader.put("api_version", "18.0");
		metaHeader.put("app_version", "1.23.0(13063)");
		metaHeader.put("is_device_lock", false);
		metaHeader.put("device_type", "Android");
		metaHeader.put("is_biometrics_supported", true);
		metaHeader.put("locale", "en-US");
		metaHeader.put("disabled_location", true);
		metaHeader.put("pingid_mdm_token", "");
		metaHeader.put("model", "AOSP on IA Emulator");
		metaHeader.put("network_type", "wifi");
		metaHeader.put("networks_info", "base64:d3M6e2E6IHcsIHdkOnt7c3NpZDo8dW5rbm93biBzc2lkPixoc3NpZDp0cnVlLG1hYzoiMDI6MDA6MDA6MDA6MDA6MDAiLHJzc2k6LTUwLGlwOjQ4ODAxOTg0LGxzOjEzfX0sd2U6IFtdfSxtczp7cFQ6IEdTTSxuY3M6IHt9fQ==");
		metaHeader.put("os_version", "9");
		metaHeader.put("pretty_model", "You got trolled");
		metaHeader.put("is_root", false);
		metaHeader.put("vendor", "Google");
		
		JSONObject body = new JSONObject();
		body.put("activation_code", activationCode);
		body.put("finger_print", "ZXVFM29LWEF5WmdONlAxbWxKVkE=");
		body.put("device_type", "Android");
		body.put("is_primary", false);
		body.put("meta_header", metaHeader);
		body.put("request_type", "verify_activation_code");
		
		JSONObject fullPayload = new JSONObject();
		fullPayload.put("body", body);
		fullPayload.put("signature", "no_signature");
		
		// Create HTTP client with redirect handling
		HttpClient client = HttpClient.newBuilder().followRedirects(HttpClient.Redirect.ALWAYS).connectTimeout(Duration.ofSeconds(10)).build();
		
		// Build request
		// removed the gzip header
		// jwt true or false doesn't seem to make a difference
		HttpRequest request = HttpRequest.newBuilder().uri(URI.create("https://idpxnyl3m.pingidentity.com/AccellServer/phone_access")).header("Accept", "application/json").header("Content-Type", "application/json; charset=utf-8").header("jwt", "false").POST(HttpRequest.BodyPublishers.ofString(fullPayload.toString(), StandardCharsets.UTF_8)).build();
		
		// Send request asynchronously
		CompletableFuture<Void> future = client.sendAsync(request, HttpResponse.BodyHandlers.ofInputStream()).thenAcceptAsync(response ->
		{
			int statusCode = response.statusCode();
			System.out.println("Response code: " + statusCode);
			
			try(var is = response.body())
			{
				String responseBody = new String(is.readAllBytes(), StandardCharsets.UTF_8);
				System.out.println("Raw response body: " + responseBody);
				
				// Decode JWT payload
				String[] parts = responseBody.split("\\.");
				if(parts.length == 3)
				{
					String payloadJson = new String(Base64.getUrlDecoder().decode(parts[1]), StandardCharsets.UTF_8);
					System.out.println("Decoded JWT payload: " + payloadJson);
				}
				else
				{
					System.out.println("Response is not a valid JWT");
				}
				
			} catch(Exception e)
			{
				System.err.println("Failed to read or decode response: " + e.getMessage());
			}
		});
		
		// Wait (optional if you're in a main method)
		future.join();
		
	}
	
	public void finalizeOnboarding() throws CodeGenerationException
	{
		JSONObject body = new JSONObject();
		body.put("finger_print", "ZXVFM29LWEF5WmdONlAxbWxKVkE=");
		body.put("id", "uuid:07d837fc-f5e6-d7f0-07d8-37fcf5e6d7f0");
		body.put("nickname", "base64:aW0gZ29ubmEgdG91Y2ggeW91");
		body.put("session_id", "acts_ohi_FHgxNh5WgZBYypww6WonLM4F8S2r8BjrP7d5hVU4KV0");
		
		body.put("meta_header", metaHeader);
		
		JSONObject securityHeader = new JSONObject();
		securityHeader.put("local_fallback_data_hash", "");
		securityHeader.put("finger_print", "WWN2NlJ0V0xUZ2xJT2Y5bWFXRGc=");
		securityHeader.put("id", "uuid:07d837fc-f5e6-d7f0-07d8-37fcf5e6d7f0");
		securityHeader.put("ts", LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss.SSS"))); // i assume this is time now?
		securityHeader.put("tz", OffsetDateTime.now().getOffset().getId().replace("Z", "+0000").replace(":", ""));
		
		CodeGenerator codeGenerator = new DefaultCodeGenerator(HashingAlgorithm.SHA256); // or SHA256, SHA512
		SystemTimeProvider timeProvider = new SystemTimeProvider();
		
		String secret = "BP26TDZUZ5SVPZJRIHCAUVREO5EWMHHV";
		long time = timeProvider.getTime();
		
		String totpCode = codeGenerator.generate(secret, time); // typically 6-digit string
		
		body.put("security_header", securityHeader);
		body.put("request_type", "finalize_onboarding");
		
		JSONObject fullPayload = new JSONObject();
		fullPayload.put("body", body);
		fullPayload.put("signature", "no_signature");
		
		// Create HTTP client with redirect handling
		HttpClient client = HttpClient.newBuilder().followRedirects(HttpClient.Redirect.ALWAYS).connectTimeout(Duration.ofSeconds(10)).build();
		
		// Build request
		// removed the gzip header
		// jwt true or false doesn't seem to make a difference
		HttpRequest request = HttpRequest.newBuilder().uri(URI.create("https://idpxnyl3m.pingidentity.com/AccellServer/phone_access")).header("Accept", "application/json").header("Content-Type", "application/json; charset=utf-8").header("jwt", "false").POST(HttpRequest.BodyPublishers.ofString(fullPayload.toString(), StandardCharsets.UTF_8)).build();
		
		// Send request asynchronously
		CompletableFuture<Void> future = client.sendAsync(request, HttpResponse.BodyHandlers.ofInputStream()).thenAcceptAsync(response ->
		{
			int statusCode = response.statusCode();
			System.out.println("Response code: " + statusCode);
			
			try(var is = response.body())
			{
				String responseBody = new String(is.readAllBytes(), StandardCharsets.UTF_8);
				System.out.println("Raw response body: " + responseBody);
				
				// Decode JWT payload
				String[] parts = responseBody.split("\\.");
				if(parts.length == 3)
				{
					String payloadJson = new String(Base64.getUrlDecoder().decode(parts[1]), StandardCharsets.UTF_8);
					System.out.println("Decoded JWT payload: " + payloadJson);
				}
				else
				{
					System.out.println("Response is not a valid JWT");
				}
				
			} catch(Exception e)
			{
				System.err.println("Failed to read or decode response: " + e.getMessage());
			}
		});
		
		// Wait (optional if you're in a main method)
		future.join();
		
	}
	
	private PrivateKey getAppKey() throws Exception
	{
		return KeyFactory.getInstance("RSA").generatePrivate(new RSAPrivateKeySpec(MODULUS, EXPONENT));
	}
	
	public static void main(String[] args)
	{
		new App().getGreeting();
	}
}
