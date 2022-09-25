import java.io.File;
import java.io.IOException;

public class AutoPush {
	
	public static void main(String[] args)
	{
		DuOSU osu = null;
		File file = new File("ENTER FILE PATH HERE");
		
		try {
			// Load device info from file
//			osu = new DuOSU(file);
			
			// Activate client device using Duo activation code. Saves device info to file
			osu = new DuOSU("9jSM1d5W1MWOSECcY5CX-YXBpLWRlOGM3MDE3LmR1b3NlY3VyaXR5LmNvbQ", file);
		} catch(Throwable e) {
			e.printStackTrace();
		}
		
		// Endlessly ask for transactions
		while(true)
		{
			try {
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
