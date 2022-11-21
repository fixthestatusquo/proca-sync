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
const SibApiV3Sdk = require('@sendinblue/client');
const apiInstance = new SibApiV3Sdk.AccountApi();
// Configure API key authorization: apiKey
apiInstance.setApiKey(SibApiV3Sdk.AccountApiApiKeys.apiKey, 'YOUR API KEY');
apiInstance.getAccount().then(function (data) {
    console.log('API called successfully. Returned data: ', data.body);
}, function (error) {
    console.error(error);
});
class SendInBlueCRM extends crm_1.CRM {
    constructor() {
        super(...arguments);
        this.handleActionContact = (message) => __awaiter(this, void 0, void 0, function* () {
            const camp = yield this.campaign(message.campaign);
            console.log("message", message);
            return { processed: true };
        });
        this.fetchCampaign = (campaign) => __awaiter(this, void 0, void 0, function* () {
            console.log("fetching campaign" + campaign.name);
            return campaign;
        });
    }
}
exports.default = new SendInBlueCRM();
