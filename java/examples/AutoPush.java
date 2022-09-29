package examples;

import java.io.File;
import java.io.IOException;

import duo.DuOSU;

public class AutoPush {
	
	public static void main(String[] args)
	{
		DuOSU osu = null;
		File file = new File("src/keys/tokens.json");
		
		try {
			// Load device info from file
			osu = new DuOSU(file);
			
			// Activate client device using Duo activation code. Saves device info to file
//			osu = new DuOSU("ENTER ACTIVATION CODE HERE", file);
		} catch(Throwable e) {
			e.printStackTrace();
		}
		
		// Endlessly ask for transactions
		while(true)
		{
			try {
				System.out.println("Retrieving transactions...");
				
				// Loop through array of active transactions
				for(String id : osu.getTransactions())
				{
					System.out.println("Approving " + id);
					
					// Approve all push requests
					osu.replyTransaction(id, true);
				}
			} catch(IOException e) {
				e.printStackTrace();
			}
			
			// Wait 10s before getting new batch of transactions
			try {
				Thread.sleep(10000);
			} catch(InterruptedException e) {
				e.printStackTrace();
			}
		}
	}
}
