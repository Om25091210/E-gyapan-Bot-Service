// * // This File is used for sending the Marketing template message to users. //
// * // For inactive user we can send only the template message. //

import axios from "axios";
import dotenv from "dotenv";
import moment from 'moment-timezone';
import { Response, Request, NextFunction } from "express";
import { getAllOptInUsers } from "./Check_User_Opt_In";
import ask_consent from "./Ask_consent";

dotenv.config({ path: ".env" });

const clientKey: string = process.env.APIKEY as string;
const temp_Id: string = process.env.TEMPLATEID as string;

const sendHSM = async (req: Request, res: Response, next: NextFunction) => {
    try {
        //Iterate over each task in the array and process them
        const results = await Promise.allSettled(req.body.map((task: any) => {
            let { assigned_to_phone_number, date_of_task, gyapanId, caseId } = task;
            if (assigned_to_phone_number.length === 10) {
                assigned_to_phone_number = `91${assigned_to_phone_number}`;
            }
            return send_template_msg(assigned_to_phone_number, date_of_task, gyapanId, caseId);
        }));

        // Separate fulfilled and rejected results
        const responses = results
            .filter(result => result.status === 'fulfilled')
            .map(result => (result as PromiseFulfilledResult<any>).value);

        const errors = results
            .filter(result => result.status === 'rejected')
            .map(result => (result as PromiseRejectedResult).reason);

        //return send_template_msg("9301982112", new Date("2024-08-29T20:26:46.786+00:00"), "Semankan", "testing");
        res.json({ success: true, data: responses, errors: errors });

    } catch (error) {
        console.error("Error in processing messages:", error);
        next(error);  // Pass error to Express error handler
    }
};


async function send_template_msg(to: string, date_of_task: Date, gyapanId?: string, caseId?: string) {
    const sourceName = "Egyapaan"; // App name
    const source = "919399504804"; // Example source number, replace with actual if different
    const templateId = temp_Id; // Replace with your actual template ID
    //const formattedDate = formatTaskDate(date_of_task);
    console.log(temp_Id);
    const formattedDate = formatTaskDate(date_of_task);
    const postData = {
        channel: "whatsapp",
        source: source,
        destination: to,
        "src.name": sourceName,
        template: JSON.stringify({
            id: templateId,
            params: [gyapanId, caseId, formattedDate],
        }),
    };

    const config = {
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "apikey": clientKey,
            "accept": "application/json"
        }
    };

    try {
        const response = await axios.post(
            "https://api.gupshup.io/wa/api/v1/template/msg",
            new URLSearchParams(postData).toString(),
            config
        );
        console.log(response.data);
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

export default sendHSM;
