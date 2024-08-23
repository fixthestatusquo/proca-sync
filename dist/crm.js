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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.init = exports.CRM = exports.CRMType = exports.ProcessStatus = void 0;
const cli_color_1 = __importDefault(require("cli-color"));
const spinner_1 = require("./spinner");
var ProcessStatus;
(function (ProcessStatus) {
    ProcessStatus[ProcessStatus["unknown"] = 0] = "unknown";
    ProcessStatus[ProcessStatus["processed"] = 1] = "processed";
    ProcessStatus[ProcessStatus["skipped"] = 2] = "skipped";
    ProcessStatus[ProcessStatus["ignored"] = 3] = "ignored";
    ProcessStatus[ProcessStatus["error"] = 4] = "error";
})(ProcessStatus || (exports.ProcessStatus = ProcessStatus = {}));
var CRMType;
(function (CRMType) {
    CRMType[CRMType["ActionContact"] = 0] = "ActionContact";
    CRMType[CRMType["Contact"] = 1] = "Contact";
    CRMType[CRMType["OptIn"] = 2] = "OptIn";
    CRMType[CRMType["DoubleOptIn"] = 3] = "DoubleOptIn";
})(CRMType || (exports.CRMType = CRMType = {}));
class CRM {
    constructor(opt) {
        this.colorStatus = (status) => {
            switch (status) {
                case ProcessStatus.processed: return cli_color_1.default.green;
                case ProcessStatus.skipped: return cli_color_1.default.blue;
                case ProcessStatus.ignored: return cli_color_1.default.magenta;
                case ProcessStatus.error: return cli_color_1.default.red;
            }
            return ((d) => d);
        };
        this.log = (text, status) => {
            //  progress: (count: number; suffix: string; color:string);
            const newline = status == ProcessStatus.error || !this.interactive || !text;
            (0, spinner_1.spin)(this.count.ack + this.count.nack, text || "", { wrapper: this.colorStatus(status), newline: newline });
            if (status)
                this.lastStatus = status;
        };
        this.error = (text) => this.log(text, ProcessStatus.error);
        this.init = () => __awaiter(this, void 0, void 0, function* () {
            //optional async init for extran fetch and setup that can't be done in the constructor
            return true;
        });
        this.fetchCampaign = (campaign) => __awaiter(this, void 0, void 0, function* () {
            // we don't fetch nor create the campaign from the CRM, by default we consider that all information needed is the name of the campaign as set on proca
            // in most CRMs, you'll want to fetch the campaign details from the CRM or create one if it doesn't exist
            // by campaign, we mean whatever your CRM uses to segment contacts and actions, it might be named list, segment...
            return Promise.resolve(campaign);
        });
        this.fetchContact = (email, context) => __awaiter(this, void 0, void 0, function* () {
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
            var _a, _b, _c, _d;
            switch (this.crmType) {
                case CRMType.Contact:
                    if (message.privacy.withConsent) {
                        const r = this.formatResult(yield this.handleContact(message));
                        if (r) {
                            this.log("added " + message.contact.email + " " + message.action.createdAt, ProcessStatus.processed);
                        }
                        else {
                            this.log("failed " + message.contact.email + " " + message.action.createdAt, ProcessStatus.error);
                        }
                        return r;
                    }
                    this.log("don't know how to process " + message.contact.email, ProcessStatus.error);
                    break;
                case CRMType.OptIn:
                    if (!message.privacy.withConsent) {
                        this.log("no withConsent " + message.actionId + " ," + message.action.actionType, ProcessStatus.skipped);
                        return true;
                    }
                    if (message.privacy.withConsent && message.privacy.optIn) {
                        const r = this.formatResult(yield this.handleContact(message));
                        if (r) {
                            this.log("added " + message.contact.email + " " + message.action.createdAt, ProcessStatus.processed);
                        }
                        else {
                            this.log("failed " + message.contact.email + " " + message.action.createdAt, ProcessStatus.error);
                        }
                        return r;
                    }
                    if (message.privacy.optIn === false) {
                        this.log("opt-out " + message.actionId, ProcessStatus.skipped);
                        //          this.verbose && console.log('opt-out',message.actionId);
                        return true; //OptOut contact, we don't need to process
                    }
                    if (message.privacy.optIn === true) {
                        this.log("opt-in, but no withConsent " + message.actionId + ' ' + ((_a = message.action) === null || _a === void 0 ? void 0 : _a.actionType), ProcessStatus.skipped);
                        //          this.verbose && console.log('opt-out',message.actionId);
                        return true; //OptOut contact, we don't need to process
                    }
                    if (((_b = message.privacy) === null || _b === void 0 ? void 0 : _b.emailStatus) === 'double_opt_in') { // double opt-in is optin (eg by email)
                        const r = this.formatResult(yield this.handleContact(message));
                        if (r) {
                            this.log("added doi" + message.contact.email, ProcessStatus.processed);
                        }
                        else {
                            this.log("failed doi" + message.contact.email, ProcessStatus.error);
                        }
                        return r;
                    }
                    if (message.privacy.optIn === null) {
                        this.log("optIn null (implicit) withConsent " + message.actionId + ' ' + ((_c = message.action) === null || _c === void 0 ? void 0 : _c.actionType), ProcessStatus.skipped);
                        return true;
                        /*
                        const r = this.formatResult(await this.handleContact(message));
                        if (r) {
                          this.log("added with implicit optin" + message.contact.email+ " "+message.action.createdAt, ProcessStatus.processed);
                        } else {
                          this.log("failed with implicit optin" + message.contact.email+ " "+message.action.createdAt, ProcessStatus.error);
                        }
                        return r; */
                    }
                    console.log(message);
                    this.log("don't know how to process -optin " + message.actionId, ProcessStatus.error);
                    break;
                case CRMType.DoubleOptIn:
                    if (((_d = message.privacy) === null || _d === void 0 ? void 0 : _d.emailStatus) === 'double_opt_in') {
                        const r = this.formatResult(yield this.handleContact(message));
                        if (r) {
                            this.log("added doi " + message.contact.email + " " + message.actionId, ProcessStatus.processed);
                            return true;
                        }
                        else {
                            this.log("failed doi " + message.contact.email + " " + message.actionId, ProcessStatus.error);
                            return false;
                        }
                    }
                    ;
                    this.log("skip sending, it is not double opt in " + message.contact.email + " " + message.actionId, ProcessStatus.error);
                    return true;
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
        this.interactive = (opt === null || opt === void 0 ? void 0 : opt.interactive) || false;
        this.campaigns = {};
        this.crmType = CRMType.ActionContact;
        this.count = opt.count || { ack: 0, nack: 0, queued: 0 };
        this.lastStatus = ProcessStatus.unknown;
    }
}
exports.CRM = CRM;
const init = (config) => __awaiter(void 0, void 0, void 0, function* () {
    if (!process.env.CRM) {
        console.error("you need to set CRM= in your .env to match a class in src/crm/{CRM}.ts");
        throw new Error("missing process.env.CRM");
    }
    const crm = yield Promise.resolve(`${"./crm/" + process.env.CRM}`).then(s => __importStar(require(s)));
    if (crm.default) {
        const instance = new crm.default(config);
        const success = yield instance.init();
        if (!success) {
            console.error("can't initialise the crm, we stop");
            process.exit(1);
        }
        return instance;
    }
    else {
        throw new Error(process.env.CRM + " missing export default YourCRM");
    }
});
exports.init = init;
