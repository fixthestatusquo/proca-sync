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
const data_1 = require("./trust-lc/data");
const client_1 = require("./trust-lc/client");
/*
 * A debug CRM that displays the messages and events in the log
 *
 */
class TrustCRM extends crm_1.CRM {
    constructor(opt) {
        super(opt);
        this.handleContact = (message) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            const camp = yield this.campaign(message.campaign);
            const actionPayload = (0, data_1.formatAction)(message);
            if (this.verbose) {
                console.log(actionPayload);
            }
            const verificationPayload = {
                petition_signature: {
                    subscribe_newsletter: actionPayload.petition_signature.subscribe_newsletter,
                    data_handling_consent: (0, data_1.handleConsent)(message),
                },
            };
            const data = yield (0, client_1.postAction)(actionPayload);
            if ((_a = data.petition_signature) === null || _a === void 0 ? void 0 : _a.verification_token) {
                const verified = yield (0, client_1.verification)(data.petition_signature.verification_token, verificationPayload);
                return true;
            }
            else {
                console.error("error", data);
                return false;
            }
            return false;
        });
        this.fetchCampaign = (campaign) => __awaiter(this, void 0, void 0, function* () {
            console.log("fake fetching campaign", campaign.name);
            return campaign;
        });
        this.crmType = crm_1.CRMType.OptIn;
    }
}
exports.default = TrustCRM;
