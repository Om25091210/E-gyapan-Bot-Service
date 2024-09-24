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
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkHSM_msgSent = void 0;
const ServerURL_1 = require("../global/ServerURL");
const checkHSM_msgSent = (task_id, status) => __awaiter(void 0, void 0, void 0, function* () {
    // * // Will send the whatsapp msgs for pending task from App backend. //
    const url = `${ServerURL_1.SERVER_URL}task/${task_id}/checkHSMmsg/${status}`;
    const authOptions = {
        method: 'GET',
        headers: {
            "Content-Type": "application/json"
        },
    };
    console.log(url);
    const response = yield fetch(url, authOptions);
    const code = response.status;
    const result = yield response.json();
    return { code, result };
});
exports.checkHSM_msgSent = checkHSM_msgSent;
