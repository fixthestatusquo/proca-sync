
var __awaiter = (this && this.__awaiter) || ((thisArg, _arguments, P, generator) => {
    function adopt(value) { return value instanceof P ? value : new P((resolve) => { resolve(value); }); }
    return new (P || (P = Promise))((resolve, reject) => {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
});
Object.defineProperty(exports, "__esModule", { value: true });
const crm_1 = require("../crm");
//import { string2map } from "../utils";
const client_1 = require("./salesforce/client");
const contact_1 = require("./salesforce/contact");
class SalesforceCRM extends crm_1.CRM {
    constructor(opt) {
        super(opt);
        this.init = () => __awaiter(this, void 0, void 0, function* () {
            const { userInfo, conn } = yield (0, client_1.makeClient)(this.config);
            this.crmAPI = conn;
            return true;
        });
        this.fetchCampaign = (campaign) => __awaiter(this, void 0, void 0, function* () {
            const camp = yield (0, client_1.campaignByName)(this.crmAPI, campaign.name, this.config);
            return camp;
        });
        this.handleContact = (message) => __awaiter(this, void 0, void 0, function* () {
            if (this.verbose) {
                console.log("processing...", message);
            }
            try {
                const camp = yield this.campaign(message.campaign);
                const defaultLastName = "[not provided]";
                //#ExecStart=/opt/nvm/nvm-exec salesforce-sync -q cus... -l -O Opt_In__c -D -T
                if (this.config.lead) {
                    const record = (0, contact_1.actionToLeadRecord)(message, {
                        language: this.config.fieldLanguage,
                        doubleOptIn: this.config.doi,
                        optInField: this.config.fieldOptIn,
                        defaultLastName: defaultLastName,
                    });
                    const LeadId = yield (0, client_1.upsertLead)(this.crmAPI, record);
                    if (!LeadId)
                        throw Error(`Could not upsert lead`);
                    try {
                        const r = yield (0, client_1.addCampaignContact)(this.crmAPI, camp.Id, { LeadId }, message);
                    }
                    catch (e) {
                        return true;
                    }
                    //        console.log(`Added lead to campaign ${JSON.stringify(r)}`);
                }
                else {
                    const record = (0, contact_1.actionToContactRecord)(message, {
                        language: this.config.fieldLanguage,
                        doubleOptIn: this.config.doi,
                        optInField: this.config.fieldOptIn,
                        defaultLastName: defaultLastName,
                    });
                    const ContactId = yield (0, client_1.upsertContact)(this.crmAPI, record);
                    if (!ContactId)
                        throw Error(`Could not upsert contact`);
                    const r = yield (0, client_1.addCampaignContact)(this.crmAPI, camp.Id, { ContactId }, message);
                    //        console.log(`Added contact to campaign ${JSON.stringify(r)}`);
                }
                return true;
            }
            catch (er) {
                if (er.errorCode === "DUPLICATE_VALUE") {
                    // already in campaign
                    return true;
                }
                console.log(message);
                this.error(`tried to add ${message.contact.email} but error happened ` +
                    JSON.stringify(er) +
                    ` CODE>${er.errorCode}<`);
                return false;
            }
            return false;
        });
        this.crmType = crm_1.CRMType.OptIn;
        if (!process.env.SALESFORCE_URL) {
            this.error("you need to set the url of your api4 endpoint in the .env.xx");
            process.exit(1);
        }
        const config = {
            server: process.env.SALESFORCE_URL || "missing",
            token: process.env.AUTH_TOKEN || "missing",
            user: process.env.AUTH_USER || "missing",
            password: process.env.AUTH_PASSWORD || "missing",
            fieldOptIn: process.env.FIELD_OPTIN || "missing FIELD_OPTIN",
            fieldLanguage: process.env.FIELD_LANGUAGE || "",
            doi: Boolean(process.env.DOUBLE_OPT_IN),
        };
        if (process.env.SUPPORTER_TYPE && process.env.SUPPORTER_TYPE === "lead") {
            config.lead = true;
            config.contact = false;
        }
        else {
            config.lead = false;
            config.contact = true;
        }
        if (this.verbose) {
            this.crmAPI.debug(true);
        }
        if (process.env.CAMPAIGN_RECORD_TYPE) {
            config.campaignType = process.env.CAMPAIGN_RECORD_TYPE;
        }
        this.config = config;
    }
}
exports.default = SalesforceCRM;
