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
class ActiveCampaign extends crm_1.CRM {
    constructor(opt) {
        super(opt);
        this.fetchCampaign = (campaign) => __awaiter(this, void 0, void 0, function* () {
            return (0, proca_1.fetchCampaign)(campaign.id);
        });
        this.body = (contact, sync) => {
            const fieldValues = this.getOrgFieldValues(contact, sync);
            const ac = {
                firstName: contact.firstName,
                email: contact.email,
                fieldValues,
            };
            if (contact.lastName)
                ac.lastName = contact.lastName;
            if (contact.phone)
                ac.phone = contact.phone;
            return JSON.stringify({ contact: ac });
        };
        this.fetchContact = (email) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const res = yield fetch(`${this.url}/api/3/contacts?email=${encodeURIComponent(email)}`, {
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
            const res = yield fetch(`${this.url}/api/3/contacts`, {
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
            const res = yield fetch(`${this.url}/api/3/contacts/${contactid}`, {
                method: "PUT",
                headers: this.headers,
                body: bodyContent,
            });
            if (!res.ok)
                throw new Error(`Failed to update contact: ${res.statusText}`);
            const data = yield res.json();
            return data.contact.id;
        });
        this.syncContact = (bodyContent) => __awaiter(this, void 0, void 0, function* () {
            const fullUrl = `${this.url}/api/3/contact/sync`;
            console.log("Attempting sync to:", fullUrl);
            const res = yield fetch(`${this.url}/api/3/contact/sync`, {
                method: "POST",
                headers: this.headers,
                body: bodyContent,
            });
            if (!res.ok)
                throw new Error(`Failed to sync contact: ${res.statusText}`);
            const data = yield res.json();
            return data.contact.id;
        });
        this.subscribeToList = (contactid, listid) => __awaiter(this, void 0, void 0, function* () {
            const res = yield fetch(`${this.url}/api/3/contactLists`, {
                method: "POST",
                headers: this.headers,
                body: JSON.stringify({
                    contactList: {
                        list: listid,
                        contact: contactid,
                        status: 1,
                    },
                }),
            });
            if (!res.ok)
                throw new Error(`Failed to subscribe to list: ${res.statusText}`);
        });
        this.addTagsToContact = (contactId, tagIds) => __awaiter(this, void 0, void 0, function* () {
            const ids = tagIds.replace(/\s+/g, "").split(",");
            for (const tagId of ids) {
                const res = yield fetch(`${this.url}/api/3/contactTags`, {
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
        this.handleContact = (message) => __awaiter(this, void 0, void 0, function* () {
            console.log("Action taken from the queue", message.action.id);
            return this.handleMessage(message);
        });
        this.handleEvent = (message) => __awaiter(this, void 0, void 0, function* () {
            console.log("Event taken from queue", message.actionId);
            message.contact = message.supporter.contact;
            message.privacy = message.supporter.privacy;
            return this.handleMessage(message);
        });
        this.handleMessage = (message) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const actionId = "action" in message ? message.action.id : message.actionId;
            const testing = "action" in message ? message.action.testing : false;
            console.log("Processing action:", actionId, "testing:", testing);
            if (this.verbose)
                console.log(JSON.stringify(message, null, 2));
            try {
                // updates will not be considered!!!
                const camp = yield this.campaign(message.campaign);
                const sync = ((_b = (_a = camp.config) === null || _a === void 0 ? void 0 : _a.component) === null || _b === void 0 ? void 0 : _b.sync) || {};
                const listid = sync.listid || process.env.CRM_LIST_ID;
                const tagids = sync.tagids || process.env.CRM_TAG_IDS;
                const contactPayload = Object.assign(Object.assign({}, (0, lodash_1.pick)(message.contact, [
                    "email",
                    "firstName",
                    "lastName",
                    "contactRef",
                    "phone",
                    "postcode",
                ])), { id: actionId });
                const bodyContent = this.body(contactPayload, sync);
                const contactid = yield this.syncContact(bodyContent);
                if (!contactid) {
                    console.error("Failed to sync contact, action ID:", actionId);
                    return false;
                }
                if (listid)
                    yield this.subscribeToList(contactid, listid);
                if (tagids)
                    yield this.addTagsToContact(contactid, tagids);
                console.log("Action contact processed successfully", actionId);
                return true;
            }
            catch (err) {
                console.error("Error handling contact action:", err.message, err);
                return false;
            }
        });
        this.setSubscribed = (id, subscribed) => __awaiter(this, void 0, void 0, function* () {
            return true;
        });
        switch (process.env.CRM_TYPE) {
            case "DOUBLE_OPTIN":
                this.crmType = crm_1.CRMType.DoubleOptIn;
                break;
            case "ActionContact":
                this.crmType = crm_1.CRMType.ActionContact;
                break;
            default:
                this.crmType = crm_1.CRMType.DoubleOptIn;
        }
        this.url = process.env.CRM_URL || "";
        this.token = process.env.CRM_API_TOKEN || "";
        if (!this.url || !this.token) {
            throw new Error(`Missing CRM_URL or CRM_API_TOKEN`);
        }
        this.headers = {
            "Api-Token": this.token,
            Accept: "application/json",
            "Content-Type": "application/json",
        };
    }
    getOrgFieldValues(contact, sync) {
        switch (process.env.ORG) {
            case "duh": {
                const data_source = sync.data_source || process.env.CRM_DATA_SOURCE;
                const action_id_field = sync.action_id_field || process.env.CRM_ACTION_ID_FIELD;
                const ref_field = sync.ref_field || process.env.CRM_REF_FIELD;
                const zip_field = sync.zip_field || process.env.CRM_ZIP_FIELD;
                if (!data_source || !action_id_field || !ref_field)
                    return [];
                const fields = [
                    { field: data_source, value: "proca" },
                    { field: action_id_field, value: contact.id },
                    { field: ref_field, value: contact.contactRef },
                ];
                if (contact.postcode && zip_field) {
                    fields.push({ field: zip_field, value: contact.postcode });
                }
                return fields;
            }
            default:
                return [];
        }
    }
    getActiveCampaignFields() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield fetch(`${this.url}/api/3/fields`, {
                    method: "GET",
                    headers: this.headers,
                });
                if (!response.ok) {
                    throw new Error(`Error fetching fields: ${response.status} ${response.statusText}`);
                }
                const data = yield response.json();
                console.log("Retrieved fields:", data.fields);
                return data.fields;
            }
            catch (error) {
                console.error("Failed to fetch ActiveCampaign fields:", error);
                return null;
            }
        });
    }
    getActiveCampaignLists() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield fetch(`${this.url}/api/3/lists`, {
                    method: "GET",
                    headers: this.headers,
                });
                if (!response.ok) {
                    throw new Error(`Error fetching lists: ${response.status} ${response.statusText}`);
                }
                const data = yield response.json();
                console.log("Retrieved lists:", data.lists);
                return data.lists;
            }
            catch (error) {
                console.error("Failed to fetch ActiveCampaign lists:", error);
                return null;
            }
        });
    }
}
exports.default = ActiveCampaign;
