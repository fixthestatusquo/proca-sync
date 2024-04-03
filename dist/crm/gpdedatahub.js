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
const data_1 = require("./gpdedatahub/data");
const client_1 = require("./gpdedatahub/client");
const proca_1 = require("../proca");
class gpdedatahubCRM extends crm_1.CRM {
    constructor(opt) {
        super(opt);
        this.fetchCampaign = (campaign) => __awaiter(this, void 0, void 0, function* () {
            const r = yield (0, proca_1.fetchCampaign)(campaign.name);
            return r;
        });
        // CRM will take double actions and respond with 200 status
        this.handleContact = (message) => __awaiter(this, void 0, void 0, function* () {
            const camp = yield this.fetchCampaign(message.campaign);
            console.log("Taken from the queue", message.action.id);
            const actionPayload = (0, data_1.formatAction)(message, camp.config);
            if (this.verbose) {
                console.log(actionPayload);
            }
            const status = yield (0, client_1.postAction)(actionPayload);
            if (status === 200) {
                console.log(`Action ${message.actionId} sent`);
                return true;
            }
            else {
                console.log(`Action ${message.actionId} not sent`);
                return false;
            }
        });
        this.crmType = crm_1.CRMType.DoubleOptIn;
    }
}
exports.default = gpdedatahubCRM;
