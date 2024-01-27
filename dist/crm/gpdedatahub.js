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
class gpdedatahubCRM extends crm_1.CRM {
    constructor(opt) {
        super(opt);
        this.handleContact = (message) => __awaiter(this, void 0, void 0, function* () {
            const camp = yield this.campaign(message.campaign);
            const actionPayload = (0, data_1.formatAction)(message);
            if (this.verbose) {
                console.log(actionPayload);
            }
            const data = yield (0, client_1.postAction)(actionPayload);
            if (data) {
                return true;
            }
            else {
                console.error("error, no data");
                return false;
            }
        });
        this.crmType = crm_1.CRMType.DoubleOptIn;
    }
}
exports.default = gpdedatahubCRM;
