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
const SibApiV3Sdk = require("@sendinblue/client");
/*
 *

interface CRM {
  fetchCampaigns = () : Promise<void>
}
*/
class SendInBlueCRM extends crm_1.CRM {
    constructor(opt) {
        super(opt);
        this.apiInstance = new SibApiV3Sdk.ContactsApi();
        this.folderId = 0;
        this.handleContact = (message) => __awaiter(this, void 0, void 0, function* () {
            const camp = yield this.campaign(message.campaign);
            console.log(camp.id, message.contact.email);
            let createContact = new SibApiV3Sdk.CreateContact();
            createContact.email = message.contact.email;
            createContact.attributes = { "LANG": message.actionPage.locale, "FIRSTNAME": message.contact.firstName, "LASTNAME": message.contact.lastName || "" };
            createContact.listIds = [camp.id];
            createContact.updateEnabled = true;
            try {
                const contact = yield this.apiInstance.createContact(createContact);
            }
            catch (e) {
                console.log(e);
                return { processed: false };
            }
            return { processed: true };
        });
        this.campaign = (campaign) => __awaiter(this, void 0, void 0, function* () {
            let name = campaign.name;
            if (campaign.externalId) {
                name = "proca.externalId:" + campaign.externalId; // hopefully prefix never used anywhere
            }
            if (!this.campaigns[name]) {
                this.campaigns[name] = yield this.fetchCampaign(campaign);
            }
            return Promise.resolve(this.campaigns[name]);
        });
        this.fetchCampaigns = () => __awaiter(this, void 0, void 0, function* () {
            try {
                let folders = yield this.apiInstance.getFolders(10, 0);
                const name = "proca";
                if (folders.body.folders) {
                    let procaFolder = folders.body.folders.filter((d) => d.name === name);
                    if (!procaFolder.length) {
                        const createFolder = new SibApiV3Sdk.CreateUpdateFolder();
                        createFolder.name = name;
                        const data = yield this.apiInstance.createFolder(createFolder);
                        procaFolder = data.body;
                    }
                    else {
                        procaFolder = procaFolder[0];
                    }
                    this.folderId = procaFolder.id;
                    let lists = yield this.apiInstance.getLists(50, 0);
                    lists = lists.body.lists;
                    if (lists.length) {
                        lists.forEach((d) => this.campaigns[d.name] = d);
                    }
                }
            }
            catch (e) {
                console.log(e);
            }
        });
        this.fetchCampaign = (campaign) => __awaiter(this, void 0, void 0, function* () {
            if (campaign.externalId) {
                const data = yield this.apiInstance.getList(campaign.externalId);
                return data.body;
            }
            if (Object.keys(this.campaigns).length === 0) {
                yield this.fetchCampaigns();
                if (this.campaigns[campaign.name])
                    return this.campaigns[campaign.name];
            }
            try {
                const createList = new SibApiV3Sdk.CreateList();
                createList.name = campaign.name;
                createList.folderId = this.folderId;
                const data = yield this.apiInstance.createList(createList);
                console.log("fetching campaign " + campaign.name, data.body);
                return data.body;
            }
            catch (e) {
                console.log(e);
            }
        });
        this.crmType = crm_1.CRMType.OptIn;
        this.apiInstance.setApiKey(SibApiV3Sdk.AccountApiApiKeys.apiKey, process.env.SENDINBLUE_KEY);
    }
}
exports.default = SendInBlueCRM;
