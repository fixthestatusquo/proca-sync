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
const utils_1 = require("../utils");
const proca_1 = require("../proca");
class gpdedatahubCRM extends crm_1.CRM {
    constructor(opt) {
        super(opt);
        this.fetchCampaign = (campaign) => __awaiter(this, void 0, void 0, function* () {
            const r = yield (0, proca_1.fetchCampaign)(campaign.id);
            return r;
        });
        this.fetchWidget = (widget) => __awaiter(this, void 0, void 0, function* () {
            return (0, proca_1.fetchWidget)(widget.id);
        });
        // CRM will take double actions and respond with 200 status
        this.handleContact = (message) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            const camp = yield this.campaign(message.campaign);
            if (message.tracking.content && ((_a = camp.config.import) === null || _a === void 0 ? void 0 : _a.includes("ABTest"))) {
                const widget = yield this.widget(message.actionPage);
                const variant = (_c = (_b = widget.config.component) === null || _b === void 0 ? void 0 : _b.test) === null || _c === void 0 ? void 0 : _c.find((d) => d.name === message.tracking.content);
                if (variant)
                    camp.config = (0, utils_1.deepMerge)(camp.config, { component: variant.component });
                else
                    console.error("utm_content isn't a variant in config.component.test");
                console.log("AB TEST variant", variant.name, camp.config.component.sync);
            }
            console.log("Taken from the queue", message.action.id, "test:", message.action.testing);
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
