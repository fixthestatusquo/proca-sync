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
const crm_1 = require("../crm");
const utils_1 = require("../utils");
class Mailjet extends crm_1.CRM {
    constructor(opt) {
        super(opt);
        this.init = () => __awaiter(this, void 0, void 0, function* () {
            if (!this.list) {
                // it will not work without a group, suggesting some
                console.warn("missing list id, some options:");
                const r = yield this.mailjet.get("contactslist", { 'version': 'v3', 'limit': 200 }).request();
                r.body.Data.forEach((g) => {
                    console.log(g.ID, g.Name, g.SubscriberCount);
                });
                return false;
            }
            return true;
        });
        this.handleContact = (message) => __awaiter(this, void 0, void 0, function* () {
            try {
                const existing = yield this.fetchContact(message.contact.email, {});
                const source = "proca";
                const camp = { id: 0, name: "todo" };
                const action = message.action;
                if (existing === false) {
                    return this.createContact(message.contact, action, camp.id, source);
                }
                else {
                    return this.updateContact(existing, message.contact, action, camp.id, source);
                }
                return false;
            }
            catch (e) {
                console.log(e);
                throw new Error(e);
            }
        });
        this.createContact = (contact, action, campaign_id, source) => __awaiter(this, void 0, void 0, function* () {
            const request = yield this.mailjet
                .post("contact", { 'version': 'v3' })
                .request({
                "Name": contact.lastName ? contact.firsttName + ' ' + contact.lastName : contact.firstName,
                "Email": contact.email
            });
            console.log("request", request);
            return false;
        });
        this.updateContact = (crmContact, contact, action, campaign_id, source) => __awaiter(this, void 0, void 0, function* () {
            if (campaign_id === null) {
                throw new Error("missing campaign id");
            }
            return false;
        });
        this.fetchCampaign = (campaign) => __awaiter(this, void 0, void 0, function* () {
            console.log(campaign);
            return this.list;
        });
        this.fetchContact = (email, context) => __awaiter(this, void 0, void 0, function* () {
            const result = yield this.mailjet.get("contact", { 'version': 'v3' }).id(email).request();
            if (result.body.Data.count === 0)
                return false;
            const contact = result.body.Data[0];
            return true;
        });
        this.crmType = crm_1.CRMType.OptIn;
        if (!process.env.MJ_APIKEY_PUBLIC) {
            console.error("you need to set the MJ_APIKEY_PUBLIC from mailjet in the .env.xx");
            process.exit(1);
        }
        if (!process.env.MJ_APIKEY_PRIVATE) {
            console.error("you need to set the MJ_APIKEY_PRIVATE from mailjet in the .env.xx");
            process.exit(1);
        }
        if (!process.env.LIST) {
            console.error("you need to set the LIST (audience id) from mailjet in the .env.xx");
        }
        else {
            this.list = +process.env.LIST;
        }
        try {
            this.mailjet = require('node-mailjet').apiConnect(process.env.MJ_APIKEY_PUBLIC, process.env.MJ_APIKEY_PRIVATE);
        }
        catch (e) {
            console.log(e.message, "can't connect, check MJ_APIKEY_PUBLIC and PRIVATE?");
            process.exit(1);
        }
        if (typeof process.env.CONTACT_PROPERTIES === "string") {
            // get query format, key = contact field, value = merge field in mailjet
            // eg. CONTACT_PROPERTIES="firstName=PRENOM&lastName=NOM&country=PAYS&locality=VILLE&postcode=CP&street=RUE1"
            this.contactProperties = (0, utils_1.string2map)(process.env.CONTACT_PROPERTIES);
            console.log("contact properties", this.contactProperties);
        }
    }
}
exports.default = Mailjet;
