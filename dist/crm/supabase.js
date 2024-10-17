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
const queue_1 = require("@proca/queue");
class SupabaseCRM extends crm_1.CRM {
    constructor(opt) {
        super(opt);
        this.openPublishChannel = (rabbit) => {
            console.log("ready to redispatch approved candidates");
            this.pub = rabbit.createPublisher({
                // Enable publish confirmations, similar to consumer acknowledgements
                confirm: true,
                // Enable retries
                maxAttempts: 2,
                // Optionally ensure the existence of an exchange before we use it
                //exchanges: [{exchange: 'my-events', type: 'topic'}]
            });
        };
        this.init = () => __awaiter(this, void 0, void 0, function* () {
            // build the api connection, potentially load some constant or extra data you might need
            const { data, error } = yield this.crmAPI.auth.signInWithPassword({
                email: this.config.user,
                password: this.config.password,
            });
            this.crmAPI.auth.startAutoRefresh();
            (0, queue_1.listenConnection)(this.openPublishChannel);
            const channel = this.crmAPI
                .channel("schema-db-changes")
                .on("postgres_changes", {
                event: "UPDATE",
                schema: "public",
            }, (payload) => __awaiter(this, void 0, void 0, function* () {
                if (payload.table === "actions" &&
                    payload.eventType === "UPDATE" &&
                    payload.new.campaign_id === 608) {
                    try {
                        console.log(payload.new.status, payload.new.data);
                        yield this.dispatchEvent(payload.new.status, payload.new.data);
                    }
                    catch (e) {
                        console.log(e);
                    }
                }
                else {
                    console.log("skipping", payload);
                }
            }))
                .subscribe();
            console.log("receive notifications", error);
            if (error) {
                console.log(error);
                return false;
            }
            return true;
        });
        this.dispatchEvent = (status, data) => __awaiter(this, void 0, void 0, function* () {
            console.log("not redispatch event");
            if (status !== "approved") {
                console.log("ignoring status:", status, data.actionId);
                return false;
            }
            console.log(data);
            try {
                const r = yield this.pub.send("cus.320.deliver", JSON.stringify(data));
                console.log("send", data);
            }
            catch (e) {
                console.log(e);
            }
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
            const { error } = yield this.crmAPI.from("actions").insert(data);
            if (!error)
                return true;
            if (error.code === "23505")
                //ack already processed 'duplicate key value violates unique constraint "actions_proca_id_key"'
                return true;
            console.log(error);
            return false;
        });
        this.crmType = crm_1.CRMType.OptIn;
        if (!process.env.CRM_URL) {
            console.error("you need to set the url of your crm endpoint in the .env.xx");
            process.exit(1);
        }
        if (!process.env.AUTH_USER || !process.env.AUTH_PASS) {
            console.error("you need to set the AUTH_USER and AUTH_PASSWORD for your supabase access and  in the .env.xx");
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
exports.default = SupabaseCRM;
