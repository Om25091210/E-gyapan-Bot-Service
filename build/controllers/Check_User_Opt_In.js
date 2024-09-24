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
exports.getAllOptInUsers = void 0;
const sdk = require('api')('@gupshup/v1.0#ezpvim9lcyhvffa');
const getAllOptInUsers = (phoneNumber) => __awaiter(void 0, void 0, void 0, function* () {
    return sdk.getalluseroptInsforanapp({ appname: 'ProductiveGPT', apikey: 'u7maer3xezr2dsrsstbq0voosxs5g8sm' })
        .then(({ data }) => {
        // Check if any user matches the phone number
        const userFound = data.users.some(item => `91${item.phoneCode}` === phoneNumber);
        return userFound;
    })
        .catch((err) => {
        console.error(err);
        return false; // Return false in case of an error
    });
});
exports.getAllOptInUsers = getAllOptInUsers;
