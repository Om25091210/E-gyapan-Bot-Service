const sdk = require("api")("@gupshup/v1.0#ezpvim9lcyhvffa");

const clientKey: string = process.env.APIKEY as string;

export default async function ask_consent(phoneNumber:string) {
    // Accessing the phone number
    try {
      sdk.markauserasoptedIn(
        { user: phoneNumber },
        {
          appname: "ProductiveGPT",
          apikey: clientKey,
        }
      );
      
    } catch (e) {
      console.log("Error");
    }
}
