import express, { Response, Request, NextFunction } from "express";
import msgData from "../interfaces/msgData";
import transcribeAudioFromURL from "./transcription";
import axios from "axios";
import { submitPrativedan } from '../services/submitPrativedan';
import { getAllOptInUsers } from "./Check_User_Opt_In";
import { getPendingListForBot } from "../services/pendingListForBot";
import { markTaskAsCompleted } from "../services/markTaskCompleted";
import stateManager from "./stateManager"; // Singleton state manager

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
  const phoneNumber = payload?.source;

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
    console.log("LOGS");
    console.log(stateManager.isGyapanInQueue(phoneNumber));
    console.log(store_gyapan_url_and_name[phoneNumber]?.length);
    console.log(payload?.payload?.url);
    if (!processedMessageIds.includes(payload?.id)) {
      processedMessageIds.push(payload?.id);
      if (payload?.type === 'button_reply') {
        await handleButtonReply(payload, phoneNumber, res);
      }
      if (payload?.payload?.text === 'ग्यापन दिखाएं') {
        await handlePendingGyapanList(payload, res);
      }
      if (stateManager.isGyapanInQueue(phoneNumber) && payload?.payload?.url && store_gyapan_url_and_name[phoneNumber]?.length === 0) {
        await handleDocumentUpload(payload, phoneNumber, res);
      }
    }
  } catch (error) {
    console.error("Error processing inbound message:", error);
    res.status(500).send("Error processing message");
  }
};

// Handle button reply logic (Submit, Yes, Resend)
const handleButtonReply = async (payload: any, phoneNumber: string, res: Response) => {
  const id = payload.payload.id;

  switch (payload.payload?.title) {
    case 'Submit':
      await handleSubmitButton(id, phoneNumber, res);
      break;
    case 'हाँ':
      await handleYesButton(phoneNumber, res);
      break;
    case 'पुनः भेजें':
      await handleResendButton(phoneNumber, res);
      break;
    default:
      console.log(`Unknown button reply: ${payload.payload?.title}`);
  }
};

// Handle 'Submit' button click
const handleSubmitButton = async (id: string, phoneNumber: string, res: Response) => {
  if (!stateManager.isGyapanInQueue(phoneNumber)) {
    stateManager.addToCurrentGyapanIdInQueue(phoneNumber, id);
    store_gyapan_url_and_name[phoneNumber] = [];
    console.log("Pushed Value");
    console.log(stateManager.getCurrentGyapanIdInQueue(phoneNumber));
    const gyapanId = stateManager.getCurrentGyapanIdInQueue(phoneNumber)?.split("/")[0];
    const caseId = stateManager.getCurrentGyapanIdInQueue(phoneNumber)?.split("/")[1];

    res.status(200).send(`ज्ञापन क्रमांक :- *${gyapanId}*\nकेस क्रमांक :- *${caseId}*\n\n*कृपया उपर्युक्त ज्ञापन का प्रतिवेदन यहां अपलोड करें ।*`);
  }
};

// Handle 'Yes' button click
const handleYesButton = async (phoneNumber: string, res: Response) => {
  if (stateManager.isGyapanInQueue(phoneNumber) && store_gyapan_url_and_name[phoneNumber].length != 0) {
    const gyapanId = stateManager.getCurrentGyapanIdInQueue(phoneNumber)?.split("/")[0];
    const caseId = stateManager.getCurrentGyapanIdInQueue(phoneNumber)?.split("/")[1];
    const gyapanObjId = stateManager.getCurrentGyapanIdInQueue(phoneNumber)?.split("/")[2];
    
    if(gyapanId != "0"){
      
      await submitPrativedan({
        gyapanId: gyapanObjId,
        prativedanUrl: store_gyapan_url_and_name[phoneNumber][1], // [0] for name, [1] for URL
        submittedAt: new Date()
      });
  
      stateManager.clearCurrentGyapanIdInQueue(phoneNumber);
      store_gyapan_url_and_name[phoneNumber] = [];
      res.status(200).send(`ज्ञापन क्रमांक :- *${gyapanId}*\nकेस क्रमांक :- *${caseId}*\n\n*प्रतिवेदन सफलतापूर्वक सबमिट किया गया।*`);
    }

  }
};

// Handle 'Resend' button click
const handleResendButton = (phoneNumber: string, res: Response) => {
  const gyapanId = stateManager.getCurrentGyapanIdInQueue(phoneNumber)?.split("/")[0];
  const caseId = stateManager.getCurrentGyapanIdInQueue(phoneNumber)?.split("/")[1];

  if(gyapanId != "0"){
    store_gyapan_url_and_name[phoneNumber] = []; // Reset stored data
    console.log(`store_gyapan_url_and_name reset for ${phoneNumber}`);
    res.status(200).send(`ज्ञापन क्रमांक :- *${gyapanId}*\nकेस क्रमांक :- *${caseId}*\n\n*कृपया उपर्युक्त ज्ञापन का प्रतिवेदन यहां अपलोड करें ।*`);
  }

};

// Handle pending Gyapan list retrieval
const handlePendingGyapanList = async (payload: any, res: Response) => {
  const result = await getPendingListForBot(payload.sender.dial_code);
  if (result.code === 200 && result.result.data.length === 0) {
    res.status(200).send("No pending Gyapan now!!");
  } else {
    console.log("Failed to get pending tasks or tasks found");
  }
};

// Handle document upload
const handleDocumentUpload = async (payload: any, phoneNumber: string, res: Response) => {
  const name = payload?.payload?.name;
  const url = payload?.payload?.url;

  store_gyapan_url_and_name[phoneNumber].push(name, url);
  const message = buildConfirmationMessage(phoneNumber, url);

  await sendWhatsAppMessage(payload?.source, message);
};

// Build a message to confirm document upload
const buildConfirmationMessage = (phoneNumber: string, url: string) => {
  return {
    content: {
      type: "file",
      url: url,
      text: "मैं इस दस्तावेज़ को भेजने की पुष्टि करता हूँ ?",
      filename: "PDF file",
      caption: `${stateManager.getCurrentGyapanIdInQueue(phoneNumber)}`,
    },
    type: "quick_reply",
    msgid: `${stateManager.getCurrentGyapanIdInQueue(phoneNumber)}`,
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
