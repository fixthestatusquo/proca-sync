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
Object.defineProperty(exports, "__esModule", { value: true });
const brevo_1 = require("@getbrevo/brevo");
const crm_1 = require("../crm");
const utils_1 = require("../utils");
class BrevoCRM extends crm_1.CRM {
    constructor(opt) {
        super(opt);
        this.folderId = 0;
        this.handleContact = (message) => __awaiter(this, void 0, void 0, function* () {
            let camp;
            try {
                camp = yield this.campaign(message.campaign);
            }
            catch (error) {
                console.log("failed fetching the campaign", message.campaign);
                return { processed: false };
            }
            const attributes = {};
            if (this.mapping) {
                if (message.contact.phone) {
                    message.contact.phone = message.contact.phone.replaceAll(" ", "");
                }
                for (const key in this.mapping) {
                    if (message.contact[key]) {
                        attributes[this.mapping[key]] = message.contact[key];
                    }
                }
            }
            else {
                attributes.LANG = message.actionPage.locale;
                attributes.FIRSTNAME = message.contact.firstName;
                attributes.LASTNAME = message.contact.lastName || "";
            }
            if (process.env.OPTIN) {
                attributes[process.env.OPTIN] = true;
            }
            if (process.env.DOUBLE_OPTIN) {
                attributes[process.env.DOUBLE_OPTIN] = "Yes";
            }
            const listIds = [camp.id];
            if (process.env.LIST) {
                listIds.push(parseInt(process.env.LIST, 10));
            }
            const payload = {
                email: message.contact.email,
                attributes,
                listIds,
                emailBlacklisted: false,
                updateEnabled: true,
            };
            try {
                yield this.brevo.contacts.createContact(payload);
                console.log("contact added", message.contact.email);
                return { processed: true };
            }
            catch (e) {
                console.log(this.error(e));
                if (e.body) {
                    if (e.body.code === "invalid_parameter" &&
                        e.body.message === "Invalid LANDLINE_NUMBER number") {
                        try {
                            payload.attributes["LANDLINE_NUMBER"] = undefined;
                            yield this.brevo.contacts.createContact(payload);
                            console.error("Invalid phone number");
                            return { processed: true };
                        }
                        catch (e) {
                            console.log("error creating even after removing phone", e.body);
                            return { processed: false };
                        }
                    }
                    console.log("error creating", e.body);
                }
                else {
                    console.log("error creating no code", e);
                }
                return { processed: false };
            }
        });
        this.campaign = (campaign) => __awaiter(this, void 0, void 0, function* () {
            let name = campaign.name;
            if (campaign.externalId) {
                name = "proca.externalId:" + campaign.externalId;
            }
            if (!this.campaigns[name]) {
                this.campaigns[name] = yield this.fetchCampaign(campaign);
            }
            return Promise.resolve(this.campaigns[name]);
        });
        this.fetchCampaigns = () => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const folders = yield this.brevo.contacts.getFolders({
                    limit: 10,
                    offset: 0,
                });
                if (!folders.folders)
                    return;
                let procaFolder = folders.folders.find((d) => d.name === "proca");
                if (!procaFolder) {
                    procaFolder = (yield this.brevo.contacts.createFolder({
                        name: "proca",
                    }));
                }
                this.folderId = procaFolder.id;
                const lists = yield this.brevo.contacts.getLists({
                    limit: 50,
                    offset: 0,
                });
                (_a = lists.lists) === null || _a === void 0 ? void 0 : _a.forEach((d) => {
                    this.campaigns[d.name] = d;
                    this.campaigns[d.id] = d;
                });
            }
            catch (e) {
                console.log("error fetching campaigns", e);
            }
        });
        this.fetchCampaign = (campaign) => __awaiter(this, void 0, void 0, function* () {
            if (Object.keys(this.campaigns).length === 0) {
                yield this.fetchCampaigns();
            }
            if (campaign.externalId && this.campaigns[campaign.externalId]) {
                return this.campaigns[campaign.externalId];
            }
            if (this.campaigns[campaign.name]) {
                return this.campaigns[campaign.name];
            }
            try {
                const data = yield this.brevo.contacts.createList({
                    name: campaign.name,
                    folderId: this.folderId,
                });
                console.log("created list for campaign", campaign.name, data);
                return data;
            }
            catch (e) {
                console.log("error creating list", e);
            }
        });
        switch (process.env.CRM_TYPE) {
            case "DOUBLE_OPTIN":
                this.crmType = crm_1.CRMType.DoubleOptIn;
                break;
            case "OPTIN":
            default:
                this.crmType = crm_1.CRMType.OptIn;
        }
        this.brevo = new brevo_1.BrevoClient({
            apiKey: process.env.SENDINBLUE_KEY || process.env.BREVO_KEY || "",
        });
        const attributes = process.env.CONTACT_ATTRIBUTES;
        if (attributes !== undefined) {
            this.mapping = (0, utils_1.string2map)(attributes);
        }
    }
}
exports.default = BrevoCRM;
