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
const submitPrativedan_1 = require("../services/submitPrativedan");
const pendingListForBot_1 = require("../services/pendingListForBot");
const stateManager_1 = __importDefault(require("./stateManager")); // Singleton state manager
const sdk = require("api")("@gupshup/v1.0#ezpvim9lcyhvffa");
const sdk_read = require('api')('@gupshup/v1.0#52yl2v10lk9hvls9');
require("dotenv").config();
const processedMessageIds = [];
const store_gyapan_url_and_name = {}; // Map to store per-user data
const clientKey = process.env.APIKEY;
const sourceName = "Egyapaan";
// Axios configuration for Gupshup API
const axiosConfig = {
    headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "apikey": clientKey,
    },
};
// Main webhook verification function
const verify = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const payload = req.body.payload;
    const phoneNumber = payload === null || payload === void 0 ? void 0 : payload.source;
    if (payload && payload.type === "sandbox-start") {
        acknowledgeSandboxStart(res);
    }
    else {
        yield handleMessageProcessing(payload, phoneNumber, res);
    }
});
// Acknowledge sandbox start event
const acknowledgeSandboxStart = (res) => {
    res.status(200).send("");
    setTimeout(() => console.log("Acknowledged receipt of sandbox-start event"), 500);
};
// Main handler for message processing
const handleMessageProcessing = (payload, phoneNumber, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        markAsSeen(payload === null || payload === void 0 ? void 0 : payload.id);
        if (!processedMessageIds.includes(payload === null || payload === void 0 ? void 0 : payload.id)) {
            processedMessageIds.push(payload === null || payload === void 0 ? void 0 : payload.id);
            if ((payload === null || payload === void 0 ? void 0 : payload.type) === 'button_reply') {
                yield handleButtonReply(payload, phoneNumber, res);
            }
            if (((_a = payload === null || payload === void 0 ? void 0 : payload.payload) === null || _a === void 0 ? void 0 : _a.text) === 'ग्यापन दिखाएं') {
                yield handlePendingGyapanList(payload, res);
            }
            if (stateManager_1.default.isGyapanInQueue(phoneNumber) && ((_b = payload === null || payload === void 0 ? void 0 : payload.payload) === null || _b === void 0 ? void 0 : _b.url) && ((_c = store_gyapan_url_and_name[phoneNumber]) === null || _c === void 0 ? void 0 : _c.length) === 0) {
                yield handleDocumentUpload(payload, phoneNumber, res);
            }
        }
    }
    catch (error) {
        console.error("Error processing inbound message:", error);
        res.status(500).send("Error processing message");
    }
});
// Handle button reply logic (Submit, Yes, Resend)
const handleButtonReply = (payload, phoneNumber, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _d, _e;
    const id = payload.payload.id;
    switch ((_d = payload.payload) === null || _d === void 0 ? void 0 : _d.title) {
        case 'Submit':
            yield handleSubmitButton(id, phoneNumber, res);
            break;
        case 'हाँ':
            yield handleYesButton(phoneNumber, res);
            break;
        case 'पुनः भेजें':
            yield handleResendButton(phoneNumber, res);
            break;
        default:
            console.log(`Unknown button reply: ${(_e = payload.payload) === null || _e === void 0 ? void 0 : _e.title}`);
    }
});
// Handle 'Submit' button click
const handleSubmitButton = (id, phoneNumber, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _f, _g;
    if (!stateManager_1.default.isGyapanInQueue(phoneNumber)) {
        stateManager_1.default.addToCurrentGyapanIdInQueue(phoneNumber, id);
        store_gyapan_url_and_name[phoneNumber] = [];
        const gyapanId = (_f = stateManager_1.default.getCurrentGyapanIdInQueue(phoneNumber)) === null || _f === void 0 ? void 0 : _f.split("/")[0];
        const caseId = (_g = stateManager_1.default.getCurrentGyapanIdInQueue(phoneNumber)) === null || _g === void 0 ? void 0 : _g.split("/")[1];
        res.status(200).send(`ज्ञापन क्रमांक :- *${gyapanId}*\nकेस क्रमांक :- *${caseId}*\n\n*कृपया उपर्युक्त ज्ञापन का प्रतिवेदन यहां अपलोड करें ।*`);
    }
});
// Handle 'Yes' button click
const handleYesButton = (phoneNumber, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _h, _j, _k;
    if (stateManager_1.default.isGyapanInQueue(phoneNumber) && store_gyapan_url_and_name[phoneNumber].length != 0) {
        const gyapanId = (_h = stateManager_1.default.getCurrentGyapanIdInQueue(phoneNumber)) === null || _h === void 0 ? void 0 : _h.split("/")[0];
        const caseId = (_j = stateManager_1.default.getCurrentGyapanIdInQueue(phoneNumber)) === null || _j === void 0 ? void 0 : _j.split("/")[1];
        const gyapanObjId = (_k = stateManager_1.default.getCurrentGyapanIdInQueue(phoneNumber)) === null || _k === void 0 ? void 0 : _k.split("/")[2];
        if (gyapanId != "0") {
            yield (0, submitPrativedan_1.submitPrativedan)({
                gyapanId: gyapanObjId,
                prativedanUrl: store_gyapan_url_and_name[phoneNumber][1],
                submittedAt: new Date()
            });
            stateManager_1.default.clearCurrentGyapanIdInQueue(phoneNumber);
            store_gyapan_url_and_name[phoneNumber] = [];
            res.status(200).send(`ज्ञापन क्रमांक :- *${gyapanId}*\nकेस क्रमांक :- *${caseId}*\n\n*प्रतिवेदन सफलतापूर्वक सबमिट किया गया।*`);
        }
    }
});
// Handle 'Resend' button click
const handleResendButton = (phoneNumber, res) => {
    var _a, _b;
    const gyapanId = (_a = stateManager_1.default.getCurrentGyapanIdInQueue(phoneNumber)) === null || _a === void 0 ? void 0 : _a.split("/")[0];
    const caseId = (_b = stateManager_1.default.getCurrentGyapanIdInQueue(phoneNumber)) === null || _b === void 0 ? void 0 : _b.split("/")[1];
    if (gyapanId != "0") {
        store_gyapan_url_and_name[phoneNumber] = []; // Reset stored data
        console.log(`store_gyapan_url_and_name reset for ${phoneNumber}`);
        res.status(200).send(`ज्ञापन क्रमांक :- *${gyapanId}*\nकेस क्रमांक :- *${caseId}*\n\n*कृपया उपर्युक्त ज्ञापन का प्रतिवेदन यहां अपलोड करें ।*`);
    }
};
// Handle pending Gyapan list retrieval
const handlePendingGyapanList = (payload, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield (0, pendingListForBot_1.getPendingListForBot)(payload.sender.dial_code);
    if (result.code === 200 && result.result.data.length === 0) {
        res.status(200).send("No pending Gyapan now!!");
    }
    else {
        console.log("Failed to get pending tasks or tasks found");
    }
});
// Handle document upload
const handleDocumentUpload = (payload, phoneNumber, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _l, _m;
    const name = (_l = payload === null || payload === void 0 ? void 0 : payload.payload) === null || _l === void 0 ? void 0 : _l.name;
    const url = (_m = payload === null || payload === void 0 ? void 0 : payload.payload) === null || _m === void 0 ? void 0 : _m.url;
    store_gyapan_url_and_name[phoneNumber].push(name, url);
    const message = buildConfirmationMessage(phoneNumber, url);
    yield sendWhatsAppMessage(payload === null || payload === void 0 ? void 0 : payload.source, message);
});
// Build a message to confirm document upload
const buildConfirmationMessage = (phoneNumber, url) => {
    return {
        content: {
            type: "file",
            url: url,
            text: "मैं इस दस्तावेज़ को भेजने की पुष्टि करता हूँ ?",
            filename: "PDF file",
            caption: `${stateManager_1.default.getCurrentGyapanIdInQueue(phoneNumber)}`,
        },
        type: "quick_reply",
        msgid: `${stateManager_1.default.getCurrentGyapanIdInQueue(phoneNumber)}`,
        options: [{ type: "text", title: "हाँ" }, { type: "text", title: "पुनः भेजें" }]
    };
};
// Send WhatsApp message using Gupshup API
const sendWhatsAppMessage = (to, message) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const response = yield axios_1.default.post("https://api.gupshup.io/sm/api/v1/msg", { channel: "whatsapp", source: "919399504804", destination: to, message: JSON.stringify(message), "src.name": sourceName }, axiosConfig);
        return response.data;
    }
    catch (error) {
        console.error("Error sending WhatsApp message:", error);
        throw error;
    }
});
// Mark message as seen using Gupshup SDK
function markAsSeen(id) {
    sdk_read.markMessageAsRead({
        appId: '49a05590-5a1c-42f1-a713-95f14457c1d3',
        msgId: id,
        apikey: clientKey
    }).catch((error) => {
        console.error("Failed to mark message as read:", error);
    });
}
// Export the verify function as the default module
exports.default = verify;
