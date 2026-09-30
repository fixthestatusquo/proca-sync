"use strict";
/*
 * EXAMPLE CRM — a starting point for a new connector. It only prints each
 * action, so you can see the message shape without touching a real API.
 *
 * CONFIGURE
 *   cp .env.example .env.yourorg
 *   # then edit .env.yourorg:
 *
 *     PROCA_USERNAME=            # proca queue credentials
 *     PROCA_PASSWORD=
 *     PROCA_QUEUE=               # queue to listen on
 *     CRM=stdout                  # must match the crm file in src/crm/
 *
 * RUN
 *   npm run start -- yourorg
 *     -> loads .env.yourorg (the positional arg is shorthand for --env yourorg)
 *   npm run start -- --env path/to/.env
 *     -> or point at an explicit file
 *
 *   npm run start is already a live process: it uses ts-node-dev, so it
 *   recompiles and restarts on file changes.
 *
 * USEFUL FLAGS
 *   --dry-run   leave the message in the queue after handling (safe to replay)
 *   --verbose   print the full message
 *   --dump      write messages to files instead of calling the CRM
 */
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
class StdOut extends crm_1.CRM {
    constructor(opt) {
        super(opt);
        this.dryRun = false;
        this.init = () => __awaiter(this, void 0, void 0, function* () {
            /*
             * init() is where a real connector builds the CRM client from the
             * credentials in the environment and stashes anything it will reuse on
             * the instance: api key, base URL, list/segment ids, a cached auth
             * token... It is async so you can also do a first handshake here and
             * fail fast (throw) if the credentials are wrong, instead of crashing on
             * the first message.
             */
            this.dryRun = process.env.DRY_RUN === "true";
            return true;
        });
        this.fetchCampaign = (campaign) => __awaiter(this, void 0, void 0, function* () {
            /*
             * WHY THIS EXISTS
             * A Proca message only carries the campaign it came from (name, title,
             * external id...). Most CRMs need more than that: the id of the list,
             * segment or group we should put the contact in — and that id lives in
             * YOUR crm, not in Proca. So on the first action of a campaign we look it
             * up (or create it) here, and return whatever shape you want to work with.
             *
             * WHEN IT RUNS
             * It is called lazily by this.campaign(message.campaign): the first time a
             * campaign name is seen, otherwise the cached result is returned. The
             * cache is in-memory (this.campaigns) and only lasts for this process, so
             * a restart refetches. Do not do real API work in the constructor: some
             * campaigns are never seen, and this defers the call until the first
             * action actually needs it.
             *
             * WHAT YOU GET
             * This object is exactly what `await this.campaign(message.campaign)`
             * returns inside handleContact, so put the fields you need on it (e.g.
             * the target list id).
             */
            return { segment: "example", id: 42, test: true, external: campaign.name };
        });
        this.handleContact = (message) => __awaiter(this, void 0, void 0, function* () {
            //optional, if campaign known, return from the cache, if not, use fetchCampaign to retrieve it
            const campaign = yield this.campaign(message.campaign);
            console.log(`${message.contact.email} -> ${campaign.segment} (${message.action.actionType})`, message);
            /*
             * Because this connector is only an example it never writes anywhere: it
             * just prints. Real connectors do the CRM call above and return true once
             * it succeeded. In DRY_RUN mode we deliberately return false so the
             * message is NACKed and stays in the queue, ready to be replayed once the
             * real code (or the credentials) are in place. Return true to ACK it.
             */
            if (this.dryRun)
                return false;
            return true;
        });
        this.crmType = crm_1.CRMType.OptIn;
    }
}
exports.default = StdOut;
