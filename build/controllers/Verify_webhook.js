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
const markTaskCompleted_1 = require("../services/markTaskCompleted");
const stateManager_1 = __importDefault(require("./stateManager")); // Singleton state manager
const getState_1 = require("../services/getState");
const pushState_1 = require("../services/pushState");
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
    //console.log(payload);
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
    try {
        markAsSeen(payload === null || payload === void 0 ? void 0 : payload.id);
        // console.log("LOGS");
        // console.log(payload?.payload?.url);
        if (!processedMessageIds.includes(payload === null || payload === void 0 ? void 0 : payload.id) && phoneNumber != undefined) {
            processedMessageIds.push(payload === null || payload === void 0 ? void 0 : payload.id);
            //TODO: Taking state here to check the current state.
            console.log(phoneNumber);
            yield (0, getState_1.getState)(phoneNumber).then((res_) => __awaiter(void 0, void 0, void 0, function* () {
                var _a, _b;
                if (res_.code == 200) {
                    console.log("Extracting values");
                    //console.log(res_.result);
                    const WPSession = res_.result.data.WPSession;
                    const WPprativedanURL = res_.result.data.WPprativedanURL;
                    const WPGyapanId = res_.result.data.WPGyapanId;
                    const WPGyapanObjectId = res_.result.data.WPGyapanObjectId;
                    if ((payload === null || payload === void 0 ? void 0 : payload.type) === 'button_reply') {
                        yield handleButtonReply(payload, phoneNumber, res, WPSession, WPprativedanURL, WPGyapanId, WPGyapanObjectId);
                        console.log("Message sent Successfully!!.");
                    }
                    if (((_a = payload === null || payload === void 0 ? void 0 : payload.payload) === null || _a === void 0 ? void 0 : _a.text) === 'ग्यापन दिखाएं') {
                        yield handlePendingGyapanList(payload, res);
                    }
                    //TODO: Hit API and check here about the session.
                    if (WPSession && ((_b = payload === null || payload === void 0 ? void 0 : payload.payload) === null || _b === void 0 ? void 0 : _b.url) && WPprativedanURL === "") {
                        console.log("Inside the HandleDocumentUpload");
                        yield handleDocumentUpload(payload, phoneNumber, res, WPSession, WPprativedanURL, WPGyapanId, WPGyapanObjectId);
                    }
                }
                else {
                    console.log("Read State service failed to execute with errors.");
                }
            }));
        }
    }
    catch (error) {
        console.error("Error processing inbound message:", error);
        res.status(500).send("Error processing message");
    }
});
// Handle button reply logic (Submit, Yes, Resend)
const handleButtonReply = (payload, phoneNumber, res, WPSession, WPprativedanURL, WPGyapanId, WPGyapanObjectId) => __awaiter(void 0, void 0, void 0, function* () {
    var _c, _d;
    const id = payload.payload.id;
    //TODO: Hit API to check the state and then proceed Whether its/was Yes/No. If its submit then start session.
    switch ((_c = payload.payload) === null || _c === void 0 ? void 0 : _c.title) {
        case 'Submit':
            yield handleSubmitButton(id, phoneNumber, res, WPSession, WPprativedanURL, WPGyapanId, WPGyapanObjectId);
            break;
        case 'हाँ':
            yield handleYesButton(phoneNumber, res, WPSession, WPprativedanURL, WPGyapanId, WPGyapanObjectId);
            break;
        case 'पुनः भेजें':
            yield handleResendButton(phoneNumber, res, WPSession, WPprativedanURL, WPGyapanId, WPGyapanObjectId);
            break;
        default:
            console.log(`Unknown button reply: ${(_d = payload.payload) === null || _d === void 0 ? void 0 : _d.title}`);
    }
});
// Handle 'Submit' button click
const handleSubmitButton = (id, phoneNumber, res, WPSession, WPprativedanURL, WPGyapanId, WPGyapanObjectId) => __awaiter(void 0, void 0, void 0, function* () {
    var _e, _f, _g;
    const updated_state = {
        "phoneNumber": phoneNumber,
        "WPSession": false,
        "WPGyapanId": "",
        "WPGyapanObjectId": "",
        "WPprativedanURL": ""
    };
    //Check CASE ID.
    yield (0, pushState_1.pushState)(updated_state).then((res_) => __awaiter(void 0, void 0, void 0, function* () {
        if (res_.code == 200) {
            console.log("Reset of values took place before submit.");
        }
        else {
            console.log("Read State service failed to execute with errors.");
        }
    }));
    if (!WPSession && WPprativedanURL === "") {
        //TODO: Store the gyapan ID here.
        stateManager_1.default.addToCurrentGyapanIdInQueue(phoneNumber, id);
        //remove
        store_gyapan_url_and_name[phoneNumber] = [];
        console.log("Pushed Value");
        const gyapanId = (_e = stateManager_1.default.getCurrentGyapanIdInQueue(phoneNumber)) === null || _e === void 0 ? void 0 : _e.split("/")[0];
        const caseId = (_f = stateManager_1.default.getCurrentGyapanIdInQueue(phoneNumber)) === null || _f === void 0 ? void 0 : _f.split("/")[1];
        const gyapanObjId = (_g = stateManager_1.default.getCurrentGyapanIdInQueue(phoneNumber)) === null || _g === void 0 ? void 0 : _g.split("/")[2];
        const updated_state = {
            "phoneNumber": phoneNumber,
            "WPSession": true,
            "WPGyapanId": `${gyapanId}/${caseId}`,
            "WPGyapanObjectId": gyapanObjId,
            "WPprativedanURL": ""
        };
        //Check CASE ID.
        yield (0, pushState_1.pushState)(updated_state).then((res_) => __awaiter(void 0, void 0, void 0, function* () {
            if (res_.code == 200) {
                res.status(200).send(`ज्ञापन क्रमांक :- *${gyapanId}*\nकेस क्रमांक :- *${caseId}*\n\n*कृपया उपर्युक्त ज्ञापन का प्रतिवेदन यहां अपलोड करें ।*`);
                console.log("Message sent Successfully!!.");
            }
            else {
                console.log("Read State service failed to execute with errors.");
            }
        }));
    }
});
// Handle 'Yes' button click
const handleYesButton = (phoneNumber, res, WPSession, WPprativedanURL, WPGyapanId, WPGyapanObjectId) => __awaiter(void 0, void 0, void 0, function* () {
    if (WPGyapanId && WPprativedanURL) {
        const gyapanId = WPGyapanId === null || WPGyapanId === void 0 ? void 0 : WPGyapanId.split("/")[0];
        const caseId = WPGyapanId === null || WPGyapanId === void 0 ? void 0 : WPGyapanId.split("/")[1];
        if (gyapanId != "") {
            yield (0, submitPrativedan_1.submitPrativedan)({
                gyapanId: WPGyapanObjectId,
                prativedanUrl: WPprativedanURL,
                submittedAt: new Date()
            });
            //Mark the submit template as sent for not sending again.
            yield (0, markTaskCompleted_1.markTaskAsCompleted)({ gyapanIds: [gyapanId] });
            const updated_state = {
                "phoneNumber": phoneNumber,
                "WPSession": false,
                "WPGyapanId": "",
                "WPGyapanObjectId": "",
                "WPprativedanURL": ""
            };
            //Check CASE ID.
            yield (0, pushState_1.pushState)(updated_state).then((res_) => __awaiter(void 0, void 0, void 0, function* () {
                if (res_.code == 200) {
                    res.status(200).send(`ज्ञापन क्रमांक :- *${gyapanId}*\nकेस क्रमांक :- *${caseId}*\n\n*प्रतिवेदन सफलतापूर्वक सबमिट किया गया।*`);
                    console.log("Reset of values done for yes.");
                }
                else {
                    console.log("Read State service failed to execute with errors.");
                }
            }));
        }
    }
});
// Handle 'Resend' button click
const handleResendButton = (phoneNumber, res, WPSession, WPprativedanURL, WPGyapanId, WPGyapanObjectId) => __awaiter(void 0, void 0, void 0, function* () {
    const gyapanId = WPGyapanId === null || WPGyapanId === void 0 ? void 0 : WPGyapanId.split("/")[0];
    const caseId = WPGyapanId === null || WPGyapanId === void 0 ? void 0 : WPGyapanId.split("/")[1];
    if (gyapanId != "") {
        store_gyapan_url_and_name[phoneNumber] = []; // Reset stored data
        const updated_state = {
            "phoneNumber": phoneNumber,
            "WPSession": true,
            "WPGyapanId": WPGyapanId,
            "WPGyapanObjectId": WPGyapanObjectId,
            "WPprativedanURL": ""
        };
        //Check CASE ID.
        yield (0, pushState_1.pushState)(updated_state).then((res_) => __awaiter(void 0, void 0, void 0, function* () {
            if (res_.code == 200) {
                res.status(200).send(`ज्ञापन क्रमांक :- *${gyapanId}*\nकेस क्रमांक :- *${caseId}*\n\n*कृपया उपर्युक्त ज्ञापन का प्रतिवेदन यहां अपलोड करें ।*`);
                console.log("Reset of values done for no.");
            }
            else {
                console.log("Read State service failed to execute with errors.");
            }
        }));
    }
});
// Handle pending Gyapan list retrieval
const handlePendingGyapanList = (payload, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield (0, pendingListForBot_1.getPendingListForBot)(`91${payload.sender.dial_code}`);
    if (result.code === 200 && result.result.data.length === 0) {
        res.status(200).send("No pending Gyapan now!!");
    }
    else {
        console.log("Failed to get pending tasks or tasks found");
    }
});
// Handle document upload
const handleDocumentUpload = (payload, phoneNumber, res, WPSession, WPprativedanURL, WPGyapanId, WPGyapanObjectId) => __awaiter(void 0, void 0, void 0, function* () {
    var _h, _j;
    const name = (_h = payload === null || payload === void 0 ? void 0 : payload.payload) === null || _h === void 0 ? void 0 : _h.name;
    const url = (_j = payload === null || payload === void 0 ? void 0 : payload.payload) === null || _j === void 0 ? void 0 : _j.url;
    const gyapanId = WPGyapanId.split("/")[0];
    const caseId = WPGyapanId.split("/")[1];
    //store_gyapan_url_and_name[phoneNumber].push(name, url);
    const updated_state = {
        "phoneNumber": phoneNumber,
        "WPSession": true,
        "WPGyapanId": WPGyapanId,
        "WPGyapanObjectId": WPGyapanObjectId,
        "WPprativedanURL": url
    };
    console.log(updated_state);
    //Check CASE ID.
    yield (0, pushState_1.pushState)(updated_state).then((res_) => __awaiter(void 0, void 0, void 0, function* () {
        if (res_.code == 200) {
            console.log("Saved URL Successfully.");
        }
        else {
            console.log("Read State service failed to execute with errors.");
        }
    }));
    console.log("Phone - ", phoneNumber);
    console.log("url - ", url);
    console.log("to - ", payload === null || payload === void 0 ? void 0 : payload.source);
    const message = buildConfirmationMessage(phoneNumber, url, WPGyapanId, WPGyapanObjectId);
    yield sendWhatsAppMessage(payload === null || payload === void 0 ? void 0 : payload.source, message);
});
// Build a message to confirm document upload
const buildConfirmationMessage = (phoneNumber, url, WPGyapanId, WPGyapanObjectId) => {
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
const sendWhatsAppMessage = (to, message) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const response = yield axios_1.default.post("https://api.gupshup.io/sm/api/v1/msg", { channel: "whatsapp", source: "919399504804", destination: to, message: JSON.stringify(message), "src.name": sourceName }, axiosConfig);
        console.log("HERERERE");
        console.log(response.headers);
        console.log(response.data);
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
