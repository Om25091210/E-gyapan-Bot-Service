// Verify_webhook.ts (patched)
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
  try {
    const payload = req.body?.payload;
    const phoneNumber = payload?.source;

    // Immediately acknowledge the webhook (so sender doesn't retry).
    // After this point, do NOT attempt to send further HTTP responses for this request.
    res.status(200).send("");

    // If there is nothing to process, just return
    if (!payload) {
      console.log("No payload in request body. Acknowledged.");
      return;
    }

    // If sandbox-start event, just log and return (we already ack'd).
    if (payload.type === "sandbox-start") {
      console.log("Received sandbox-start event. Acknowledged and returning.");
      return;
    }

    // Process message asynchronously — do not use `res` inside processing.
    // Any errors here should be logged but must NOT attempt to re-send HTTP response.
    handleMessageProcessing(payload, phoneNumber).catch(err => {
      console.error("Unhandled error during async message processing:", err);
    });

  } catch (err) {
    // If something goes wrong before we sent the response, try to send 500.
    console.error("Error in verify():", err);
    if (!res.headersSent) {
      res.status(500).send("Internal server error");
    }
  }
};

// Main handler for message processing (no res parameter)
const handleMessageProcessing = async (payload: any, phoneNumber: string | undefined) => {
  try {
    // Defensive: ensure we have payload and id
    if (!payload || !payload.id) {
      console.log("Invalid payload or missing id. Skipping.");
      return;
    }

    markAsSeen(payload.id);

    if (!processedMessageIds.includes(payload.id) && phoneNumber !== undefined) {
      processedMessageIds.push(payload.id);
      console.log("Processing message from:", phoneNumber);

      const greetings = ["hi", "hii", "hello"];
      const lowerText = payload.payload?.text?.toLowerCase?.() || "";

      if (greetings.includes(lowerText)) {
        await resetDBDetails(phoneNumber);
        await handlePendingGyapanList(payload, phoneNumber, lowerText);
        return;
      }

      const stateRes = await getState(phoneNumber);
      if (stateRes?.code !== 200) {
        console.log("Read State service failed to execute with errors.");
        return;
      }

      console.log("Extracting values");
      const WPSession = stateRes.result.data.WPSession;
      const WPprativedanURL = stateRes.result.data.WPprativedanURL;
      const WPGyapanId = stateRes.result.data.WPGyapanId;
      const WPGyapanObjectId = stateRes.result.data.WPGyapanObjectId;

      if (payload?.type === 'button_reply') {
        await handleButtonReply(payload, phoneNumber, WPSession, WPprativedanURL, WPGyapanId, WPGyapanObjectId);
        console.log("Button-reply handled.");
        return;
      }

      if (payload?.payload?.text === 'ग्यापन दिखाएं') {
        await handlePendingGyapanList(payload, phoneNumber, "text");
        return;
      }

      if (WPSession && payload?.payload?.url && WPprativedanURL === "") {
        console.log("Inside the HandleDocumentUpload");
        await handleDocumentUpload(payload, phoneNumber, WPSession, WPprativedanURL, WPGyapanId, WPGyapanObjectId);
        return;
      }
    }
  } catch (error) {
    // Log but DO NOT attempt to write to `res` — we've already acknowledged.
    console.error("Error processing inbound message:", error);
  }
};

/* ---------------- Helper functions below — adapted to avoid using `res` ---------------- */

const resetDBDetails = async (phoneNumber: string) =>{
  const updated_state= {
    "phoneNumber": phoneNumber,
    "WPSession": false,
    "WPGyapanId": "",
    "WPGyapanObjectId": "",
    "WPprativedanURL": ""
  };
  try {
    const res_ = await pushState(updated_state);
    if(res_.code==200){
      console.log("Reset of values took place before submit.");
    } else {
      console.log("Read State service failed to execute with errors.");
    }
  } catch (err) {
    console.error("Error in resetDBDetails:", err);
  }
};

const handleButtonReply = async (payload: any, phoneNumber: string,
  WPSession: string, WPprativedanURL: string, WPGyapanId:string, WPGyapanObjectId: string) => {
  const id = payload.payload.id;
  switch (payload.payload?.title) {
    case 'Submit':
      await handleSubmitButton(id, phoneNumber, WPSession, WPprativedanURL, WPGyapanId, WPGyapanObjectId);
      break;
    case 'हाँ':
      await handleYesButton(phoneNumber, WPSession, WPprativedanURL, WPGyapanId, WPGyapanObjectId);
      break;
    case 'पुनः भेजें':
      await handleResendButton(phoneNumber, WPSession, WPprativedanURL, WPGyapanId, WPGyapanObjectId);
      break;
    default:
      console.log(`Unknown button reply: ${payload.payload?.title}`);
  }
};

const handleSubmitButton = async (id: string, phoneNumber: string,
  WPSession: string, WPprativedanURL: string, WPGyapanId: string, WPGyapanObjectId: string
) => {
  await resetDBDetails(phoneNumber);

  if (!WPSession && WPprativedanURL === "") {
    stateManager.addToCurrentGyapanIdInQueue(phoneNumber, id);
    store_gyapan_url_and_name[phoneNumber] = [];
    console.log("Pushed Value!!!!!");
    const queued = stateManager.getCurrentGyapanIdInQueue(phoneNumber) || "";
    const gyapanId = queued.split("/")[0];
    const caseId = queued.split("/")[1];
    const gyapanObjId = queued.split("/")[2];

    const updated_state= {
      "phoneNumber": phoneNumber,
      "WPSession": true,
      "WPGyapanId": `${gyapanId}/${caseId}`,
      "WPGyapanObjectId": gyapanObjId,
      "WPprativedanURL": ""
    };

    try {
      const res_ = await pushState(updated_state);
      if(res_.code==200){
        console.log("Pushed Value thrice here!!!!!");
        const message = `ज्ञापन क्रमांक :- *${gyapanId}*\nकेस क्रमांक :- *${caseId}*\n\n*कृपया उपर्युक्त ज्ञापन का प्रतिवेदन यहां अपलोड करें ।*`;
        await sendWhatsAppMessage(phoneNumber, {
          type: "text",
          text: message
        });
        stateManager.clearCurrentGyapanIdInQueue(phoneNumber);
        console.log("Message sent Successfully!!.");
      } else {
        console.log("Read State service failed to execute with errors.");
      }
    } catch (err) {
      console.error("Error pushing state in handleSubmitButton:", err);
    }
  }
};

const handleYesButton = async (phoneNumber: string,
  WPSession: string, WPprativedanURL: string, WPGyapanId: string, WPGyapanObjectId: string
) => {
  if (WPGyapanId && WPprativedanURL) {
    const gyapanId = WPGyapanId?.split("/")[0];
    const caseId = WPGyapanId?.split("/")[1];

    if(gyapanId != ""){
      try {
        await submitPrativedan({
          gyapanId: WPGyapanObjectId,
          prativedanUrl: WPprativedanURL,
          submittedAt: new Date()
        });
        await markTaskAsCompleted({ gyapanIds: [gyapanId] });
        const updated_state= {
          "phoneNumber": phoneNumber,
          "WPSession": false,
          "WPGyapanId": "",
          "WPGyapanObjectId": "",
          "WPprativedanURL": ""
        };
        const res_ = await pushState(updated_state);
        if(res_.code==200){
          const message = `ज्ञापन क्रमांक :- *${gyapanId}*\n\nकेस क्रमांक :- *${caseId}*\n\n*प्रतिवेदन सफलतापूर्वक सबमिट किया गया।*`;
          await sendWhatsAppMessage(phoneNumber,  {
            type: "text",
            text: message
          });
          console.log("Reset of values done for yes.");
        } else {
          console.log("Read State service failed to execute with errors.");
        }
      } catch (err) {
        console.error("Error in handleYesButton:", err);
      }
    }
  }
};

const handleResendButton = async (phoneNumber: string,
  WPSession: string, WPprativedanURL: string, WPGyapanId: string, WPGyapanObjectId: string
) => {
  const gyapanId = WPGyapanId?.split("/")[0];
  const caseId = WPGyapanId?.split("/")[1];

  if(gyapanId != ""){
    store_gyapan_url_and_name[phoneNumber] = [];
    const updated_state= {
      "phoneNumber": phoneNumber,
      "WPSession": true,
      "WPGyapanId": WPGyapanId,
      "WPGyapanObjectId": WPGyapanObjectId,
      "WPprativedanURL": ""
    };
    try {
      const res_ = await pushState(updated_state);
      if(res_.code==200){
        const message = `ज्ञापन क्रमांक :- *${gyapanId}*\n\nकेस क्रमांक :- *${caseId}*\n\n*कृपया उपर्युक्त ज्ञापन का प्रतिवेदन यहां अपलोड करें ।*`;
        await sendWhatsAppMessage(phoneNumber,  {
            type: "text",
            text: message
          });
        console.log("Reset of values done for resend.");
      } else {
        console.log("Read State service failed to execute with errors.");
      }
    } catch (err) {
      console.error("Error in handleResendButton:", err);
    }
  }
};

const handlePendingGyapanList = async (payload: any, phoneNumber: string, msg: string) => {
  try {
    const result = await getPendingListForBot(`91${payload.sender.dial_code}`, msg);
    if (result.code === 200 && result.result.data.length === 0) {
      const message = `अब कोई लंबित ज्ञापन नहीं है!!`;
      await sendWhatsAppMessage(phoneNumber, message);
    } else {
      console.log("Pending tasks found or failure: ", result);
    }
  } catch (err) {
    console.error("Error in handlePendingGyapanList:", err);
  }
};

const handleDocumentUpload = async (payload: any, phoneNumber: string,
  WPSession: string, WPprativedanURL: string, WPGyapanId: string, WPGyapanObjectId: string
) => {
  try {
    const name = payload?.payload?.name;
    const url = payload?.payload?.url;
    const gyapanId = WPGyapanId.split("/")[0];
    const caseId = WPGyapanId.split("/")[1];

    const updated_state= {
      "phoneNumber": phoneNumber,
      "WPSession": true,
      "WPGyapanId": WPGyapanId,
      "WPGyapanObjectId": WPGyapanObjectId,
      "WPprativedanURL": url
    };
    const res_ = await pushState(updated_state);
    if(res_.code==200){
     console.log("Saved URL Successfully.");
    } else {
      console.log("Read State service failed to execute with errors.");
    }
    const message = buildConfirmationMessage(phoneNumber, url, WPGyapanId, WPGyapanObjectId);
    await sendWhatsAppMessage(payload?.source, message);
  } catch (err) {
    console.error("Error in handleDocumentUpload:", err);
  }
};

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
    const payload = {
      channel: "whatsapp",
      source: "919399504804",
      destination: to,
      message: JSON.stringify(message),
      "src.name": sourceName
    };

    const response = await axios.post("https://api.gupshup.io/sm/api/v1/msg", payload, axiosConfig);

    // Defensive: the API might return text in some errors, log body raw if not JSON
    if (response && response.data) {
      console.log("Gupshup response data:", response.data);
    } else {
      console.log("Gupshup response status:", response.status, response.statusText);
    }
    return response.data;
  } catch (error: any) {
    // If the response body is non-json, log body text (axios exposes it on error.response).
    if (error?.response) {
      try {
        console.error("Gupshup error response:", error.response.status, error.response.data);
      } catch (e) {
        console.error("Gupshup unknown error response body:", error.response);
      }
    } else {
      console.error("Error sending WhatsApp message:", error);
    }
    // Do not rethrow if this would cause another response to be sent to the original webhook.
    // The caller can decide to retry if necessary.
    return null;
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

export default verify;
