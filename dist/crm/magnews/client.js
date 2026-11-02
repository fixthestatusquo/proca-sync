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
exports.addContact = exports.setClientToken = exports.memberHash = void 0;
const node_crypto_1 = __importDefault(require("node:crypto"));
const magnews_ts_1 = __importDefault(require("./magnews.js"));
const memberHash = (email) => {
    const hash = node_crypto_1.default.createHash("md5").update(email).digest("hex");
    return hash;
};
exports.memberHash = memberHash;
const setClientToken = () => {
    if (process.env.AUTH_TOKEN) {
        const tok = process.env.AUTH_TOKEN;
        if (!tok)
            throw Error("auth token is empty!");
        magnews_ts_1.default.setConfig({
            accessToken: tok,
        });
        return magnews_ts_1.default.getToken();
    }
    throw Error("Define AUTH_TOKEN");
};
exports.setClientToken = setClientToken;
const addContact = (token, member) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield magnews_ts_1.default.addListMember(token, member);
    return result;
});
exports.addContact = addContact;
