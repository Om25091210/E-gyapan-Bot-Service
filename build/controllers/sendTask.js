"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const dotenv_1 = __importDefault(require("dotenv"));
const getState_1 = require("../services/getState");
dotenv_1.default.config({ path: ".env" });
const processedMessageIds = [];
const clientKey = process.env.APIKEY;
//TODO: submit comming two time.
const sendTask = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const tasks = req.body; // Assuming req.body is an array of tasks
        // Process each task in parallel and collect results
        const responses = yield Promise.allSettled(tasks.map((task) => __awaiter(void 0, void 0, void 0, function* () {
            try {
                const state = yield (0, getState_1.getState)(task.phoneNumber);
                if (state.code == 200) {
                    const { WPSession } = state.result.data;
                    if (WPSession) {
                        // Collect the 409 error, but do not send a response yet
                        return { task_id: task.task_id, message: "A Gyapan is currently being processed. Please wait.", status: 409 };
                    }
                    if (!processedMessageIds.includes(task.gyapanId)) {
                        processedMessageIds.push(task.gyapanId);
                        // Send WhatsApp message
                        yield send_session_msg(task.id, task.phoneNumber, task.gyapanId, task.caseId, task.deadline, task.category, task.remark, task.attachment, task.tehsil, task.patwari, task.village);
                        return { task_id: task.task_id, message: "Message sent successfully", status: 200 };
                    }
                    return { task_id: task.task_id, message: "Message already sent", status: 200 };
                }
                else {
                    console.log("Read State service failed.");
                    return { task_id: task.task_id, message: "Failed to get state", status: 500 };
                }
            }
            catch (error) {
                console.error("Error processing task:", error);
                return { task_id: task.task_id, message: "Error in processing", status: 500 };
            }
        })));
        // Send the final response after all tasks are processed
        res.status(200).json({ message: "Gyapan processed successfully", data: responses });
    }
    catch (error) {
        console.error("Error in sending tasks:", error);
        next(error); // Pass error to Express error handler
    }
});
function send_session_msg(id, to, gyapanId, caseId, date_of_task, category, remark, url, tehsil, patwari, village) {
    return __awaiter(this, void 0, void 0, function* () {
        const sourceName = "Egyapaan";
        console.log("The gyapan id sending now is - " + gyapanId + " objID " + id);
        const axiosConfig = {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "apikey": clientKey, // Make sure this is correctly set in your .env file
            },
        };
        const formattedDate = formatTaskDate(date_of_task);
        let message;
        message = {
            "content": {
                "type": "file",
                "url": url,
                "text": `पटवारी नाम : *${patwari}*\nज्ञापन क्रमांक : *${gyapanId}*\nकेस क्रमांक : *${caseId}*\nतहसील : *${tehsil}*\nग्राम : *${village}*\nकार्य प्रकार : *${category}*\nअंतिम जमा तिथि : *${formattedDate}*\n\nकृपया तय समय सीमा के भीतर प्रतिवेदन जमा करें  \n\nरिमार्क : *${remark}*`,
                "filename": "PDF file",
                "caption": `${formattedDate}`,
            },
            "type": "quick_reply",
            "msgid": `${gyapanId}/${caseId}/${id}`,
            "options": [{ "type": "text", "title": "Submit" }]
        };
        if (to.length === 10) {
            to = `91${to}`;
        }
        const postData = {
            channel: "whatsapp",
            source: "919399504804",
            destination: to,
            message: JSON.stringify(message),
            "src.name": sourceName,
        };
        try {
            const response = yield axios_1.default.post("https://api.gupshup.io/sm/api/v1/msg", postData, axiosConfig);
            return response.data; // Return only the data part of the response
        }
        catch (error) {
            throw error;
        }
    });
}
function formatTaskDate(date_of_task) {
    const options = {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    };
    const date = new Date(date_of_task);
    return date.toLocaleDateString('en-US', options);
}
exports.default = sendTask;
