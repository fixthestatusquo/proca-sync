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
exports.upsertContact = exports.getGroups = exports.getContact = exports.getToken = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const authUrl = process.env.CRM_URL;
const tokenUrl = process.env.CRM_TOKEN_URL;
const ID = process.env.CRM_ID; //letters
const secret = process.env.CRM_SECRET;
const apiUrl = process.env.CRM_URL;
if (!authUrl || !tokenUrl || !ID || !tokenUrl || !apiUrl) {
    console.error("No credentials");
    process.exit(1);
}
const getToken = () => __awaiter(void 0, void 0, void 0, function* () {
    const authHeader = 'Basic ' + Buffer.from(`${ID}:${secret}`).toString('base64');
    try {
        const response = yield fetch(tokenUrl, {
            method: 'POST',
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                'grant_type': 'client_credentials'
            })
        });
        if (!response.ok) {
            const errorBody = yield response.text();
            throw new Error(`Error fetching token: ${response.statusText} - ${errorBody}`);
        }
        const data = yield response.json();
        return data.access_token;
    }
    catch (error) {
        console.error('Error:', error.message);
    }
});
exports.getToken = getToken;
const getContact = (email, token) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const response = yield fetch(apiUrl + `/v3/receivers.json/${email}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) {
            throw new Error(`Get receiver failed: ${response.statusText}`);
        }
        const data = yield response.json();
        // if there are values for quelle, name, zip and lastname, we will use those values if they are empty in the message
        if (data === null || data === void 0 ? void 0 : data.global_attributes) {
            const { firstname, lastname, company, quelle, zip } = data.global_attributes;
            return { firstname, lastname, company, quelle, zip };
        }
        return {};
    }
    catch (error) {
        console.error('Get contact error:', error.message);
    }
    return false;
});
exports.getContact = getContact;
const getGroups = (token, listId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const response = yield fetch(apiUrl + '/v3/groups/' + listId + '/receivers', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) {
            throw new Error(`Get groups failed: ${response.statusText}`);
        }
        const data = yield response.text();
        console.log('Get groups response status:', data);
        return data;
    }
    catch (error) {
        console.error('Get groups contact error:', error.message);
    }
});
exports.getGroups = getGroups;
const upsertContact = (token, postData, listId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const response = yield fetch(apiUrl + '/v3/groups/' + listId + '/receivers/upsert', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`, //,
                'name': 'Proca CR Import Export'
            },
            body: JSON.stringify(postData)
        });
        if (response.ok)
            return true;
        return false;
    }
    catch (error) {
        console.error('Post contact errooor:', error.message);
    }
});
exports.upsertContact = upsertContact;
