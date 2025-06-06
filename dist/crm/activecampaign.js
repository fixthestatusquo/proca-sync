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
const crm_1 = require("../crm");
const dotenv_1 = __importDefault(require("dotenv"));
const lodash_1 = require("lodash");
const proca_1 = require("../proca");
dotenv_1.default.config();
const url = process.env.CRM_URL;
const token = process.env.CRM_API_TOKEN;
if (!url || !token) {
    console.error("Missing CRM credentials.");
    process.exit(1);
}
class ActiveCampaign extends crm_1.CRM {
    constructor(opt) {
        super(opt);
        this.fetchCampaign = (campaign) => __awaiter(this, void 0, void 0, function* () {
            const r = yield (0, proca_1.fetchCampaign)(campaign.id);
            return r;
        });
        this.headers = {
            'Api-Token': token,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        };
        // actionid for the last campaign
        // send data source, text field, value "proca"
        this.body = ({ email, firstName, lastName, contactRef, id, phone, postcode }, data_source, action_id_field, ref_field, zip_field) => {
            const fieldValues = [
                {
                    field: data_source, // data_source field ID
                    value: 'proca'
                },
                {
                    field: action_id_field,
                    value: id
                },
                {
                    field: ref_field,
                    value: contactRef
                }
            ];
            // Add ZIP (postcode) only if it's provided
            if (postcode && zip_field) {
                fieldValues.push({
                    field: zip_field, // ZIP field ID, default is 11
                    value: postcode
                });
            }
            const contact = {
                firstName,
                fieldValues
            };
            // Conditionally add optional fields
            if (email)
                contact.email = email;
            if (lastName)
                contact.lastName = lastName;
            if (phone)
                contact.phone = phone;
            return JSON.stringify({ contact });
        };
        this.fetchContact = (email) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            console.log("Fetching contact:", email);
            try {
                const res = yield fetch(`${url}/api/3/contacts?email=${encodeURIComponent(email)}`, {
                    method: "GET",
                    headers: this.headers,
                });
                if (!res.ok)
                    return;
                const data = yield res.json();
                return (_b = (_a = data.contacts) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.id;
            }
            catch (err) {
                console.error("Error fetching contact:", err);
            }
        });
        this.createContact = (bodyContent) => __awaiter(this, void 0, void 0, function* () {
            const res = yield fetch(`${url}/api/3/contacts`, {
                method: "POST",
                headers: this.headers,
                body: bodyContent,
            });
            if (!res.ok)
                throw new Error(`Failed to create contact: ${res.statusText}`);
            const data = yield res.json();
            return data.contact.id;
        });
        this.updateContact = (contactid, bodyContent) => __awaiter(this, void 0, void 0, function* () {
            const res = yield fetch(`${url}/api/3/contacts/${contactid}`, {
                method: "PUT",
                headers: this.headers,
                body: bodyContent,
            });
            if (!res.ok)
                throw new Error(`Failed to update contact: ${res.statusText}`);
            const data = yield res.json();
            return data.contact.id;
        });
        this.subscribeToList = (contactid, listid) => __awaiter(this, void 0, void 0, function* () {
            const res = yield fetch(`${url}/api/3/contactLists`, {
                method: "POST",
                headers: this.headers,
                body: JSON.stringify({
                    contactList: {
                        list: listid,
                        contact: contactid,
                        status: 1
                    },
                }),
            });
            if (!res.ok)
                throw new Error(`Failed to subscribe to list: ${res.statusText}`);
        });
        //The tag must already exist, default?
        this.addTagsToContact = (contactId, tagIds) => __awaiter(this, void 0, void 0, function* () {
            const ids = tagIds.replace(/\s+/g, "").split(",");
            for (const tagId of ids) {
                const res = yield fetch(`${url}/api/3/contactTags`, {
                    method: "POST",
                    headers: this.headers,
                    body: JSON.stringify({
                        contactTag: {
                            contact: contactId,
                            tag: tagId,
                        },
                    }),
                });
                if (!res.ok) {
                    const errorData = yield res.json();
                    throw new Error(`Failed to add tag ${tagId}: ${JSON.stringify(errorData)}`);
                }
            }
        });
        this.handleActionContact = (message) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const email = message.contact.email;
            console.log("Processing action:", message.action.id, "testing:", message.action.testing);
            if (this.verbose) {
                console.log(JSON.stringify(message, null, 2));
            }
            try {
                // updates will not be considered!!!
                const camp = yield this.campaign(message.campaign);
                const { listid, tagids, action_id_field, ref_field, data_source, zip_field } = ((_b = (_a = camp.config) === null || _a === void 0 ? void 0 : _a.component) === null || _b === void 0 ? void 0 : _b.sync) || {};
                if (!tagids || !action_id_field || !ref_field || !data_source) {
                    console.error("Missing required configuration for ActiveCampaign sync");
                    return false;
                }
                ;
                let contactid = yield this.fetchContact(email);
                // Email is necessary to create contact, but it is redundant for the update
                const contactPayload = Object.assign(Object.assign({}, (contactid
                    ? (0, lodash_1.pick)(message.contact, ['firstName', 'lastName', 'contactRef', 'phone', 'postcode'])
                    : (0, lodash_1.pick)(message.contact, ['email', 'firstName', 'lastName', 'contactRef', 'phone', 'postcode']))), { id: message.action.id });
                const bodyContent = this.body(contactPayload, data_source, action_id_field, ref_field, zip_field);
                if (contactid) {
                    console.log("Contact already exists, update:", contactid);
                    contactid = yield this.updateContact(contactid, bodyContent);
                }
                else {
                    console.log("Creating new contact:", email);
                    contactid = yield this.createContact(bodyContent);
                }
                if (!contactid) {
                    console.error("Failed to create or update contact");
                    return false;
                }
                // Subscribe to list
                yield this.subscribeToList(contactid, listid || '1');
                // Add petition-specific tags
                yield this.addTagsToContact(contactid, tagids);
                console.log("Action contact processed successfully", message.action.id);
                return true;
            }
            catch (err) {
                console.error("Error handling contact action:", err.message);
                return false;
            }
        });
        this.crmType = crm_1.CRMType.ActionContact;
    }
    getActiveCampaignFields() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield fetch(`${url}/api/3/fields`, {
                    method: 'GET',
                    headers: this.headers
                });
                if (!response.ok) {
                    throw new Error(`Error fetching fields: ${response.status} ${response.statusText}`);
                }
                const data = yield response.json();
                console.log('Retrieved fields:', data.fields);
                return data.fields;
            }
            catch (error) {
                console.error('Failed to fetch ActiveCampaign fields:', error);
                return null;
            }
        });
    }
    getActiveCampaignLists() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield fetch(`${url}/api/3/lists`, {
                    method: 'GET',
                    headers: this.headers
                });
                if (!response.ok) {
                    throw new Error(`Error fetching lists: ${response.status} ${response.statusText}`);
                }
                const data = yield response.json();
                console.log('Retrieved lists:', data.lists);
                return data.lists;
            }
            catch (error) {
                console.error('Failed to fetch ActiveCampaign lists:', error);
                return null;
            }
        });
    }
}
exports.default = ActiveCampaign;
