import axios from "axios";
import dotenv from "dotenv";
import moment from 'moment-timezone';
import { Response, Request, NextFunction } from "express";
import { markTaskAsCompleted } from "../services/markTaskCompleted";

dotenv.config({ path: ".env" });

const processedMessageIds: string[] = [];
const clientKey: string = process.env.APIKEY as string;

//TODO: submit comming two time.
const sendTask = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Extract body params
    const tasks = req.body;  // Assuming req.body is an array of tasks

    //Iterate over each task in the array and process them
    const responses = await Promise.all(tasks.map(async (task: any) => {
      console.log("Session msg", task);
      if (!processedMessageIds.includes(task.gyapanId)) {
        //store processed msgs for non repitative msgs.
        processedMessageIds.push(task.gyapanId);
        //Send WhatsApp message if not sent previously
        await send_session_msg(
          task.phoneNumber,
          task.gyapanId,
          task.caseId,
          task.deadline,
          task.category,
          task.remark,
          task.attachment
        );

        // Return some result structure that fits your needs
        return { task_id: task.task_id, message: "Message sent successfully", sent: true };
      }
    }));

    // Return the array of results
    res.status(200).json({ message: "Gyapan processed successfully", data: responses });

  } catch (error) {
    console.error("Error in sending tasks:", error);
    next(error); // Pass error to Express error handler
  }
};


async function send_session_msg(to: string, gyapanId: string, caseId:string, date_of_task: Date, category?: string, remark?: string, url?: string) {
  const sourceName = "Egyapaan";
  console.log("The gyapan id sending now is - "+gyapanId);
  const axiosConfig = {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "apikey": clientKey, // Make sure this is correctly set in your .env file
    },
  };
  const formattedDate = formatTaskDate(date_of_task);
  console.log(formattedDate);
  console.log(url?.includes("pdf"));
  console.log(url);
  let message;
  message={
    "content":{
      "type":"file",
      "url":url,
      "text":`${category} :\n ${remark}`,
      "filename":"PDF file",
      "caption": `${formattedDate}`,
    },
    "type": "quick_reply",
    "msgid": `${gyapanId}/${caseId}`,
    "options": [{ "type": "text", "title": "Submit" }]
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