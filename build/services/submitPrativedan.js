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
exports.submitPrativedan = void 0;
const ServerURL_1 = require("../global/ServerURL");
const submitPrativedan = (prativedan) => __awaiter(void 0, void 0, void 0, function* () {
    const url = `${ServerURL_1.SERVER_URL}gyapan/prativedan/create`;
    console.log(url);
    const authOptions = {
        method: 'POST',
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(prativedan) // Make sure to send an object if the API expects an object
    };
    console.log("prativedan");
    console.log(prativedan);
    const response = yield fetch(url, authOptions);
    console.log(response);
    const code = response.status;
    const result = yield response.json();
    return { code, result };
});
exports.submitPrativedan = submitPrativedan;
