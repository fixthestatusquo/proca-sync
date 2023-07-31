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
const contact_1 = require("./mailchimp/contact");
const client_1 = require("./mailchimp/client");
const utils_1 = require("../utils");
class MailchimpCRM extends crm_1.CRM {
    constructor(opt) {
        super(opt);
        this.handleContact = (message) => __awaiter(this, void 0, void 0, function* () {
            //const response = await this.client.ping.get();
            if (this.list === "") {
                console.log("fetching exisiting lists");
                const r = yield (0, client_1.allLists)(this.client);
                const lists = r.lists || [];
                lists &&
                    lists.forEach((d) => {
                        console.log(d.id, d.name);
                    });
                return false;
            }
            const actionPayload = (0, contact_1.actionToContactRecord)(message, this.mergeFields, false, false);
            if (this.verbose) {
                console.log(actionPayload);
            }
            try {
                const r = yield this.addContactToList(this.client, this.list, actionPayload, this.verbose);
                if (Boolean(r)) {
                    return r;
                }
                else {
                    console.error("error, should be boolean", r);
                    return false;
                }
            }
            catch (e) {
                console.log("error adding", e);
                throw e;
            }
            return false;
        });
        this.fetchContact = (email) => __awaiter(this, void 0, void 0, function* () {
            return (0, client_1.findMember)(this.client, email);
        });
        this.fetchCampaign = (campaign) => __awaiter(this, void 0, void 0, function* () {
            console.log("fetching campaign", campaign.name);
            if (this.lists === undefined) {
                console.log("fetching lists", campaign.name);
                /*      try {
                  const r = await allLists(this.client);
                  this.lists = r.lists || [];
                  this.lists && this.lists.forEach ( (d:any) => {
          console.log(d.id,d.name);
                  });
                } catch (e: any) {
          console.error("error fetching campaign",e.error); throw (e);
                }
          */
            }
            return campaign;
        });
        this.addContactToList = (client, list_id, member, verbose = false) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            if (!member.status) {
                member.status = member.status_if_new;
            }
            try {
                const response = yield client.lists.addListMember(list_id, member, {
                    skipMergeValidation: true,
                });
                if ((_a = response.errors) === null || _a === void 0 ? void 0 : _a.length) {
                    throw new Error(response.errors);
                }
                if (verbose) {
                    delete response._links;
                    console.log(response);
                }
                this.log("adding " + member.email_address, crm_1.ProcessStatus.processed);
                return true;
            }
            catch (e) {
                const b = ((_b = e === null || e === void 0 ? void 0 : e.response) === null || _b === void 0 ? void 0 : _b.body) || e;
                switch (b === null || b === void 0 ? void 0 : b.title) {
                    case "Member Exists":
                        this.log("", crm_1.ProcessStatus.skipped);
                        return true;
                    case "Forgotten Email Not Subscribed":
                    case "Member In Compliance State":
                    case "Invalid Resource":
                        this.log((b === null || b === void 0 ? void 0 : b.detail) || b.title, crm_1.ProcessStatus.ignored);
                        return true;
                    default:
                        console.log("unexpected error", b);
                }
                return false;
            }
            return true;
        });
        this.crmType = crm_1.CRMType.OptIn;
        if (!process.env.AUTH_TOKEN) {
            console.error("you need to set the AUTH_TOKEN from mailchimp in the .env.xx");
            process.exit(1);
        }
        this.token = process.env.AUTH_TOKEN;
        if (!process.env.LIST) {
            console.error("you need to set the LIST (audience id) from mailchimp in the .env.xx");
        }
        this.list = process.env.LIST || "";
        try {
            this.client = (0, client_1.makeClient)();
        }
        catch (e) {
            console.log(e.message, "can't connected, check AUTH_TOKEN?");
            process.exit(1);
        }
        if (typeof process.env.MERGE_FIELDS === "string") {
            // get query format, key = contact field, value = merge field in mailchimp
            // eg. MERGE_FIELDS="firstName=PRENOM&lastName=NOM&country=PAYS&locality=VILLE&postcode=CP&street=RUE1"
            this.mergeFields = (0, utils_1.string2map)(process.env.MERGE_FIELDS);
            console.log("custom mergeFields", this.mergeFields);
        }
    }
}
exports.default = MailchimpCRM;
