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
const proca_1 = require("../proca");
class CleverreachCRM extends crm_1.CRM {
    constructor(opt) {
        super(opt);
        this.token = null;
        this.handleCampaignUpdate = (message) => __awaiter(this, void 0, void 0, function* () {
            //we are handling campaign updates to remove them from the queue
            return true;
        });
        this.fetchCampaign = (campaign) => __awaiter(this, void 0, void 0, function* () {
            const r = yield (0, proca_1.fetchCampaign)(campaign.id);
            return r;
        });
        this.initializeToken = () => __awaiter(this, void 0, void 0, function* () {
            try {
                this.token = yield (0, client_1.getToken)();
            }
            catch (error) {
                throw new Error("Failed to retrieve token");
            }
        });
        this.handleMessage = (message) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
            if (this.verbose) {
                console.log(message);
            }
            const camp = yield this.campaign(message.campaign);
            // listId might be different for each campaign
            // custom label is different for each campaign
            if (!((_c = (_b = (_a = camp.config) === null || _a === void 0 ? void 0 : _a.component) === null || _b === void 0 ? void 0 : _b.sync) === null || _c === void 0 ? void 0 : _c.listId) || !((_f = (_e = (_d = camp.config) === null || _d === void 0 ? void 0 : _d.component) === null || _e === void 0 ? void 0 : _e.sync) === null || _f === void 0 ? void 0 : _f.customLabel)) {
                console.error(`Campaign config params missing, set the listId and custom label for the campaign ${message.campaign.name}`);
            }
            ;
            yield this.initializeToken();
            const listId = ((_j = (_h = (_g = camp.config) === null || _g === void 0 ? void 0 : _g.component) === null || _h === void 0 ? void 0 : _h.sync) === null || _j === void 0 ? void 0 : _j.listId)
                || process.env.CRM_LIST_ID || "666";
            const customLabel = ((_m = (_l = (_k = camp.config) === null || _k === void 0 ? void 0 : _k.component) === null || _l === void 0 ? void 0 : _l.sync) === null || _m === void 0 ? void 0 : _m.customLabel)
                || message.campaign.id + " " + message.campaign.title;
            if (!this.token) {
                throw new Error("Token is not available");
            }
            const hasValues = yield (0, client_1.getContact)(message.contact.email, this.token);
            const done = yield (0, client_1.upsertContact)(this.token, (0, data_1.formatAction)(message, hasValues, customLabel.toLowerCase()), listId);
            if (done) {
                console.log(`Message ${message.actionId} sent`);
                return true;
            }
            console.log(`Message ${message.actionId} not sent`);
            return false;
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
        this.fetchContact = (email, context) => __awaiter(this, void 0, void 0, function* () {
            return true;
        });
        this.setSubscribed = (id, subscribed) => __awaiter(this, void 0, void 0, function* () {
            return true;
        });
        this.crmType = crm_1.CRMType.DoubleOptIn;
        this.initializeToken();
    }
}
exports.default = CleverreachCRM;
