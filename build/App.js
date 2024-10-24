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
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const express_1 = __importDefault(require("express"));
const morgan_1 = __importDefault(require("morgan"));
const routes_1 = __importDefault(require("./routers/routes"));
const app = (0, express_1.default)();
//**Logging*/
app.use((0, morgan_1.default)('dev'));
//** Parse the request */
app.use(express_1.default.urlencoded({ extended: false }));
//** Takes care of JSON data */
app.use(express_1.default.json());
app.get('/test', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    console.log("Hi running successfully");
    return res.send({ "message": "running Successfully" });
}));
//** Routes */
app.use('/', routes_1.default);
const PORT = (_a = process.env.PORT) !== null && _a !== void 0 ? _a : 5000;
const httpServer = http_1.default.createServer(app);
httpServer.listen(PORT, () => console.log(`The server is running on port ${PORT}`));
