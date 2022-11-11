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
exports.showContacts = exports.addCampaign = exports.getCampaignByExternalId = exports.getCampaignByName = exports.addSignature = exports.setBounced = exports.setSubscribed = exports.addContact = exports.getContactByEmail = exports.CRM = void 0;
const lodash_1 = __importDefault(require("lodash"));
// global CRM in memory here
exports.CRM = {
    contacts: [],
    campaigns: []
};
// APIs to call the CRM
// I make them async as if they are networked api calls
const getContactByEmail = (email) => __awaiter(void 0, void 0, void 0, function* () {
    return lodash_1.default.find(exports.CRM.contacts, (c) => c.email === email);
});
exports.getContactByEmail = getContactByEmail;
const addContact = (email, firstName, lastName) => __awaiter(void 0, void 0, void 0, function* () {
    const id = exports.CRM.contacts.length;
    exports.CRM.contacts.push({
        id,
        firstName: firstName,
        lastName: lastName || '',
        email,
        subscribed: false,
        bounced: false,
        campaigns: []
    });
    return id;
});
exports.addContact = addContact;
const setSubscribed = (id, subscribed) => __awaiter(void 0, void 0, void 0, function* () {
    exports.CRM.contacts[id].subscribed = subscribed;
});
exports.setSubscribed = setSubscribed;
const setBounced = (id, bounced) => __awaiter(void 0, void 0, void 0, function* () {
    exports.CRM.contacts[id].subscribed = bounced;
});
exports.setBounced = setBounced;
const addSignature = (contactId, campaignId) => __awaiter(void 0, void 0, void 0, function* () {
    const cs = exports.CRM.contacts[contactId].campaigns;
    if (cs.indexOf(campaignId) < 0) {
        cs.push(campaignId);
    }
});
exports.addSignature = addSignature;
const getCampaignByName = (name) => __awaiter(void 0, void 0, void 0, function* () {
    return lodash_1.default.find(exports.CRM.campaigns, (c) => c.name === name);
});
exports.getCampaignByName = getCampaignByName;
const getCampaignByExternalId = (externalId) => __awaiter(void 0, void 0, void 0, function* () {
    return lodash_1.default.find(exports.CRM.campaigns, (c) => c.externalId === externalId);
});
exports.getCampaignByExternalId = getCampaignByExternalId;
const addCampaign = (name, externalId) => __awaiter(void 0, void 0, void 0, function* () {
    const id = exports.CRM.campaigns.length;
    exports.CRM.campaigns.push({
        name, id, externalId
    });
    return id;
});
exports.addCampaign = addCampaign;
const showContacts = () => {
    let s = '';
    for (const c of exports.CRM.contacts) {
        s = `${c.firstName} ${c.lastName} <${c.email}> subscribed: ${c.subscribed} blocked: ${c.bounced} signatures:`;
        for (const cid of c.campaigns) {
            s += ` ${exports.CRM.campaigns[cid].name};`;
        }
        console.log(s);
    }
};
exports.showContacts = showContacts;
