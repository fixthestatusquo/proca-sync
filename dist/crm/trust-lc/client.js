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
exports.lookup = exports.verification = exports.postAction = void 0;
const crypto_1 = __importDefault(require("crypto"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const makeHeaders = () => {
    const key = process.env['TRUST_KEY'];
    if (!key)
        throw Error("TRUST_KEY not set");
    const stamp = Math.floor(Math.floor(Date.now() / 1000) / 30).toString();
    const token = crypto_1.default.createHmac("sha256", key).update(stamp).digest().toString('hex');
    return {
        method: "POST",
        headers: {
            Accept: "application/json",
            'Authorization': `Token token="proca-test:${token}"`,
            'Content-Type': 'application/json;charset=UTF-8'
        }
    };
};
const postAction = (body) => __awaiter(void 0, void 0, void 0, function* () {
    if ("string" !== typeof process.env.POST_URL) {
        throw new Error("POST_URL missing in env");
    }
    try {
        const response = yield fetch(process.env.POST_URL, Object.assign(Object.assign({}, (makeHeaders())), { body: JSON.stringify(body) }));
        const data = yield response.json();
        return data;
    }
    catch (error) {
        console.error('post error: ', error);
        throw (error);
    }
});
exports.postAction = postAction;
const verification = (verificationToken, body) => __awaiter(void 0, void 0, void 0, function* () {
    if ("string" !== typeof process.env.VERIFICATION_URL) {
        throw new Error("POST_URL missing in env");
    }
    const url = process.env.VERIFICATION_URL + verificationToken + '/verify';
    try {
        const response = yield fetch(url, Object.assign({ body: JSON.stringify(body) }, (makeHeaders())));
        if (response.status === 204) {
            return "allgood";
        }
        const data = yield response.json();
        return data;
    }
    catch (error) {
        console.error('post error: ', error);
        throw (error);
    }
});
exports.verification = verification;
const lookup = (email) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    if ("string" !== typeof process.env.LOOKUP_URL) {
        throw new Error("LOOKUP_URL missing in env");
    }
    const url = process.env.LOOKUP_URL + email;
    try {
        const response = yield fetch(url, makeHeaders());
        const data = yield response.json();
        return { success: true, data: data };
    }
    catch (error) {
        return { success: false, status: (_a = error.response) === null || _a === void 0 ? void 0 : _a.status, data: error.response };
    }
});
exports.lookup = lookup;
