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
const client_1 = require("./cleverreach/client");
const data_1 = require("./cleverreach/data");
class CleverreachCRM extends crm_1.CRM {
    constructor(opt) {
        super(opt);
        this.token = null;
        this.initializeToken = () => __awaiter(this, void 0, void 0, function* () {
            try {
                this.token = yield (0, client_1.getToken)();
            }
            catch (error) {
                throw new Error("Failed to retrieve token");
            }
        });
        this.handleMessage = (message) => __awaiter(this, void 0, void 0, function* () {
            if (this.verbose) {
                console.log(message);
            }
            if (!message.campaign.externalId) {
                console.error(`List ID missing, set the externalId for the campaign ${message.campaign.name}`);
                return false;
            }
            ;
            yield this.initializeToken();
            const listId = parseInt(message.campaign.externalId.toString().slice(0, 6), 10);
            if (!this.token) {
                throw new Error("Token is not available");
            }
            const status = yield (0, client_1.postContact)(this.token, (0, data_1.formatAction)(message), listId);
            console.log("status", status);
            if (status === 200) {
                console.log(`Message ${message.actionId} sent`);
                return true;
            }
            else {
                const retryStatus = yield (0, client_1.postContact)(this.token, (0, data_1.formatAction)(message, true), listId, true);
                if (retryStatus === 200) {
                    return true;
                }
                else {
                    console.log(`Message ${message.actionId} not sent`);
                    return false;
                }
            }
        });
        this.handleContact = (message) => __awaiter(this, void 0, void 0, function* () {
            console.log("Action taken from the queue", message.action.id);
            return this.handleMessage(message);
        });
        this.handleEvent = (message) => __awaiter(this, void 0, void 0, function* () {
            console.log("Event taken from queue", message.actionId);
            message.contact = message.supporter.contact;
            message.privacy = message.supporter.privacy;
            return this.handleMessage(message);
        });
        this.crmType = crm_1.CRMType.DoubleOptIn;
        this.initializeToken();
    }
}
exports.default = CleverreachCRM;
