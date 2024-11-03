import axios from "axios";
import dotenv from "dotenv";
import moment from 'moment-timezone';
import { Response, Request, NextFunction } from "express";
import stateManager from "./stateManager"; // import the singleton state manager
import { getState } from "../services/getState";

dotenv.config({ path: ".env" });

const processedMessageIds: string[] = [];
const clientKey: string = process.env.APIKEY as string;

//TODO: submit comming two time.
const sendTask = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tasks = req.body;  // Assuming req.body is an array of tasks

    // Process each task in parallel and collect results
    const responses = await Promise.allSettled(
      tasks.map(async (task: any) => {
        try {
          const state = await getState(task.phoneNumber);
          if (state.code == 200) {
            const { WPSession } = state.result.data;
            if (WPSession) {
              // Collect the 409 error, but do not send a response yet
              return { task_id: task.task_id, message: "A Gyapan is currently being processed. Please wait.", status: 409 };
            }

            if (!processedMessageIds.includes(task.gyapanId)) {
              processedMessageIds.push(task.gyapanId);

              // Send WhatsApp message
              await send_session_msg(
                task.id, task.phoneNumber, task.gyapanId, task.caseId,
                task.deadline, task.category, task.remark, task.attachment,
                task.tehsil, task.patwari, task.village
              );

              return { task_id: task.task_id, message: "Message sent successfully", status: 200 };
            }

            return { task_id: task.task_id, message: "Message already sent", status: 200 };
          } else {
            console.log("Read State service failed.");
            return { task_id: task.task_id, message: "Failed to get state", status: 500 };
          }
        } catch (error) {
          console.error("Error processing task:", error);
          return { task_id: task.task_id, message: "Error in processing", status: 500 };
        }
      })
    );

    // Send the final response after all tasks are processed
    res.status(200).json({ message: "Gyapan processed successfully", data: responses });
  } catch (error) {
    console.error("Error in sending tasks:", error);
    next(error); // Pass error to Express error handler
  }
};


async function send_session_msg(id: string, to: string, 
                                gyapanId: string, caseId:string,
                                date_of_task: Date, category?: string,
                                remark?: string, url?: string,
                                tehsil?: string, patwari?: string, village?: string ) {
  const sourceName = "Egyapaan";
  console.log("The gyapan id sending now is - "+gyapanId +" objID "+ id);
  const axiosConfig = {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "apikey": clientKey, // Make sure this is correctly set in your .env file
    },
  };
  const formattedDate = formatTaskDate(date_of_task);
  console.log("url");
  console.log(url);
  console.log( url?.includes("png"));
  let message;
  if(url?.includes("pdf")){
    message={
      "content":{
        "type":"file",
        "url":url,
        "text":`पटवारी नाम : *${patwari}*\nज्ञापन क्रमांक : *${gyapanId}*\nकेस क्रमांक : *${caseId}*\nतहसील : *${tehsil}*\nग्राम : *${village}*\nकार्य प्रकार : *${category}*\nअंतिम जमा तिथि : *${formattedDate}*\n\nकृपया तय समय सीमा के भीतर प्रतिवेदन जमा करें  \n\nरिमार्क : *${remark}*`,
        "filename":"PDF file",
        "caption": `${formattedDate}`,
      },
      "type": "quick_reply",
      "msgid": `${gyapanId}/${caseId}/${id}`,
      "options": [{ "type": "text", "title": "Submit" }]
    }
  }else if(url?.includes("jpg") || url?.includes("png") || url?.includes("jpeg")){
    message={
      "content":{
        "type":"image",
        "url":url,
        "text":`पटवारी नाम : *${patwari}*\nज्ञापन क्रमांक : *${gyapanId}*\nकेस क्रमांक : *${caseId}*\nतहसील : *${tehsil}*\nग्राम : *${village}*\nकार्य प्रकार : *${category}*\nअंतिम जमा तिथि : *${formattedDate}*\n\nकृपया तय समय सीमा के भीतर प्रतिवेदन जमा करें  \n\nरिमार्क : *${remark}*`,
        "filename":"PDF file",
        "caption": `${formattedDate}`,
      },
      "type": "quick_reply",
      "msgid": `${gyapanId}/${caseId}/${id}`,
      "options": [{ "type": "text", "title": "Submit" }]
    }
  }
  
  

  if (to.length === 10) {
      to = `91${to}`;
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
    return response.data; // Return only the data part of the response
  } catch (error) {
    throw error;
  }
}

function formatTaskDate(date_of_task: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',  // Changed from 'short' to 'long' for full day name
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  };

  const date = new Date(date_of_task);
  return date.toLocaleDateString('en-US', options);
}

export default sendTask;