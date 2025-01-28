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
const proca_1 = require("../proca");
class TrustCRM extends crm_1.CRM {
    constructor(opt) {
        super(opt);
        this.fetchCampaign = (campaign) => __awaiter(this, void 0, void 0, function* () {
            const r = yield (0, proca_1.fetchCampaign)(campaign.id);
            return r;
        });
        this.handleContact = (message) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            console.log("Taken from queue", message.action.id);
            const campaign = yield this.fetchCampaign(message.campaign);
            const actionPayload = (0, data_1.formatAction)(message, (_c = (_b = (_a = campaign === null || campaign === void 0 ? void 0 : campaign.config) === null || _a === void 0 ? void 0 : _a.component) === null || _b === void 0 ? void 0 : _b.sync) === null || _c === void 0 ? void 0 : _c.moveCode);
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
            if ((_d = data.petition_signature) === null || _d === void 0 ? void 0 : _d.verification_token) {
                const verified = yield (0, client_1.verification)(data.petition_signature.verification_token, verificationPayload);
                console.log("Verified", verified);
                return true;
            }
            else if (data.alreadyProcessed) {
                console.log("Already processed", "data:", data, "action:", message);
                return true;
            }
            else {
                console.log("no verification token", "data:", data, "action:", message);
                return false;
            }
        });
        this.crmType = crm_1.CRMType.DoubleOptIn;
    }
}
;
exports.default = TrustCRM;
