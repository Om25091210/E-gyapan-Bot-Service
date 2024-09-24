"use strict";
// * // This File is used for sending the Marketing template message to users. //
// * // For inactive user we can send only the template message. //
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
dotenv_1.default.config({ path: ".env" });
const clientKey = process.env.APIKEY;
const temp_Id = process.env.TEMPLATEID;
const sendHSM = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        //Iterate over each task in the array and process them
        const results = yield Promise.allSettled(req.body.map((task) => {
            let { assigned_to_phone_number, date_of_task, gyapanId, caseId } = task;
            if (assigned_to_phone_number.length === 10) {
                assigned_to_phone_number = `91${assigned_to_phone_number}`;
            }
            return send_template_msg(assigned_to_phone_number, date_of_task, gyapanId, caseId);
        }));
        // Separate fulfilled and rejected results
        const responses = results
            .filter(result => result.status === 'fulfilled')
            .map(result => result.value);
        const errors = results
            .filter(result => result.status === 'rejected')
            .map(result => result.reason);
        //return send_template_msg("9301982112", new Date("2024-08-29T20:26:46.786+00:00"), "Semankan", "testing");
        res.json({ success: true, data: responses, errors: errors });
    }
    catch (error) {
        console.error("Error in processing messages:", error);
        next(error); // Pass error to Express error handler
    }
});
function send_template_msg(to, date_of_task, gyapanId, caseId) {
    return __awaiter(this, void 0, void 0, function* () {
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
            const response = yield axios_1.default.post("https://api.gupshup.io/wa/api/v1/template/msg", new URLSearchParams(postData).toString(), config);
            console.log(response.data);
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
exports.default = sendHSM;
