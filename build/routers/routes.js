"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Verify_webhook_1 = __importDefault(require("../controllers/Verify_webhook"));
const sendTask_1 = __importDefault(require("../controllers/sendTask"));
const sendHSM_1 = __importDefault(require("../controllers/sendHSM"));
const router = (0, express_1.default)();
router.post("/verify", Verify_webhook_1.default);
router.post("/sendTask", sendTask_1.default);
router.post("/sendHSM", sendHSM_1.default);
exports.default = router;
