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
        return {
            token: data['ens-auth-token'],
            expires_in: data['expires_in'] || 3600 // Default to 1 hour if not provided
        };
    }
    catch (error) {
        console.error('Error:', error.message);
    }
});
exports.getToken = getToken;
const upsertSupporter = (data, token) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const response = yield fetch(apiUrl + 'supporter', {
            method: "POST",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "ens-auth-token": token,
            },
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            let errorMessage = `HTTP error! Status: ${response.status}`;
            let errorBody;
            try {
                errorBody = yield response.json();
                errorMessage += `, Message: ${JSON.stringify(errorBody)}`;
            }
            catch (_b) {
                errorMessage += ", No additional error details in response body.";
            }
            // We have some invalid emails saved, and there is 'can receive' check on EN side
            // Check if error message contains that error phrase and do not crash to prevent requing those messages
            if ((_a = errorBody === null || errorBody === void 0 ? void 0 : errorBody.message) === null || _a === void 0 ? void 0 : _a.includes("Email address not found or is not valid")) {
                // overwrite the status to 200 in status, it will still be 400 in the error message
                return { status: 200, warning: errorMessage };
            }
            throw new Error(errorMessage);
        }
        return { status: response.status };
    }
    catch (error) {
        console.error("Error:", error);
        throw error; // Re-throw other errors
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
        this._tokenExpiry = null;
        this.handleContact = (message) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            console.log("Action taken from the queue", message.action.id);
            if (this.verbose) {
                console.log(message);
            }
            const token = yield this.getToken();
            if (!token) {
                throw new Error("Auth token is missing");
            }
            const { ["Last Name"]: lastName, City, Postcode, Phone } = yield (0, exports.getSupporter)(message.contact.email, token);
            const data = {
                'Email Address': message.contact.email,
                'First Name': message.contact.firstName,
                'Last Name': ((_a = message.contact) === null || _a === void 0 ? void 0 : _a.lastName) || lastName || "",
                City: ((_b = message.action.customFields) === null || _b === void 0 ? void 0 : _b.locality) || City || "",
                Postcode: ((_c = message.contact) === null || _c === void 0 ? void 0 : _c.postcode) || Postcode || "",
                Phone: ((_d = message.contact) === null || _d === void 0 ? void 0 : _d.phone) || Phone || "",
                "questions": {
                    "Accepts Email": "Y"
                }
            };
            if (message.campaign.name === 'naturevoter') {
                data["questions"]["NatureVoter"] = "Y";
            }
            ;
            if (message.actionPage.locale.toLowerCase().startsWith("fr")) {
                data["questions"]["French"] = "Y";
            }
            const response = yield (0, exports.upsertSupporter)(data, token);
            if (response.status === 200) {
                response.warning ?
                    console.log(`Message ${message.actionId} removed from the queue: ${response.warning}`)
                    : console.log(`Message ${message.actionId} sent`);
            }
            else {
                console.log(`Message ${message.actionId} failed: ${response.status}`);
            }
            return response.status === 200;
        });
        this.crmType = crm_1.CRMType.OptIn;
    }
    // Getter for token that initializes it if needed
    getToken() {
        return __awaiter(this, void 0, void 0, function* () {
            const now = Date.now();
            // Fetch new token if missing or expired
            if (!this._token || (this._tokenExpiry && now >= this._tokenExpiry)) {
                const tokenData = yield (0, exports.getToken)();
                if (!tokenData) {
                    throw new Error("Failed to retrieve token");
                }
                this._token = tokenData.token;
                this._tokenExpiry = now + tokenData.expires_in * 1000; // Convert seconds to milliseconds
            }
            return this._token;
        });
    }
}
exports.default = CleverreachCRM;
