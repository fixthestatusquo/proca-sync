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
const supabase_js_1 = require("@supabase/supabase-js");
class SupabaseCRM extends crm_1.CRM {
    constructor(opt) {
        super(opt);
        this.init = () => __awaiter(this, void 0, void 0, function* () {
            const { data, error } = yield this.crmAPI.auth.signInWithPassword({
                email: this.config.user,
                password: this.config.password,
            });
            console.log(data, error);
            if (error) {
                console.log(error);
                return false;
            }
            return true;
        });
        this.fetchCampaign = (campaign) => __awaiter(this, void 0, void 0, function* () {
            // usually, fetch the campaign id as set on the CRM (based on the name of proca)
            return campaign.id;
        });
        this.handleContact = (message) => __awaiter(this, void 0, void 0, function* () {
            if (this.verbose) {
                console.log("processing...", message);
            }
            const camp = yield this.campaign(message.campaign);
            const data = {
                id: message.actionId,
                created_at: message.action.createdAt,
                proca_id: message.actionId,
                data: message,
                campaign_id: camp,
                widget_id: message.actionPageId,
                org_id: message.orgId,
                contact_ref: message.contact.contactRef,
            };
            const { error } = yield this.crmAPI
                .from('actions')
                .insert(data);
            console.log(error);
            return false;
        });
        this.crmType = crm_1.CRMType.OptIn;
        if (!process.env.CRM_URL) {
            console.error("you need to set the url of your crm endpoint in the .env.xx");
            process.exit(1);
        }
        let config = {
            server: process.env.CRM_URL || 'missing',
            user: process.env.AUTH_USER || 'missing',
            publicKey: process.env.AUTH_ANON_KEY || 'missing',
            password: process.env.AUTH_PASS || 'missing',
        };
        this.crmAPI = (0, supabase_js_1.createClient)(config.server, config.publicKey);
        this.config = config;
    }
}
exports.default = SupabaseCRM;
