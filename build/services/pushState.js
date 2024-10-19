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
exports.pushState = void 0;
const ServerURL_1 = require("../global/ServerURL");
const pushState = (updated_state) => __awaiter(void 0, void 0, void 0, function* () {
    if (updated_state.phoneNumber.length === 10 && !updated_state.phoneNumber.startsWith('91')) {
        updated_state.phoneNumber = `91${updated_state.phoneNumber}`;
    }
    const url = `${ServerURL_1.SERVER_URL}patwari/updatedBotDetails`;
    const authOptions = {
        method: 'POST',
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(updated_state),
    };
    console.log(url);
    console.log(authOptions);
    const response = yield fetch(url, authOptions);
    const code = response.status;
    const result = yield response.json();
    console.log(result);
    return { code, result };
});
exports.pushState = pushState;
