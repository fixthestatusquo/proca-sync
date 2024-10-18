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
class PublicCommentCRM extends crm_1.CRM {
    constructor(opt) {
        super(opt);
        this.init = () => __awaiter(this, void 0, void 0, function* () {
            // build the api connection, potentially load some constant or extra data you might need
            if (this.config.user) {
                const { data, error } = yield this.crmAPI.auth.signInWithPassword({
                    email: this.config.user,
                    password: this.config.password,
                });
                console.log(data, error);
                if (error)
                    throw new Error(error);
                this.crmAPI.auth.startAutoRefresh();
            }
            else {
                console.info("Starting as anonymous. Consider adding AUTH_USER and AUTH_PATH in your env instead.");
                //      const { data, error } = await this.crmAPI.auth.signInAnonymously();
                //      console.log(data, error);
                //if (error) throw new Error (error);
                //this.crmAPI.auth.startAutoRefresh();
            }
            return true;
        });
        this.fetchCampaign = (campaign) => __awaiter(this, void 0, void 0, function* () {
            return campaign;
        });
        this.handleContact = (message) => __awaiter(this, void 0, void 0, function* () {
            if (this.verbose) {
                console.log("processing...", message);
            }
            const camp = yield this.campaign(message.campaign);
            const comment = message.action.customFields.comment;
            if (!comment) {
                console.log("nothing to save, no comment on the action");
                return true;
            }
            const data = {
                //      id: message.actionId, let's keep the sequence
                created_at: message.action.createdAt,
                comment: comment.toString(),
                campaign: camp.name,
                widget_id: message.actionPageId,
                uuid: message.contact.contactRef,
                lang: message.actionPage.locale,
            };
            if (message.contact.area)
                data.area = message.contact.area;
            if (message.contact.firstName) {
                data.name = message.contact.firstName.trim();
                if (message.contact.lastName) {
                    data.name += " " + message.contact.lastName.charAt(0).toUpperCase().trim();
                }
                if (message.action.customFields.locality) {
                    data.locality = message.action.customFields.locality.toString();
                    data.name = data.name + ", " + data.locality;
                }
            }
            console.log(data);
            const { error } = yield this.crmAPI.from("comments").insert(data);
            if (!error)
                return true;
            if (error.code === "23505")
                //ack already processed 'duplicate key value violates unique constraint "actions_proca_id_key"'
                return true;
            console.log(error);
            return false;
        });
        this.crmType = crm_1.CRMType.Contact;
        if (!process.env.CRM_URL) {
            console.error("you need to set the url of your crm endpoint in the .env.xx");
            process.exit(1);
        }
        let config = {
            server: process.env.CRM_URL || "missing",
            publicKey: process.env.AUTH_ANON_KEY || "missing",
            user: process.env.AUTH_USER,
            password: process.env.AUTH_PASS,
        };
        this.crmAPI = (0, supabase_js_1.createClient)(config.server, config.publicKey);
        this.config = config;
    }
}
exports.default = PublicCommentCRM;
