"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
exports.init = exports.CRM = exports.CRMType = void 0;
var CRMType;
(function (CRMType) {
    CRMType[CRMType["ActionContact"] = 0] = "ActionContact";
    CRMType[CRMType["Contact"] = 1] = "Contact";
    CRMType[CRMType["OptIn"] = 2] = "OptIn";
    //  DoubleOptIn, @marcin, can we easily do that? it'd need to memstore temporarily contacts until the doubleoptin arrives, right?
})(CRMType = exports.CRMType || (exports.CRMType = {}));
class CRM {
    constructor(opt) {
        this.fetchCampaign = (campaign) => __awaiter(this, void 0, void 0, function* () {
            // we don't fetch nor create the campaign from the CRM, by default we consider that all information needed is the name of the campaign as set on proca
            // in most CRMs, you'll want to fetch the campaign details from the CRM or create one if it doesn't exist
            // by campaign, we mean whatever your CRM uses to segment contacts and actions, it might be named list, segment...
            return Promise.resolve(campaign);
        });
        this.fetchContact = (email) => __awaiter(this, void 0, void 0, function* () {
            throw new Error("you need to implement fetchContact in your CRM");
        });
        this.setSubscribed = (id, subscribed) => __awaiter(this, void 0, void 0, function* () {
            throw new Error("you need to implement setSubscribed in your CRM");
        });
        this.setBounce = (id, bounced) => __awaiter(this, void 0, void 0, function* () {
            throw new Error("you need to implement setBounce in your CRM");
        });
        this.handleContact = (message) => __awaiter(this, void 0, void 0, function* () {
            throw new Error("you need to implement handleContact in your CRM");
        });
        this.formatResult = (result) => {
            if (typeof result === "boolean")
                return result;
            return result.processed;
        };
        this.handleActionContact = (message) => __awaiter(this, void 0, void 0, function* () {
            switch (this.crmType) {
                case CRMType.Contact:
                    if (message.privacy.withConsent)
                        return this.formatResult(yield this.handleContact(message));
                    console.error("don't know how to process", message);
                    break;
                case CRMType.OptIn:
                    if (message.privacy.optIn) {
                        return this.formatResult(yield this.handleContact(message));
                    }
                    if (message.privacy.optIn === false) {
                        this.verbose && console.log('opt-out', message.actionId);
                        return true; //OptOut contact, we don't need to process
                    }
                    console.error("don't know how to process - optin", message);
                    break;
                case CRMType.ActionContact:
                    throw new Error("You need to eith: \n -define handleActionContact on your CRM or\n- set crmType to Contact or OptIn");
                default:
                    throw new Error("unexpected crmType " + this.crmType);
            }
            console.error("need, because ts wants a return boolean");
            return false;
        });
        this.campaign = (campaign) => __awaiter(this, void 0, void 0, function* () {
            const name = campaign.name;
            if (!this.campaigns[name]) {
                this.campaigns[name] = yield this.fetchCampaign(campaign);
            }
            return Promise.resolve(this.campaigns[name]);
        });
        this.handleEmailStatusChange = (event) => __awaiter(this, void 0, void 0, function* () {
            // If we want to detect supporter clicking on opt in link in email, we can do this here
            // this happens after the action was done, timeline:
            //
            // 1. Supporter signs form
            // 2. Action message arrives, Signature is added
            // 3. Supporter receives an email (click button to subscribe)
            // 4. Supporter clicks this link
            // 5. Event message arrives, We set them as subscribed
            // OR:
            // 3. Supporter email bounces (invalid email)
            // 4. Event message arrives, We set Contact as bounced
            if (event.eventType === "email_status") {
                // handle only email status updates
                // check if we have that contact in CRM
                const cont = yield this.fetchContact(event.supporter.contact.email);
                // if not, ignore the event about non-existing contact
                if (!cont)
                    return true;
                switch (event.supporter.privacy.emailStatus) {
                    // do this if you want to change the subscription based on opt in in email
                    // the timestamp of this opt in is in event.supporter.privacy.emailStatusChanged
                    case "double_opt_in": {
                        console.log(`Double opt in from ${event.supporter.contact.email}`);
                        yield this.setSubscribed(cont.id, true);
                        break;
                    }
                    // Different kinds of problems with email delivery:
                    case "bounce": // bounce
                    case "blocked": // pre-blocked by our transactional email provider (malformed etc)
                    case "spam": // supporter clicked "this is spam" on our email
                    case "unsub": {
                        // supporter clicked "unsubscribe" on our email (if provided by Gmail etc)
                        console.log(`${event.supporter.privacy.emailStatus} from ${event.supporter.contact.email}`);
                        yield this.setBounce(cont.id, true);
                        break;
                    }
                }
            }
            return true;
        });
        this.handleEvent = (message) => __awaiter(this, void 0, void 0, function* () {
            return Promise.resolve({ processed: false });
        });
        this.verbose = (opt === null || opt === void 0 ? void 0 : opt.verbose) || false;
        this.pause = (opt === null || opt === void 0 ? void 0 : opt.pause) || false;
        this.campaigns = {};
        this.crmType = CRMType.ActionContact;
    }
}
exports.CRM = CRM;
const init = (config) => __awaiter(void 0, void 0, void 0, function* () {
    if (!process.env.CRM) {
        console.error("you need to set CRM= in your .env to match a class in src/crm/{CRM}.ts");
        throw new Error("missing process.env.CRM");
    }
    const crm = yield Promise.resolve().then(() => __importStar(require("./crm/" + process.env.CRM)));
    if (crm.default) {
        return new crm.default(config);
    }
    else {
        throw new Error(process.env.CRM + " missing export default YourCRM");
    }
});
exports.init = init;
