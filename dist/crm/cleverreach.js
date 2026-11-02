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
const crm_ts_1 = require("../crm.js");
const proca_ts_1 = require("../proca.js");
const client_ts_1 = require("./cleverreach/client.js");
const data_ts_1 = require("./cleverreach/data.js");
class CleverreachCRM extends crm_ts_1.CRM {
    constructor(opt) {
        super(opt);
        this.token = null;
        this.campaignCache = new Map(); // Store campaigns in memory
        this.handleCampaignUpdate = (message) => __awaiter(this, void 0, void 0, function* () {
            //we need to refetch campaign when it is updated
            yield this.fetchCampaign({
                id: message.campaignId,
                name: message.campaign.name,
                title: message.campaign.title,
                externalId: message.campaign.externalId,
            });
            return true;
        });
        this.fetchCampaign = (campaign) => __awaiter(this, void 0, void 0, function* () {
            const id = campaign.id;
            if (!id)
                throw new Error("campaign has no id, cannot fetch");
            const r = yield (0, proca_ts_1.fetchCampaign)(id);
            this.campaignCache.set(id, r);
            return r;
        });
        this.initializeToken = () => __awaiter(this, void 0, void 0, function* () {
            try {
                this.token = yield (0, client_ts_1.getToken)();
            }
            catch (_error) {
                throw new Error("Failed to retrieve token");
            }
        });
        this.handleMessage = (message) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
            if (this.verbose) {
                console.log(message);
            }
            let camp = message.campaign.id
                ? this.campaignCache.get(message.campaign.id)
                : undefined;
            if (!camp) {
                camp = yield this.fetchCampaign(message.campaign);
            }
            // listId might be different for each campaign
            // custom label is different for each campaign
            if (!((_c = (_b = (_a = camp.config) === null || _a === void 0 ? void 0 : _a.component) === null || _b === void 0 ? void 0 : _b.sync) === null || _c === void 0 ? void 0 : _c.listId) ||
                !((_f = (_e = (_d = camp.config) === null || _d === void 0 ? void 0 : _d.component) === null || _e === void 0 ? void 0 : _e.sync) === null || _f === void 0 ? void 0 : _f.customLabel)) {
                console.error(`Campaign config params missing, set the listId and custom label for the campaign ${message.campaign.name}`);
            }
            yield this.initializeToken();
            const listId = (_j = (_h = (_g = camp.config) === null || _g === void 0 ? void 0 : _g.component) === null || _h === void 0 ? void 0 : _h.sync) === null || _j === void 0 ? void 0 : _j.listId;
            const customLabel = (_m = (_l = (_k = camp.config) === null || _k === void 0 ? void 0 : _k.component) === null || _l === void 0 ? void 0 : _l.sync) === null || _m === void 0 ? void 0 : _m.customLabel;
            if (!this.token) {
                throw new Error("Token is not available");
            }
            const hasValues = yield (0, client_ts_1.getContact)(message.contact.email, this.token);
            const done = yield (0, client_ts_1.upsertContact)(this.token, (0, data_ts_1.formatAction)(message, hasValues, customLabel.toLowerCase()), listId);
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
            var _a, _b;
            if (message.eventType === "campaign_updated") {
                return this.handleCampaignUpdate(message);
            }
            if (message.eventType !== "email_status")
                return true;
            console.log("Event taken from queue", (_a = message.action) === null || _a === void 0 ? void 0 : _a.id);
            const normalized = Object.assign(Object.assign({}, message), { contact: message.supporter.contact, privacy: message.supporter.privacy, actionId: (_b = message.action) === null || _b === void 0 ? void 0 : _b.id });
            return this.handleMessage(normalized);
        });
        this.fetchContact = (_email, _context) => __awaiter(this, void 0, void 0, function* () {
            return true;
        });
        this.setSubscribed = (_id, _subscribed) => __awaiter(this, void 0, void 0, function* () {
            return true;
        });
        this.setBounce = (id, bounced) => __awaiter(this, void 0, void 0, function* () {
            console.log(`setBounce ${id} ${bounced}: not synced to CleverReach, ignoring`);
            return true;
        });
        this.crmType = crm_ts_1.CRMType.DoubleOptIn;
        this.initializeToken();
    }
}
exports.default = CleverreachCRM;
