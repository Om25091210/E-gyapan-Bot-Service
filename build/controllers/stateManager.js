"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class StateManager {
    constructor() {
        // The key is the phone number, and the value is an array of Gyapan IDs for that phone number
        this.sessions = {};
    }
    // Get the current Gyapan ID for a specific phone number
    getCurrentGyapanIdInQueue(phoneNumber) {
        var _a;
        return ((_a = this.sessions[phoneNumber]) === null || _a === void 0 ? void 0 : _a[0]) || "0/0"; // Return the first ID if exists, else null
    }
    // Add a Gyapan ID to a specific phone number's session
    addToCurrentGyapanIdInQueue(phoneNumber, id) {
        if (!this.sessions[phoneNumber]) {
            this.sessions[phoneNumber] = []; // Initialize the session for the phone number if it doesn't exist
        }
        if (this.sessions[phoneNumber].length === 0) {
            this.sessions[phoneNumber].push(id);
        }
        else {
            console.log(`Gyapan ID already being processed for phone number ${phoneNumber}, cannot add another.`);
        }
    }
    // Clear the session (Gyapan IDs) for a specific phone number
    clearCurrentGyapanIdInQueue(phoneNumber) {
        if (this.sessions[phoneNumber]) {
            this.sessions[phoneNumber].length = 0;
        }
    }
    // Check if a specific phone number has a session with a Gyapan ID in the queue
    isGyapanInQueue(phoneNumber) {
        var _a;
        return ((_a = this.sessions[phoneNumber]) === null || _a === void 0 ? void 0 : _a.length) === 1 || false; // Return true if the session has exactly 1 Gyapan ID
    }
}
const stateManager = new StateManager();
exports.default = stateManager;
