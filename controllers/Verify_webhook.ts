import express, { Response, Request, NextFunction } from "express";
import msgData from "../interfaces/msgData";
import transcribeAudioFromURL from "./transcription";
import axios from "axios";
import { submitPrativedan } from '../services/submitPrativedan';
import { getAllOptInUsers } from "./Check_User_Opt_In";
import { getPendingListForBot } from "../services/pendingListForBot";
import { markTaskAsCompleted } from "../services/markTaskCompleted";
import stateManager from "./stateManager"; // Singleton state manager
import { getState } from "../services/getState";
import { pushState } from "../services/pushState";

const sdk = require("api")("@gupshup/v1.0#ezpvim9lcyhvffa");
const sdk_read = require('api')('@gupshup/v1.0#52yl2v10lk9hvls9');
require("dotenv").config();

const processedMessageIds: string[] = [];
const store_gyapan_url_and_name: { [phoneNumber: string]: string[] } = {}; // Map to store per-user data
const clientKey: string = process.env.APIKEY as string;
const sourceName = "Egyapaan";

// Axios configuration for Gupshup API
const axiosConfig = {
  headers: {
    "Content-Type": "application/x-www-form-urlencoded",
    "apikey": clientKey, 
  },
};

// Main webhook verification function
const verify = async (req: Request, res: Response, next: NextFunction) => {
  const payload = req.body.payload;
  //console.log(payload);
  const phoneNumber = payload?.source;
  //TODO: To change the flag of pendingHSM to true once flow is done.
  if (payload && payload.type === "sandbox-start") {
    acknowledgeSandboxStart(res);
  } else {
    await handleMessageProcessing(payload, phoneNumber, res);
  }
};

// Acknowledge sandbox start event
const acknowledgeSandboxStart = (res: Response) => {
  res.status(200).send("");
  setTimeout(() => console.log("Acknowledged receipt of sandbox-start event"), 500);
};

// Main handler for message processing
const handleMessageProcessing = async (payload: any, phoneNumber: string, res: Response) => {
  try {
    markAsSeen(payload?.id);
    // console.log("LOGS");
    // console.log(payload?.payload?.url);
    if (!processedMessageIds.includes(payload?.id) && phoneNumber!=undefined) {
       processedMessageIds.push(payload?.id);
       //TODO: Taking state here to check the current state.
       console.log(phoneNumber);
       await getState(phoneNumber).then(async(res_)=>{
        if(res_.code==200){
          console.log("Extracting values");
          //console.log(res_.result);
          const WPSession = res_.result.data.WPSession;
          const WPprativedanURL = res_.result.data.WPprativedanURL;
          const WPGyapanId = res_.result.data.WPGyapanId;
          const WPGyapanObjectId = res_.result.data.WPGyapanObjectId;

          if (payload?.type === 'button_reply') {
            await handleButtonReply(payload, phoneNumber, res, WPSession, WPprativedanURL, WPGyapanId, WPGyapanObjectId);
            console.log("Message sent Successfully!!.");  
          }
          if (payload?.payload?.text === 'ग्यापन दिखाएं') {
            await handlePendingGyapanList(payload, res);
          }
          //TODO: Hit API and check here about the session.
          if (WPSession && payload?.payload?.url && WPprativedanURL === "") {
            console.log("Inside the HandleDocumentUpload");
            await handleDocumentUpload(payload, phoneNumber, res, WPSession, WPprativedanURL, WPGyapanId, WPGyapanObjectId);
          }
        }else{
          console.log("Read State service failed to execute with errors.");
        }
      })
      
    }
  } catch (error) {
    console.error("Error processing inbound message:", error);
    res.status(500).send("Error processing message");
  }
};

// Handle button reply logic (Submit, Yes, Resend)
const handleButtonReply = async (payload: any, phoneNumber: string, res: Response,
                             WPSession: string, WPprativedanURL: string, WPGyapanId:string,
                             WPGyapanObjectId: string) => {
  const id = payload.payload.id;
  //TODO: Hit API to check the state and then proceed Whether its/was Yes/No. If its submit then start session.
  switch (payload.payload?.title) {
    case 'Submit':
      await handleSubmitButton(id, phoneNumber, res, WPSession, WPprativedanURL, WPGyapanId, WPGyapanObjectId);
      break;
    case 'हाँ':
      await handleYesButton(phoneNumber, res, WPSession, WPprativedanURL, WPGyapanId, WPGyapanObjectId);
      break;
    case 'पुनः भेजें':
      await handleResendButton(phoneNumber, res, WPSession, WPprativedanURL, WPGyapanId, WPGyapanObjectId);
      break;
    default:
      console.log(`Unknown button reply: ${payload.payload?.title}`);
  }
};

// Handle 'Submit' button click
const handleSubmitButton = async (id: string, phoneNumber: string, res: Response,
  WPSession: string, WPprativedanURL: string, WPGyapanId: string, WPGyapanObjectId: string
) => {

  const updated_state= {
    "phoneNumber": phoneNumber,
    "WPSession": false,
    "WPGyapanId": "",
    "WPGyapanObjectId": "",
    "WPprativedanURL": ""
  }
  //Check CASE ID.
  await pushState(updated_state).then(async(res_)=>{
    if(res_.code==200){
      console.log("Reset of values took place before submit.");
    }else{
      console.log("Read State service failed to execute with errors.");
    }
  })

  if (!WPSession && WPprativedanURL === "") {
    //TODO: Store the gyapan ID here.
    stateManager.addToCurrentGyapanIdInQueue(phoneNumber, id);
    //remove
    store_gyapan_url_and_name[phoneNumber] = [];
    console.log("Pushed Value");
    const gyapanId = stateManager.getCurrentGyapanIdInQueue(phoneNumber)?.split("/")[0];
    const caseId = stateManager.getCurrentGyapanIdInQueue(phoneNumber)?.split("/")[1];
    const gyapanObjId = stateManager.getCurrentGyapanIdInQueue(phoneNumber)?.split("/")[2];

    const updated_state= {
      "phoneNumber": phoneNumber,
      "WPSession": true,
      "WPGyapanId": `${gyapanId}/${caseId}`,
      "WPGyapanObjectId": gyapanObjId,
      "WPprativedanURL": ""
    }
    //Check CASE ID.
    await pushState(updated_state).then(async(res_)=>{
      if(res_.code==200){
       res.status(200).send(`ज्ञापन क्रमांक :- *${gyapanId}*\nकेस क्रमांक :- *${caseId}*\n\n*कृपया उपर्युक्त ज्ञापन का प्रतिवेदन यहां अपलोड करें ।*`);
       // Reset the Gyapan ID for the specific phone number
       stateManager.clearCurrentGyapanIdInQueue(phoneNumber);  // This will clear the session for the phone number
       console.log("Message sent Successfully!!.");
      }else{
        console.log("Read State service failed to execute with errors.");
      }
    })

  }
};

// Handle 'Yes' button click
const handleYesButton = async (phoneNumber: string, res: Response,
  WPSession: string, WPprativedanURL: string, WPGyapanId: string, WPGyapanObjectId: string
) => {
  if (WPGyapanId && WPprativedanURL) {
    const gyapanId = WPGyapanId?.split("/")[0];
    const caseId = WPGyapanId?.split("/")[1];

    if(gyapanId != ""){
      
      await submitPrativedan({
        gyapanId: WPGyapanObjectId,
        prativedanUrl: WPprativedanURL, // [0] for name, [1] for URL
        submittedAt: new Date()
      });
  
        //Mark the submit template as sent for not sending again.
      await markTaskAsCompleted({ gyapanIds: [gyapanId] });
      
      const updated_state= {
        "phoneNumber": phoneNumber,
        "WPSession": false,
        "WPGyapanId": "",
        "WPGyapanObjectId": "",
        "WPprativedanURL": ""
      }
      //Check CASE ID.
      await pushState(updated_state).then(async(res_)=>{
        if(res_.code==200){
          res.status(200).send(`ज्ञापन क्रमांक :- *${gyapanId}*\nकेस क्रमांक :- *${caseId}*\n\n*प्रतिवेदन सफलतापूर्वक सबमिट किया गया।*`);
          console.log("Reset of values done for yes.");
        }else{
          console.log("Read State service failed to execute with errors.");
        }
      })
      
    }

  }
};

// Handle 'Resend' button click
const handleResendButton = async (phoneNumber: string, res: Response,
  WPSession: string, WPprativedanURL: string, WPGyapanId: string, WPGyapanObjectId: string
) => {
  const gyapanId = WPGyapanId?.split("/")[0];
  const caseId = WPGyapanId?.split("/")[1];

  if(gyapanId != ""){
    store_gyapan_url_and_name[phoneNumber] = []; // Reset stored data
    
    const updated_state= {
      "phoneNumber": phoneNumber,
      "WPSession": true,
      "WPGyapanId": WPGyapanId,
      "WPGyapanObjectId": WPGyapanObjectId,
      "WPprativedanURL": ""
    }
    //Check CASE ID.
    await pushState(updated_state).then(async(res_)=>{
      if(res_.code==200){
        res.status(200).send(`ज्ञापन क्रमांक :- *${gyapanId}*\nकेस क्रमांक :- *${caseId}*\n\n*कृपया उपर्युक्त ज्ञापन का प्रतिवेदन यहां अपलोड करें ।*`);
        console.log("Reset of values done for no.");
      }else{
        console.log("Read State service failed to execute with errors.");
      }
    })

  }
};

// Handle pending Gyapan list retrieval
const handlePendingGyapanList = async (payload: any, res: Response) => {
  const result = await getPendingListForBot(`91${payload.sender.dial_code}`);
  if (result.code === 200 && result.result.data.length === 0) {
    res.status(200).send("No pending Gyapan now!!");
  } else {
    console.log("Failed to get pending tasks or tasks found");
  }
};

// Handle document upload
const handleDocumentUpload = async (payload: any, phoneNumber: string, res: Response,
  WPSession: string, WPprativedanURL: string, WPGyapanId: string, WPGyapanObjectId: string
) => {
  const name = payload?.payload?.name;
  const url = payload?.payload?.url;

  const gyapanId = WPGyapanId.split("/")[0];
  const caseId = WPGyapanId.split("/")[1];

  //store_gyapan_url_and_name[phoneNumber].push(name, url);

  const updated_state= {
    "phoneNumber": phoneNumber,
    "WPSession": true,
    "WPGyapanId": WPGyapanId,
    "WPGyapanObjectId": WPGyapanObjectId,
    "WPprativedanURL": url
  }
  console.log(updated_state);
  //Check CASE ID.
  await pushState(updated_state).then(async(res_)=>{
    if(res_.code==200){
     console.log("Saved URL Successfully.");
    }else{
      console.log("Read State service failed to execute with errors.");
    }
  })
  console.log("Phone - ", phoneNumber);
  console.log("url - ", url);
  console.log("to - ", payload?.source);
  const message = buildConfirmationMessage(phoneNumber, url, WPGyapanId, WPGyapanObjectId);

  await sendWhatsAppMessage(payload?.source, message);
};

// Build a message to confirm document upload
const buildConfirmationMessage = (phoneNumber: string, url: string, WPGyapanId: string, WPGyapanObjectId: string) => {
  return {
    content: {
      type: "text",
      text: "मैं इस दस्तावेज़ को भेजने की पुष्टि करता हूँ ?",
      caption: `${WPGyapanId}`,
    },
    type: "quick_reply",
    msgid: `${WPGyapanObjectId}`,
    options: [{ type: "text", title: "हाँ" }, { type: "text", title: "पुनः भेजें" }]
  };
};

// Send WhatsApp message using Gupshup API
const sendWhatsAppMessage = async (to: string, message: any) => {
  try {
    const response = await axios.post(
      "https://api.gupshup.io/sm/api/v1/msg",
      { channel: "whatsapp", source: "919399504804", destination: to, message: JSON.stringify(message), "src.name": sourceName },
      axiosConfig
    );
    console.log("HERERERE");
    console.log(response.headers);
    console.log(response.data);
    return response.data;
  } catch (error) {
    console.error("Error sending WhatsApp message:", error);
    throw error;
  }
};

// Mark message as seen using Gupshup SDK
function markAsSeen(id: any) {
  sdk_read.markMessageAsRead({
    appId: '49a05590-5a1c-42f1-a713-95f14457c1d3',
    msgId: id,
    apikey: clientKey
  }).catch((error: any) => {
    console.error("Failed to mark message as read:", error);
  });
}

// Export the verify function as the default module
export default verify;
