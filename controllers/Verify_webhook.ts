import express, { Response, Request, NextFunction } from "express";
import msgData from "../interfaces/msgData";
import transcribeAudioFromURL from "./transcription";
const sdk = require("api")("@gupshup/v1.0#ezpvim9lcyhvffa");
import axios from "axios";
import { submitTaskForApproval } from '../services/submitTaskForApproval';
const sdk_read = require('api')('@gupshup/v1.0#52yl2v10lk9hvls9');


require("dotenv").config();
import sendTask from "./sendTask";
import { getAllOptInUsers } from "./Check_User_Opt_In";
import { getPendingListForBot } from "../services/pendingListForBot";
import { markTaskAsCompleted } from "../services/markTaskCompleted";

const processedMessageIds: string[] = [];
const currentGyapanIdInQueue: string[] = [];
const store_gyapan_url_and_name: string[] = [];
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
        console.log(payload.id);
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
                if(currentGyapanIdInQueue.length!=1){
                  //push to array for having a one session at one time for gyapan.  
                  currentGyapanIdInQueue.push(id);
                  res.status(200).send(`कृपया अपना प्रतिवेदन यहां अपलोड करें | *Gyapan ID/Case ID - ${id}*`);
                }
              }
              console.log("The title here -" + payload.payload?.title);
              //For Yes button
              if(payload.payload?.title === 'हाँ'){
                console.log(payload.payload?.title);
                console.log(currentGyapanIdInQueue.length);
                console.log(store_gyapan_url_and_name.length);
                //Search in Task collection for such ID.
                if(currentGyapanIdInQueue.length==1 && store_gyapan_url_and_name.length!=0){
                  
                  const gyapanId = currentGyapanIdInQueue[0].split("/")[0];
                  //Mark that gyapan as sent - so that next time we do not share it again. 
                  const gyapan_id = {
                    "gyapanIds":[gyapanId]
                  };
                  console.log("gyapan_id here.");
                  console.log(gyapan_id);
                  await markTaskAsCompleted(gyapan_id).then((res_)=>{
                    if(res_.code==200){
                      console.log("Gyapan marked Successfully!!.");
                    }else{
                      console.log("Message failed to mark!!.");
                    }
                  })
                  //reset
                  currentGyapanIdInQueue.length=0;
                  store_gyapan_url_and_name.length=0;

                  //TODO: Send it to the Prativedan API.
                  res.status(200).send(`प्रतिवेदन सफलतापूर्वक सबमिट किया गया | *Gyapan ID/Case ID - ${id}*`);
                
                }
              }
              if (payload.payload?.title === 'पुनः भेजें') {
                // Check if there is a Gyapan ID in the queue and some data stored
                if (currentGyapanIdInQueue.length == 1 && store_gyapan_url_and_name.length != 0) {
                  
                  // Reset the store_gyapan_url_and_name array
                  store_gyapan_url_and_name.length = 0; // or store_gyapan_url_and_name = [];
              
                  // Log the reset action for debugging
                  console.log("store_gyapan_url_and_name has been reset.");
              
                  // Prompt the user to re-upload the file
                  res.status(200).send(`कृपया अपना प्रतिवेदन यहां अपलोड करें | *Gyapan ID/Case ID - ${currentGyapanIdInQueue[0]}*`);
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
                      console.log(res_.result);
                    console.log("Pending Task found and sent Successfully!!");
                  }
                }else{
                  console.log("Failed to get-pending task.");
                }
              })
            }
            if(currentGyapanIdInQueue.length==1 && payload?.payload?.url && store_gyapan_url_and_name.length==0){
              //important for showing
              const task_id = {
                "ids":[currentGyapanIdInQueue[0]]
              };
              //extract the response here!!
              const name = payload?.payload?.name;
              const url = payload?.payload?.url;
    
              store_gyapan_url_and_name.push(name);
              store_gyapan_url_and_name.push(url);
              //console the result to debug
              console.log(store_gyapan_url_and_name[0]);
              console.log(store_gyapan_url_and_name[1]);
              
              //number to send
              const to=payload?.source;
    
              let message;
              message={
                "content":{
                  "type":"file",
                  "url":url,
                  "text":`मैं इस दस्तावेज़ को भेजने की पुष्टि करता हूँ ?`,
                  "filename":"PDF file",
                  "caption": `${currentGyapanIdInQueue[0]}`,
                },
                "type": "quick_reply",
                "msgid": `${currentGyapanIdInQueue[0]}`,
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