import express, { Response, Request, NextFunction } from "express";
import msgData from "../interfaces/msgData";
import transcribeAudioFromURL from "./transcription";
const sdk = require("api")("@gupshup/v1.0#ezpvim9lcyhvffa");
import axios from "axios";
import { submitPrativedan } from '../services/submitPrativedan';
const sdk_read = require('api')('@gupshup/v1.0#52yl2v10lk9hvls9');
import stateManager from "./stateManager"; // import the singleton state manager
require("dotenv").config();
import sendTask from "./sendTask";
import { getAllOptInUsers } from "./Check_User_Opt_In";
import { getPendingListForBot } from "../services/pendingListForBot";
import { markTaskAsCompleted } from "../services/markTaskCompleted";
import { now } from "moment";

const processedMessageIds: string[] = [];
const store_gyapan_url_and_name: { [phoneNumber: string]: string[] } = {};
const clientKey: string = process.env.APIKEY as string;
//constants for sending consent template.
const sourceName = "Egyapaan";
const axiosConfig = {
  headers: {
    "Content-Type": "application/x-www-form-urlencoded",
    "apikey": clientKey, // Make sure this is correctly set in your .env file
  },
};

const verify = async (req: Request, res: Response, next: NextFunction) => {
  const payload = req.body.payload;
  const phoneNumber = payload?.source;
  console.log(payload);
  if (payload && payload.type === "sandbox-start") {
    // Return an empty response with HTTP_SUCCESS (2xx) status code
    res.status(200).send("");
    // Acknowledge the reception immediately, as per your requirements
    setTimeout(() => {
      // You can put your asynchronous processing logic here if needed
      // Acknowledge the reception
      console.log("Acknowledged receipt of sandbox-start event");
    }, 500);
  } else {
      try {
        markAsSeen(payload?.id);
        if (!processedMessageIds.includes(payload?.id)) {
            //store processed msgs for non repitative msgs.
            processedMessageIds.push(payload?.id);
  
            if(payload?.type === 'button_reply'){
              //if its a button_reply then get the message id for which it was sent.
              const id = payload.payload.id;
              console.log("gyapan - ",id);
              //For submit button
              if(payload.payload?.title === 'Submit'){
                //Search in Task collection for such ID.
                if (!stateManager.isGyapanInQueue(phoneNumber)) {
                  //push to state array for having a one session at one time for gyapan.  
                  stateManager.addToCurrentGyapanIdInQueue(phoneNumber,id);
                  store_gyapan_url_and_name[phoneNumber] = [];
                  res.status(200).send(`कृपया अपना प्रतिवेदन यहां अपलोड करें | *Gyapan ID/Case ID - ${stateManager.getCurrentGyapanIdInQueue(phoneNumber)}*`);
                }
              }
              //For Yes button
              if(payload.payload?.title === 'हाँ'){
                //Search in Task collection for such ID.
                if(stateManager.isGyapanInQueue(phoneNumber) && store_gyapan_url_and_name[phoneNumber].length != 0){
                  
                  const gyapanId = stateManager.getCurrentGyapanIdInQueue(phoneNumber)?.split("/")[0];
                  //Mark that gyapan as sent - so that next time we do not share it again. 
                  const gyapan_id = {
                    "gyapanIds":[gyapanId]
                  };
                  
                  await markTaskAsCompleted(gyapan_id).then((res_)=>{
                    if(res_.code==200){
                      console.log("Gyapan marked Successfully!!.");
                    }else{
                      console.log("Message failed to mark!!.");
                    }
                  })
                  

                  //TODO: Send it to the Prativedan API.
                  const prativedan = {
                    "gyapanId"      : gyapanId,
                    "prativedanUrl" : store_gyapan_url_and_name[phoneNumber][1], //[0] is for name of the file and [1] is for URL.
                    "submittedAt"   : new Date()
                  };

                  await submitPrativedan(prativedan).then((res_)=>{
                    if(res_.code==200){
                      console.log("Prativedan submitted Successfully!!.");
                    }else{
                      console.log("Prativedan Message failed to submit!!.");
                    }
                  })

                  //reset
                  stateManager.clearCurrentGyapanIdInQueue(phoneNumber);
                  store_gyapan_url_and_name[phoneNumber] = [];

                  res.status(200).send(`प्रतिवेदन सफलतापूर्वक सबमिट किया गया | *Gyapan ID/Case ID - ${id}*`);
                
                }
              }
              if (payload.payload?.title === 'पुनः भेजें') {
                // Check if there is a Gyapan ID in the queue and some data stored
                if (stateManager.isGyapanInQueue(phoneNumber) && store_gyapan_url_and_name[phoneNumber].length != 0) {
                  
                  // Reset the store_gyapan_url_and_name array
                  store_gyapan_url_and_name[phoneNumber] = []; // or store_gyapan_url_and_name = [];
              
                  // Log the reset action for debugging
                  console.log("store_gyapan_url_and_name has been reset.");
              
                  // Prompt the user to re-upload the file
                  res.status(200).send(`कृपया अपना प्रतिवेदन यहां अपलोड करें | *Gyapan ID/Case ID - ${stateManager.getCurrentGyapanIdInQueue(phoneNumber)}*`);
                }
              }
              
            }
            if(payload.payload.text === 'ग्यापन दिखाएं'){
              // * // Will Fetch Pending Gyapan from the DB and send the list of Pending Gyapan from App Backend. //
              await getPendingListForBot(payload.sender.dial_code).then((res_)=>{
                if(res_.code==200){
                    // * // Notify users if there is no pending task. //
                  if(res_.result.data.length===0){
                    //TODO: Notify that there is not pending task.
                    res.status(200).send("No pending Gyapan now!!");
                  }else{
                      //console.log(res_.result);
                    console.log("Pending Task found and sent Successfully!!");
                  }
                }else{
                  console.log("Failed to get-pending task.");
                }
              })
            }

            if(phoneNumber != undefined){
              console.log("object "
                + stateManager.isGyapanInQueue(phoneNumber)
                + payload?.payload?.url);
                console.log("object2");
                console.log(store_gyapan_url_and_name[phoneNumber]);
            }
            
            if(stateManager.isGyapanInQueue(phoneNumber) && payload?.payload?.url && store_gyapan_url_and_name[phoneNumber].length ==0){
              //extract the response here!!
              const name = payload?.payload?.name;
              const url = payload?.payload?.url;
    
              store_gyapan_url_and_name[phoneNumber].push(name);
              store_gyapan_url_and_name[phoneNumber].push(url);

              //console the result to debug
              console.log("STATE "+stateManager.getCurrentGyapanIdInQueue(phoneNumber));
              
              //number to send
              const to=payload?.source;
    
              let message;
              message={
                "content":{
                  "type":"file",
                  "url":url,
                  "text":`मैं इस दस्तावेज़ को भेजने की पुष्टि करता हूँ ?`,
                  "filename":"PDF file",
                  "caption": `${stateManager.getCurrentGyapanIdInQueue(phoneNumber)}`,
                },
                "type": "quick_reply",
                "msgid": `${stateManager.getCurrentGyapanIdInQueue(phoneNumber)}`,
                "options": [{ "type": "text", "title": "हाँ" },{ "type": "text", "title": "पुनः भेजें" }]
              }
              const postData = {
                channel: "whatsapp",
                source: "919399504804",
                destination: to,
                message: JSON.stringify(message),
                "src.name": sourceName,
              }
            
              try {
                const response = await axios.post(
                  "https://api.gupshup.io/sm/api/v1/msg",
                  postData,
                  axiosConfig
                );
                return {
                  status: 200, 
                  data: response.data
                }; // Return only the data part of the response
              } catch (error) {
                throw error;
              }
            }
        }
      } catch (e) {
        console.log("User Inbound message.");
      }
  }
};

async function ask_consent(res: Response, payload: msgData) {
  // Accessing the phone number
  try {
    const phoneNumber = payload.sender.phone;

    sdk.markauserasoptedIn(
      { user: phoneNumber },
      {
        appname: "ProductiveGPT",
        apikey: clientKey,
      }
    );
    res.status(200).send("");
  } catch (e) {
    console.log("Error");
  }
}

function markAsSeen(id: any) {
  sdk_read.markMessageAsRead({
    appId: '49a05590-5a1c-42f1-a713-95f14457c1d3',
    msgId: id,
    apikey: clientKey
  }).catch((error: any) => {
    console.error("Failed to mark message as read:", error);
  });
}

export default verify;