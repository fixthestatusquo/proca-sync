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
const utils_1 = require("../utils");
const proca_1 = require("../proca");
class RateLimiter {
    constructor(maxPerMinute = 80) {
        this.timestamps = [];
        this.haltMs = 15000;
        this.haltPromise = null;
        this.maxPerMinute = maxPerMinute;
    }
    throttle() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.haltPromise) {
                yield this.haltPromise;
            }
            const now = Date.now();
            const windowStart = now - 60000;
            this.timestamps = this.timestamps.filter((t) => t > windowStart);
            if (this.timestamps.length >= this.maxPerMinute) {
                const oldest = this.timestamps[0];
                const waitMs = oldest + 60000 - now + 100;
                console.warn(`[ohme] Rate limit reached, waiting ${waitMs}ms`);
                yield this.sleep(waitMs);
                this.timestamps = this.timestamps.filter((t) => t > Date.now() - 60000);
            }
            this.timestamps.push(Date.now());
        });
    }
    halt() {
        if (this.haltPromise)
            return;
        console.warn("[ohme] 429 received — halting all requests for 15s");
        this.haltPromise = this.sleep(this.haltMs).then(() => {
            this.timestamps = [];
            this.haltPromise = null;
        });
    }
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
class OhmeCRM extends crm_1.CRM {
    constructor(opt) {
        super(opt);
        this.fetchContact = (email) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            const { data } = yield this.ohmeRequest("GET", `/contacts?email=${encodeURIComponent(email)}`);
            return (_a = data[0]) !== null && _a !== void 0 ? _a : null;
        });
        this.handleContact = (message) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            const email = message.contact.email;
            const camp = yield this.campaign(message.campaign);
            try {
                let upsertResult;
                try {
                    upsertResult = yield this.upsertContact(this.buildContactPayload(message, camp));
                }
                catch (e) {
                    if (e.status === 429)
                        throw e;
                    // 422 + errors.email means Ohme rejected the address itself (e.g. "a..b@x.com") —
                    // permanently invalid, so skip instead of requeuing forever
                    if (e.status === 422 && ((_b = (_a = e.body) === null || _a === void 0 ? void 0 : _a.errors) === null || _b === void 0 ? void 0 : _b.email)) {
                        this.log(`[ohme] invalid email, skipping: ${email} (${(_c = e.body) === null || _c === void 0 ? void 0 : _c.message})`, crm_1.ProcessStatus.skipped);
                        return { processed: true };
                    }
                    this.error(`[ohme] upsert failed for ${email} (no existing contact found): ${JSON.stringify(e)}`);
                    return { processed: false };
                }
                const { contact, isNew } = upsertResult;
                if (isNew && this.sourceField) {
                    try {
                        yield this.ohmeRequest("PUT", `/contacts/${contact.id}`, {
                            [this.sourceField]: message.campaign.name,
                        });
                    }
                    catch (e) {
                        this.error(`[ohme] failed to set source for ${email}: ${JSON.stringify(e)}`);
                    }
                }
                try {
                    yield this.createInteraction(this.buildInteractionPayload(message, contact, camp));
                }
                catch (e) {
                    if (e.status === 429)
                        throw e;
                    this.error(`[ohme] interaction failed for ${email}: ${JSON.stringify(e)}`);
                    return { processed: false };
                }
                this.log(`[ohme] ${isNew ? "created" : "updated"} ${email}`, undefined);
                return { processed: true };
            }
            catch (e) {
                if (e.status === 429) {
                    this.error(`[ohme] 429 received, halting`);
                    return { processed: false };
                }
                this.error(`[ohme] unexpected error for ${email}: ${JSON.stringify(e)}`);
                return { processed: false };
            }
        });
        this.fetchCampaign = (campaign) => __awaiter(this, void 0, void 0, function* () {
            return (0, proca_1.fetchCampaign)(campaign.id);
        });
        this.setSubscribed = (_id, _subscribed) => __awaiter(this, void 0, void 0, function* () {
            return true;
        });
        this.setBounce = (_id, _bounced) => __awaiter(this, void 0, void 0, function* () {
            return true;
        });
        switch (process.env.CRM_TYPE) {
            case "DOUBLE_OPTIN":
                this.crmType = crm_1.CRMType.DoubleOptIn;
                break;
            case "CONTACT":
                this.crmType = crm_1.CRMType.Contact;
                break;
            case "ACTION_CONTACT":
                this.crmType = crm_1.CRMType.ActionContact;
                break;
            default:
                // 'OPTIN'
                this.crmType = crm_1.CRMType.OptIn;
        }
        this.ohmeUrl =
            process.env.CRM_API_URL || "https://api-ohme.oneheart.fr/api/v1";
        this.user = process.env.CRM_API_USERNAME || "";
        this.token = process.env.CRM_API_TOKEN || "";
        this.sourceField = process.env.CRM_SOURCE || "";
        this.contactExtraFields = process.env.CONTACT_EXTRA_FIELDS
            ? (0, utils_1.string2map)(process.env.CONTACT_EXTRA_FIELDS)
            : undefined;
        this.interactionExtraFields = process.env.INTERACTION_EXTRA_FIELDS
            ? (0, utils_1.string2map)(process.env.INTERACTION_EXTRA_FIELDS)
            : undefined;
        this.rateLimiter = new RateLimiter(parseInt(process.env.OHME_RATE_LIMIT || "80", 10));
        if (!this.user || !this.token) {
            throw new Error("[ohme] Missing CRM_API_USERNAME or CRM_API_TOKEN in env");
        }
    }
    resolveValue(path, message, camp) {
        if (path === "true")
            return true;
        if (path === "false")
            return false;
        const context = { message, camp };
        return path.split(".").reduce((obj, key) => obj === null || obj === void 0 ? void 0 : obj[key], context);
    }
    buildContactPayload(message, camp) {
        const payload = {
            email: message.contact.email,
            firstname: message.contact.firstName,
            lastname: message.contact.lastName || "",
            language: message.actionPage.locale,
        };
        if (this.contactExtraFields) {
            for (const [ohmeField, path] of Object.entries(this.contactExtraFields)) {
                const value = this.resolveValue(path, message, camp);
                if (value !== undefined && value !== null) {
                    payload[ohmeField] = value;
                }
            }
        }
        return payload;
    }
    buildInteractionPayload(message, contact, camp) {
        const payload = {
            date: message.action.createdAt.split("T")[0],
            interaction_type_name: process.env.OHME_INTERACTION_TYPE || "Signature de Pétition",
            interaction_category_name: process.env.OHME_INTERACTION_CATEGORY || "Pétition",
            interaction_label_name: message.campaign.name,
            contact: { id: contact.id },
        };
        if (this.interactionExtraFields) {
            for (const [ohmeField, path] of Object.entries(this.interactionExtraFields)) {
                const value = this.resolveValue(path, message, camp);
                if (value !== undefined && value !== null) {
                    payload[ohmeField] = value;
                }
            }
        }
        return payload;
    }
    headers() {
        return {
            Accept: "application/json",
            "Content-Type": "application/json",
            "client-name": this.user,
            "client-secret": this.token,
        };
    }
    ohmeRequest(method, path, body) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.rateLimiter.throttle();
            const res = yield fetch(`${this.ohmeUrl}${path}`, {
                method,
                headers: this.headers(),
                body: body ? JSON.stringify(body) : undefined,
            });
            if (res.status === 429) {
                this.rateLimiter.halt();
                throw { status: 429, message: "Too Many Requests" };
            }
            const raw = yield res.json();
            const envelope = Array.isArray(raw)
                ? raw[0]
                : raw;
            if (!res.ok) {
                throw { status: res.status, body: envelope };
            }
            return { status: envelope.status, data: envelope.data };
        });
    }
    upsertContact(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            // GET first: Ohme's PUT requires the contact ID,
            // and POST will creates a new contact if, for example, last name is updated
            const existing = yield this.fetchContact(payload.email);
            if (existing) {
                yield this.ohmeRequest("PUT", `/contacts/${existing.id}`, payload);
                return { contact: existing, isNew: false };
            }
            const { data } = yield this.ohmeRequest("POST", "/contacts", payload);
            return { contact: data, isNew: true };
        });
    }
    createInteraction(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.ohmeRequest("POST", "/interactions", payload);
        });
    }
}
exports.default = OhmeCRM;
