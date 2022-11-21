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
exports.CRM = exports.CRMType = void 0;
var CRMType;
(function (CRMType) {
    CRMType[CRMType["ActionContact"] = 0] = "ActionContact";
    CRMType[CRMType["Contact"] = 1] = "Contact";
    CRMType[CRMType["OptIn"] = 2] = "OptIn";
    //  DoubleOptIn, @marcin, can we easily do that? it'd need to memstore temporarily contacts until the doubleoptin arrives, right?
})(CRMType = exports.CRMType || (exports.CRMType = {}));
class CRM {
    constructor() {
        this.fetchCampaign = (campaign) => __awaiter(this, void 0, void 0, function* () {
            // we don't fetch nor create the campaign from the CRM, by default we consider that all information needed is the name of the campaign as set on proca
            // in most CRMs, you'll want to fetch the campaign details from the CRM or create one if it doesn't exist
            // by campaign, we mean whatever your CRM uses to segment contacts and actions, it might be named list, segment...
            return Promise.resolve(campaign);
        });
        this.handleContact = (message) => __awaiter(this, void 0, void 0, function* () {
            throw new Error("you need to implement handleContact in your CRM");
        });
        this.handleActionContact = (message) => __awaiter(this, void 0, void 0, function* () {
            if (message.privacy.withConsent && this.crmType === CRMType.Contact) {
                return this.handleContact(message);
            }
            if (message.privacy.optIn && this.crmType === CRMType.OptIn) {
                return this.handleContact(message);
            }
            if (this.crmType === CRMType.ActionContact) {
                throw new Error("You need to eith: \n -define handleActionContact on your CRM or\n- set crmType to Contact or OptIn");
            }
        });
        this.campaign = (campaign) => __awaiter(this, void 0, void 0, function* () {
            const name = campaign.name;
            if (!this.campaigns[name]) {
                this.campaigns[name] = yield this.fetchCampaign(campaign);
            }
            return Promise.resolve(this.campaigns[name]);
        });
        this.handleEvent = (message) => __awaiter(this, void 0, void 0, function* () {
            return Promise.resolve({ processed: false });
        });
        this.campaigns = {};
        this.crmType = CRMType.ActionContact;
    }
}
exports.CRM = CRM;
