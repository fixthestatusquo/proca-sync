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
exports.postAction = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const url = process.env.CRM_URL;
const username = process.env.CRM_USERNAME;
const password = process.env.CRM_PASSWORD;
if (!url || !username || !password) {
    console.error("no credentials");
    process.exit();
}
const authToken = `${username}:${password}`;
const tokenEncoded = Buffer.from(authToken).toString('base64');
console.log("token", tokenEncoded);
const headers = {
    "Authorization": `Basic ${tokenEncoded}`,
    "Content-type": "application/json"
};
const postAction = (action) => __awaiter(void 0, void 0, void 0, function* () {
    console.log("headers:", headers);
    console.log("body", JSON.stringify(action));
    try {
        const response = yield fetch(url, {
            method: "POST",
            headers: {
                "Authorization": `Basic ${tokenEncoded}`,
                "Content-type": "application/json"
            },
            body: JSON.stringify(action)
        });
        console.log("response status", response.status);
        const data = yield response.json();
        return data;
    }
    catch (error) {
        console.error('post error: ', error);
        throw (error);
    }
});
exports.postAction = postAction;
