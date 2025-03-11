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
exports.getSupporter = exports.upsertSupporter = exports.getToken = void 0;
const crm_1 = require("../crm");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const apiUrl = process.env.CRM_URL;
const apiToken = process.env.CRM_API_TOKEN;
if (!apiUrl || !apiToken) {
    console.error("No ccccredentials");
    process.exit(1);
}
const authHeaders = {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
};
const getToken = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const response = yield fetch(apiUrl + 'authenticate', {
            method: 'POST',
            headers: authHeaders,
            body: apiToken
        });
        if (!response.ok) {
            const errorBody = yield response.text();
            throw new Error(`Error fetching token: ${response.statusText} - ${errorBody}`);
        }
        const data = yield response.json();
        return data['ens-auth-token'];
    }
    catch (error) {
        console.error('Error:', error.message);
    }
});
exports.getToken = getToken;
const upsertSupporter = (data, token) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const response = yield fetch(apiUrl + 'supporter', {
            method: "POST",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "ens-auth-token": token,
            },
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.status;
    }
    catch (error) {
        console.error("Error:", error);
    }
});
exports.upsertSupporter = upsertSupporter;
const getSupporter = (email, token) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const response = yield fetch(apiUrl + 'supporter?' + 'email=' + 'brucewayne@example.com', {
            method: "GET",
            headers: {
                "Accept": "application/json",
                "ens-auth-token": token,
            }
        });
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        if (response.statusText === "No Content") {
            console.log("responseText === No Content");
            return {};
        }
        const result = yield response.json();
        return result;
    }
    catch (error) {
        console.error("Error:", error);
    }
});
exports.getSupporter = getSupporter;
class CleverreachCRM extends crm_1.CRM {
    constructor(opt) {
        super(opt);
        this._token = null;
        this.handleContact = (message) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            console.log("Action taken from the queue", message.action.id);
            if (this.verbose) {
                console.log(message);
            }
            const token = yield this.getToken();
            if (!token) {
                throw new Error("Auth token is missing");
            }
            const { ["Last Name"]: lastName, ["Address 1"]: address, Postcode, Phone } = yield (0, exports.getSupporter)(message.contact.email, token);
            const data = {
                'Email Address': message.contact.email,
                'First Name': message.contact.firstName,
                'Last Name': message.contact.lastName || lastName || "",
                'Address 1': message.contact.street || address || "",
                Postcode: ((_a = message.contact) === null || _a === void 0 ? void 0 : _a.postcode) || Postcode || "",
                Phone: ((_b = message.contact) === null || _b === void 0 ? void 0 : _b.phone) || Phone || "",
                "questions": {
                    "Accepts Email": "Y",
                    "NatureVoter": "Y"
                }
            };
            if (message.actionPage.locale.toLowerCase().startsWith("fr")) {
                data["questions"]["French"] = "Y";
            }
            const status = yield (0, exports.upsertSupporter)(data, token);
            return status === 200;
        });
        this.crmType = crm_1.CRMType.OptIn;
    }
    // Getter for token that initializes it if needed
    getToken() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this._token) {
                this._token = yield (0, exports.getToken)();
            }
            return this._token;
        });
    }
}
exports.default = CleverreachCRM;
