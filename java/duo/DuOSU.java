package duo;

import java.io.File;
import java.io.IOException;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.StandardOpenOption;
import java.security.InvalidKeyException;
import java.security.KeyFactory;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.NoSuchAlgorithmException;
import java.security.PrivateKey;
import java.security.PublicKey;
import java.security.Signature;
import java.security.SignatureException;
import java.security.spec.InvalidKeySpecException;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.X509EncodedKeySpec;
import java.util.AbstractMap.SimpleEntry;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import org.apache.http.message.BasicNameValuePair;

import com.fasterxml.jackson.databind.node.ObjectNode;

public class DuOSU {
	
	static
	{
		Signature signature = null;
		
		try {
			signature = Signature.getInstance("SHA512withRSA");
		} catch(NoSuchAlgorithmException e) {
			System.err.println("SHA512withRSA signature provider could not be found. This is required for authentication.");
			e.printStackTrace();
			System.exit(1);
		}
		
		RSA_SIGNER = signature;
	}
	
	/** Ensure UTF-8 encoding when converting string to bytes */
	private static final Charset charset = StandardCharsets.UTF_8;
	/** Used to sign signatures with RSASSA-PKCS1-v1_5 (see https://www.rfc-editor.org/rfc/rfc3447#page-32) */
	private static final Signature RSA_SIGNER;
	
	/** Contains all info necessary to authenticate and perform API requests to Duo */
	private DeviceInfo activation;
	
	/**
	 * Reads device info data from a local file.
	 * @param deviceFile JSON file to read device information from
	 * @throws IOException if an exception occurs reading file
	 * @throws InvalidKeySpecException if public / private key data is malformed for RSA
	 * @throws NoSuchAlgorithmException if the RSA key factory could not be found
	 */
	public DuOSU(File deviceFile) throws IOException, InvalidKeySpecException, NoSuchAlgorithmException
	{
		// Values are from a JSON file, or fetch new ones with an activation code created when activating a new Duo Mobile device
		Map<String, Object> map = WebUtils.getJSONArray(Files.readString(deviceFile.toPath()));
		
		KeyFactory factory = KeyFactory.getInstance("RSA");
		PublicKey publicKey = factory.generatePublic(new X509EncodedKeySpec(Base64.getDecoder().decode(map.get("public").toString())));
		PrivateKey privateKey = factory.generatePrivate(new PKCS8EncodedKeySpec(Base64.getDecoder().decode(map.get("private").toString())));
		
		this.activation = new DeviceInfo(map.get("akey").toString(), map.get("pkey").toString(), map.get("host").toString(), publicKey, privateKey);
	}
	
	/**
	 * Activates a new Duo Mobile device using the activation endpoint.
	 * @param activationCode activation code provided by Duo when setting up a new device (example: 9jSM1d5W1MWOSECcY5CX-YXBpLWRlOGM3MDE3LmR1b3NlY3VyaXR5LmNvbQ)
	 * @param deviceFile JSON file to write device information to
	 * @throws IOException if an exception occurs, either from writing file or unexpected server response
	 * @throws NoSuchAlgorithmException if an RSA key provider could not be found
	 */
	public DuOSU(String activationCode, File deviceInfo) throws IOException, NoSuchAlgorithmException
	{
		// Generate a new RSA key pair necessary for the authentication header in transaction requests
		KeyPairGenerator instance = KeyPairGenerator.getInstance("RSA");
		instance.initialize(2048);
		KeyPair keyPair = instance.generateKeyPair();
		
		// Map of URL encoded pairs (some are likely not required / can be customized. Feel free to experiment)
		HashMap<String, String> params = new HashMap<String, String>();
		params.put("customer_protocol", "1");
		params.put("jailbroken", "false");
		params.put("architecture", "arm64");
		params.put("region", "US");
		params.put("app_id", "com.duosecurity.duomobile");
		params.put("full_disk_encryption", "true");
		params.put("passcode_status", "true");
		// MUST be a platform recognized by Duo (iOS and Android [more might exist?])
		params.put("platform", "Android");
		params.put("app_version", "3.49.0");
		params.put("app_build–number", "323001");
		params.put("version", "11");
		params.put("language", "en");
		params.put("security_patch_level", "2021-02-01");
		// Can be customized
		// Customizing the model seems to have inconsistencies with capitalizations?
		params.put("model", "Device Name");
		params.put("manufacturer", "unknown");
		
		// Duo uses RSA keys for authentication, which requires the client device to generate a set of RSA keys
		// The public key must be sent in PEM format to the /push/v2/activation endpoint (https://www.rfc-editor.org/rfc/rfc7468#page-14)
		// The following converts the public key to PEM format as a string
		StringBuilder pemPublicKey = new StringBuilder("-----BEGIN PUBLIC KEY-----\n");
		
		byte[] bytes = Base64.getEncoder().encode(keyPair.getPublic().getEncoded());
		// 64 is line length
		char[] buffer = new char[64];
		
		for(int i = 0; i < bytes.length; i += buffer.length)
		{
			int index = 0;
			
			while(index != buffer.length)
			{
				if((i + index) >= bytes.length)
				{
					break;
				}
				
				buffer[index] = (char) bytes[i + index];
				index++;
			}
			
			pemPublicKey.append(buffer);
			pemPublicKey.append("\n");
		}
		
		pemPublicKey.append("-----END PUBLIC KEY-----");
		
		// Put RSA key specs in map
		params.put("pubkey", pemPublicKey.toString());
		params.put("pkpush", "rsa-sha512");
		
		// BEGIN CREATING HTTP GET REQUEST
		
		// Split activationCode into its two parts: the 20-character identifier and the 40-character Base64 encoded API host
		String[] root = activationCode.split("-");
		String identifier = root[0];
		String host = new String(Base64.getDecoder().decode(root[1]));
		
		StringBuilder url = new StringBuilder("https://");
		url.append(host);
		// Activation endpoint
		url.append("/push/v2/activation/" + identifier);
		// Add URL-encoded parameters
		url.append("?" + createQueryString(params));
		
		// Perform request. Returns a map of 2 objects: another map (response), and a status code (we only care about response)
		Map<String, Object> json = WebUtils.getJSONArray(WebUtils.postRequest(url.toString()));
		
		// Casting JSON response is open to optimization
		@SuppressWarnings("unchecked")
		Map<String, Object> map = (Map<String, Object>) json.get("response");
		String akey = map.get("akey").toString();
		String pkey = map.get("pkey").toString();
		
		// Create JSON representation of activation information
		// The jackson JSON library is used to achieve this (feel free to use your own implementation to save device data)
		ObjectNode node = WebUtils.createObjectNode();
		node.put("akey", akey);
		node.put("pkey", pkey);
		node.put("host", host);
		// Encode key data to Base64 to not confuse JSON parsers with raw byte data
		node.put("public", new String(Base64.getEncoder().encode(keyPair.getPublic().getEncoded()), charset));
		node.put("private", new String(Base64.getEncoder().encode(keyPair.getPrivate().getEncoded()), charset));
		
		// Write device info to file
		deviceInfo.getParentFile().mkdirs();
		deviceInfo.createNewFile();
		Files.write(deviceInfo.toPath(), node.toString().getBytes(charset), StandardOpenOption.TRUNCATE_EXISTING);
		
		// Return response as an activation object
		this.activation = new DeviceInfo(akey, pkey, host, keyPair.getPublic(), keyPair.getPrivate());
	}
	
	/**
	 * Performs an API request to the transactions endpoint to check for Duo push requests.
	 * @return possibly-empty string array of active transaction URG IDs (use {@code replyTransaction()} to approve / deny a transaction)
	 * @throws IOException if the server returns an unexpected result
	 */
	@SuppressWarnings("unchecked")
	public String[] getTransactions() throws IOException
	{
		// Make a GET request using the transactions endpoint
		SimpleEntry<String, BasicNameValuePair[]> entry = buildRequest("GET", "/push/v2/device/transactions");
		Map<String, Object> json = WebUtils.getJSONArray(WebUtils.getRequest(entry.getKey(), entry.getValue()));
		
		/* The API returns an array called "transactions" that contains all active push notifications.
		 * It's embedded in a JSON object called "response".
		 * 
		 * Each transaction in the transactions array returns the parameters listed below:
		 * - akey
		 * - attributes (such as organization, integration, username, IP address, etc.)
		 * - expiration
		 * - require_lock
		 * - require_touch_id
		 * - summary
		 * - txid
		 * - type
		 * - urgid
		 * 
		 * The only parameter we need to approve / deny transactions is "urgid".
		 */
		
		// Casting JSON response is open to optimization
		Map<String, Object> response = (Map<String, Object>) json.get("response");
		List<Map<String, Object>> transactions = (List<Map<String, Object>>) response.get("transactions");
		
		// Fill an array of urg IDs
		String[] urgIDs = new String[transactions.size()];
		
		for(int i = 0; i < urgIDs.length; i++)
		{
			urgIDs[i] = transactions.get(i).get("urgid").toString();
		}
		
		return urgIDs;
	}
	
	/**
	 * Sends a reply to a device transaction either approving or denying the push.
	 * @param urgID URG ID of transaction (use {@code getTransactions()})
	 * @param approve true if transaction should be approved, false if denied
	 * @throws IOException if Duo returns an unexpected result
	 */
	@SuppressWarnings("unchecked")
	public void replyTransaction(String urgID, boolean approve) throws IOException
	{
		SimpleEntry<String, BasicNameValuePair[]> entry = buildRequest("POST", "/push/v2/device/transactions/" + urgID, new BasicNameValuePair("answer", approve ? "approve" : "deny"));
		BasicNameValuePair[] arrays = new BasicNameValuePair[entry.getValue().length + 1];
		arrays[0] = new BasicNameValuePair("txId", urgID);
		
		for(int i = 1; i < arrays.length; i++)
		{
			arrays[i] = entry.getValue()[i - 1];
		}
		
		// Ensure response says "SUCCESS"
		Map<String, Object> json = WebUtils.getJSONArray(WebUtils.postRequest(entry.getKey(), arrays));
		Map<String, Object> response = (Map<String, Object>) json.get("response");
		String result = response.get("result").toString();
		
		if(!result.equals("SUCCESS"))
		{
			System.err.println("Transaction reply returned " + result);
		}
	}
	
	/**
	 * Builds an API request.
	 * @param path API endpoint of request
	 * @param method HTTP method type (GET, POST)
	 * @param additionalParams optional array of additional key-value params to add to signature
	 * @return name-value pair (name is the URL, value is the array of headers), or null if RSA keys are malformed
	 */
	private SimpleEntry<String, BasicNameValuePair[]> buildRequest(String method, String path, BasicNameValuePair... additionalParams)
	{
		// Parameters to include in canon request
		HashMap<String, String> params = new HashMap<String, String>();
		params.put("akey", activation.akey);
		params.put("fips_status", "1");
		params.put("hsm_status", "true");
		params.put("pkpush", "rsa-sha512");
		
		// Add optional parameters, if any
		for(BasicNameValuePair pair : additionalParams)
		{
			params.put(pair.getName(), pair.getValue());
		}
		
		String date = WebUtils.formatTime("EEE, dd MMM yyyy HH:mm:ss -0000", System.currentTimeMillis());
		byte[] signed = null;
		
		// Encrypts canonical request with RSA private key and hashes with SHA512
		try {
			byte[] toSign = canonRequest(date, method, activation.host, path, params).getBytes(charset);
			
			RSA_SIGNER.initSign(activation.privateKey);
			RSA_SIGNER.update(toSign);
			signed = RSA_SIGNER.sign();
			
			// Verify result with public key (optional)
			RSA_SIGNER.initVerify(activation.publicKey);
			RSA_SIGNER.update(toSign);
			
			// If public / private keys don't match, warn the user
			if(!RSA_SIGNER.verify(signed))
			{
				System.err.println("Failed to verify public / private key");
			}
		} catch(InvalidKeyException | SignatureException e) {
			System.err.println("Public / private key data is malformed for RSA signatures");
			e.printStackTrace();
			return null;
		}
		
		// Authentication format: "Basic " + Base64 encoded signature (pkey + ":" + Base64 encoded request)
		// Signature is encoded in Base64. When put together with pkey and separated by a colon, the result is also encoded in Base64.
		BasicNameValuePair auth = new BasicNameValuePair("Authorization", "Basic " + new String(Base64.getEncoder().encode((activation.pkey + ":" + new String(Base64.getEncoder().encode(signed), charset)).getBytes(charset)), charset));
		
		// Required headers
		BasicNameValuePair[] headers = {auth, new BasicNameValuePair("x-duo-date", date), new BasicNameValuePair("host", activation.host)};
		
		return new SimpleEntry<String, BasicNameValuePair[]>("https://" + activation.host + path + "?" + createQueryString(params), headers);
	}
	
	/**
	 * Creates a canonicalized string of an API request.
	 * This is the second component of the authentication signature.
	 * @param date RFC 2822 formatted time (ex. Tue, 24 Sep 2022 15:30:14 -0000)
	 * @param method HTTP request type
	 * @param host Duo API hostname (api-xxxxxxxx.duosecurity.com)
	 * @param path specific API method's path
	 * @param map map of key-value pairs to be URL-encoded
	 * @return string representation of authentication signature
	 */
	private String canonRequest(String date, String method, String host, String path, Map<String, String> map)
	{
		StringBuilder builder = new StringBuilder();
		builder.append(date + "\n");
		builder.append(method.toUpperCase() + "\n");
		builder.append(host.toLowerCase() + "\n");
		builder.append(path + "\n");
		builder.append(createQueryString(map));
		return builder.toString();
	}
	
	/**
	 * Creates a URL encoded string to be appended to a URL.
	 * @param params map of key-value pairs
	 * @return URL encoded string
	 */
	private String createQueryString(Map<String, String> params)
	{
		// Duo requires URL pairs to be sorted alphabetically
		ArrayList<String> keys = new ArrayList<String>(params.keySet());
		Collections.sort(keys);
		
		// First pair in URL must begin with '?'. Remaining are separated with &
		StringBuilder query = new StringBuilder();
		
		for(String key : keys)
		{
			String name = WebUtils.urlEncode(key);
			String value = WebUtils.urlEncode(params.get(key));
			query.append("&" + name + "=" + value);
		}
		
		// Remove first &
		return query.toString().substring(1);
	}
	
	/**
	 * BONUS METHOD<br><br>
	 * For those looking to create OTPs (one-time-passwords) in Java for Duo Mobile with device activation.
	 * This method is adopted directly from RFC 4226, which includes direct Java source code at the bottom (https://www.rfc-editor.org/rfc/rfc4226).
	 * This adaptation tosses the option to add a checksum, as Duo Mobile doesn't require it.
	 * It also does not support truncation offsets.<br><br>
	 * 
	 * Creates an OTP (one-time-password) for activated Duo Mobile devices.
	 * @param secret HOTP secret
	 * @param count moving-factor of OTP (0,1,2,3...)
	 * @param digits number of digits required (typically 6)
	 * @return new HOTP password with the specified digits
	 * @throws NoSuchAlgorithmException if an HMAC SHA-1 MAC provider could not be found
	 */
	public String generateOTP(byte[] secret, long count, int digits) throws NoSuchAlgorithmException, InvalidKeyException
	{
		byte[] text = new byte[8];
		
		for(int i = text.length - 1; i >= 0; i--)
		{
			text[i] = (byte) (count & 0xff);
			count >>= 8;
		}
		
		// Encode text with HMAC SHA-1 algorithm
		// HMAC SHA-1 encoding returns 160 bits == 20 byte array
		SecretKeySpec macKey = new SecretKeySpec(secret, "RAW");
		Mac mac = Mac.getInstance("HmacSHA1");
		mac.init(macKey);
		byte[] hash = mac.doFinal(text);
		
		// Select 31 bits to fill a Java int
		// This is not 32 bits due to 2's complement (first bit remains 0 for positive)
		// We choose where to sample using the last 4 bits in the hash
		// The total of the bits (0-15) determines the byte where we start sampling in the 20-byte hash
		// Even if the last 4 bits is maximized (1111 == 15), we still have 4 bytes to read (15, 16, 17, 18)
		// The first 4 bits of the last byte in the hash are not used
		int index = hash[19] & 0xF;
		
		// 0x7F mask == 01111111
		// This discards the first bit for 2's complement
		// We shift these 7-bits (first bit is 0 by default) by 24 bits to the left to fill the first 8 bits of the 32 we need to fill
		// The rest are masked by 0xFF, which is 11111111 in binary, meaning all bits are passed
		// This is required to include, as it converts the byte from signed to unsigned (-128-127 to 0-255)
		int binary = ((hash[index] & 0x7f) << 24) | ((hash[index + 1] & 0xFF) << 16) | ((hash[index + 2] & 0xFF) << 8) | (hash[index + 3] & 0xFF);
		
		// Truncate binary to return only the requested number of digits
		// Formula for the mod == Math.pow(10, digits)
		String result = Integer.toString(binary % (int) Math.pow(10, digits));
		
		// Append 0s to the start if the integer happens to be small
		while(result.length() < digits)
		{
			result = "0" + result;
		}
		
		return result;
	}
	
	/**
	 * DeviceInfo maintains client information necessary to build API requests.
	 */
	static class DeviceInfo {
		
		public String akey, pkey, host;
		public PublicKey publicKey;
		public PrivateKey privateKey;
		
		public DeviceInfo(String akey, String pkey, String host, PublicKey publicKey, PrivateKey privateKey)
		{
			this.akey = akey;
			this.pkey = pkey;
			this.host = host;
			this.publicKey = publicKey;
			this.privateKey = privateKey;
		}
	}
}