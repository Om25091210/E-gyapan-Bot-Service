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
const sdk = require("api")("@gupshup/v1.0#ezpvim9lcyhvffa");
const axios_1 = __importDefault(require("axios"));
const submitPrativedan_1 = require("../services/submitPrativedan");
const sdk_read = require('api')('@gupshup/v1.0#52yl2v10lk9hvls9');
const stateManager_1 = __importDefault(require("./stateManager")); // import the singleton state manager
require("dotenv").config();
const pendingListForBot_1 = require("../services/pendingListForBot");
const markTaskCompleted_1 = require("../services/markTaskCompleted");
const processedMessageIds = [];
const store_gyapan_url_and_name = {};
const clientKey = process.env.APIKEY;
//constants for sending consent template.
const sourceName = "Egyapaan";
const axiosConfig = {
    headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "apikey": clientKey, // Make sure this is correctly set in your .env file
    },
};
const verify = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const payload = req.body.payload;
    const phoneNumber = payload === null || payload === void 0 ? void 0 : payload.source;
    console.log(payload);
    if (payload && payload.type === "sandbox-start") {
        // Return an empty response with HTTP_SUCCESS (2xx) status code
        res.status(200).send("");
        // Acknowledge the reception immediately, as per your requirements
        setTimeout(() => {
            // You can put your asynchronous processing logic here if needed
            // Acknowledge the reception
            console.log("Acknowledged receipt of sandbox-start event");
        }, 500);
    }
    else {
        try {
            markAsSeen(payload === null || payload === void 0 ? void 0 : payload.id);
            if (!processedMessageIds.includes(payload === null || payload === void 0 ? void 0 : payload.id)) {
                //store processed msgs for non repitative msgs.
                processedMessageIds.push(payload === null || payload === void 0 ? void 0 : payload.id);
                if ((payload === null || payload === void 0 ? void 0 : payload.type) === 'button_reply') {
                    //if its a button_reply then get the message id for which it was sent.
                    const id = payload.payload.id;
                    console.log("gyapan - ", id);
                    //For submit button
                    if (((_a = payload.payload) === null || _a === void 0 ? void 0 : _a.title) === 'Submit') {
                        //Search in Task collection for such ID.
                        if (!stateManager_1.default.isGyapanInQueue(phoneNumber)) {
                            //push to state array for having a one session at one time for gyapan.  
                            stateManager_1.default.addToCurrentGyapanIdInQueue(phoneNumber, id);
                            store_gyapan_url_and_name[phoneNumber] = [];
                            res.status(200).send(`कृपया अपना प्रतिवेदन यहां अपलोड करें | *Gyapan ID/Case ID - ${stateManager_1.default.getCurrentGyapanIdInQueue(phoneNumber)}*`);
                        }
                    }
                    //For Yes button
                    if (((_b = payload.payload) === null || _b === void 0 ? void 0 : _b.title) === 'हाँ') {
                        //Search in Task collection for such ID.
                        if (stateManager_1.default.isGyapanInQueue(phoneNumber) && store_gyapan_url_and_name[phoneNumber].length != 0) {
                            const gyapanId = (_c = stateManager_1.default.getCurrentGyapanIdInQueue(phoneNumber)) === null || _c === void 0 ? void 0 : _c.split("/")[0];
                            //Mark that gyapan as sent - so that next time we do not share it again. 
                            const gyapan_id = {
                                "gyapanIds": [gyapanId]
                            };
                            yield (0, markTaskCompleted_1.markTaskAsCompleted)(gyapan_id).then((res_) => {
                                if (res_.code == 200) {
                                    console.log("Gyapan marked Successfully!!.");
                                }
                                else {
                                    console.log("Message failed to mark!!.");
                                }
                            });
                            //TODO: Send it to the Prativedan API.
                            const prativedan = {
                                "gyapanId": gyapanId,
                                "prativedanUrl": store_gyapan_url_and_name[phoneNumber][1],
                                "submittedAt": new Date()
                            };
                            yield (0, submitPrativedan_1.submitPrativedan)(prativedan).then((res_) => {
                                if (res_.code == 200) {
                                    console.log("Prativedan submitted Successfully!!.");
                                }
                                else {
                                    console.log("Prativedan Message failed to submit!!.");
                                }
                            });
                            //reset
                            stateManager_1.default.clearCurrentGyapanIdInQueue(phoneNumber);
                            store_gyapan_url_and_name[phoneNumber] = [];
                            res.status(200).send(`प्रतिवेदन सफलतापूर्वक सबमिट किया गया | *Gyapan ID/Case ID - ${id}*`);
                        }
                    }
                    if (((_d = payload.payload) === null || _d === void 0 ? void 0 : _d.title) === 'पुनः भेजें') {
                        // Check if there is a Gyapan ID in the queue and some data stored
                        if (stateManager_1.default.isGyapanInQueue(phoneNumber) && store_gyapan_url_and_name[phoneNumber].length != 0) {
                            // Reset the store_gyapan_url_and_name array
                            store_gyapan_url_and_name[phoneNumber] = []; // or store_gyapan_url_and_name = [];
                            // Log the reset action for debugging
                            console.log("store_gyapan_url_and_name has been reset.");
                            // Prompt the user to re-upload the file
                            res.status(200).send(`कृपया अपना प्रतिवेदन यहां अपलोड करें | *Gyapan ID/Case ID - ${stateManager_1.default.getCurrentGyapanIdInQueue(phoneNumber)}*`);
                        }
                    }
                }
                if (payload.payload.text === 'ग्यापन दिखाएं') {
                    // * // Will Fetch Pending Gyapan from the DB and send the list of Pending Gyapan from App Backend. //
                    yield (0, pendingListForBot_1.getPendingListForBot)(payload.sender.dial_code).then((res_) => {
                        if (res_.code == 200) {
                            // * // Notify users if there is no pending task. //
                            if (res_.result.data.length === 0) {
                                //TODO: Notify that there is not pending task.
                                res.status(200).send("No pending Gyapan now!!");
                            }
                            else {
                                //console.log(res_.result);
                                console.log("Pending Task found and sent Successfully!!");
                            }
                        }
                        else {
                            console.log("Failed to get-pending task.");
                        }
                    });
                }
                if (phoneNumber != undefined) {
                    console.log("object "
                        + stateManager_1.default.isGyapanInQueue(phoneNumber)
                        + ((_e = payload === null || payload === void 0 ? void 0 : payload.payload) === null || _e === void 0 ? void 0 : _e.url));
                    console.log("object2");
                    console.log(store_gyapan_url_and_name[phoneNumber]);
                }
                if (stateManager_1.default.isGyapanInQueue(phoneNumber) && ((_f = payload === null || payload === void 0 ? void 0 : payload.payload) === null || _f === void 0 ? void 0 : _f.url) && store_gyapan_url_and_name[phoneNumber].length == 0) {
                    //extract the response here!!
                    const name = (_g = payload === null || payload === void 0 ? void 0 : payload.payload) === null || _g === void 0 ? void 0 : _g.name;
                    const url = (_h = payload === null || payload === void 0 ? void 0 : payload.payload) === null || _h === void 0 ? void 0 : _h.url;
                    store_gyapan_url_and_name[phoneNumber].push(name);
                    store_gyapan_url_and_name[phoneNumber].push(url);
                    //console the result to debug
                    console.log("STATE " + stateManager_1.default.getCurrentGyapanIdInQueue(phoneNumber));
                    //number to send
                    const to = payload === null || payload === void 0 ? void 0 : payload.source;
                    let message;
                    message = {
                        "content": {
                            "type": "file",
                            "url": url,
                            "text": `मैं इस दस्तावेज़ को भेजने की पुष्टि करता हूँ ?`,
                            "filename": "PDF file",
                            "caption": `${stateManager_1.default.getCurrentGyapanIdInQueue(phoneNumber)}`,
                        },
                        "type": "quick_reply",
                        "msgid": `${stateManager_1.default.getCurrentGyapanIdInQueue(phoneNumber)}`,
                        "options": [{ "type": "text", "title": "हाँ" }, { "type": "text", "title": "पुनः भेजें" }]
                    };
                    const postData = {
                        channel: "whatsapp",
                        source: "919399504804",
                        destination: to,
                        message: JSON.stringify(message),
                        "src.name": sourceName,
                    };
                    try {
                        const response = yield axios_1.default.post("https://api.gupshup.io/sm/api/v1/msg", postData, axiosConfig);
                        return {
                            status: 200,
                            data: response.data
                        }; // Return only the data part of the response
                    }
                    catch (error) {
                        throw error;
                    }
                }
            }
        }
        catch (e) {
            console.log("User Inbound message.");
        }
    }
});
function ask_consent(res, payload) {
    return __awaiter(this, void 0, void 0, function* () {
        // Accessing the phone number
        try {
            const phoneNumber = payload.sender.phone;
            sdk.markauserasoptedIn({ user: phoneNumber }, {
                appname: "ProductiveGPT",
                apikey: clientKey,
            });
            res.status(200).send("");
        }
        catch (e) {
            console.log("Error");
        }
    });
}
function markAsSeen(id) {
    sdk_read.markMessageAsRead({
        appId: '49a05590-5a1c-42f1-a713-95f14457c1d3',
        msgId: id,
        apikey: clientKey
    }).catch((error) => {
        console.error("Failed to mark message as read:", error);
    });
}
exports.default = verify;
