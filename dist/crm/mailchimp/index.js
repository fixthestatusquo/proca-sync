
var __awaiter = (this && this.__awaiter) || ((thisArg, _arguments, P, generator) => {
    function adopt(value) { return value instanceof P ? value : new P((resolve) => { resolve(value); }); }
    return new (P || (P = Promise))((resolve, reject) => {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
});
var __importDefault = (this && this.__importDefault) || ((mod) => (mod && mod.__esModule) ? mod : { "default": mod });
Object.defineProperty(exports, "__esModule", { value: true });
exports.cli = void 0;
const minimist_1 = __importDefault(require("minimist"));
const queue_1 = require("@proca/queue");
const crypto_1 = require("@proca/crypto");
const client_1 = require("./client");
const contact_1 = require("./contact");
const cli = (argv) => __awaiter(void 0, void 0, void 0, function* () {
    const opt = (0, minimist_1.default)(argv);
    const client = (0, client_1.makeClient)();
    if (opt.h || opt.help) {
        console.log(`mailchimp-sync [-psl]
-t test sign-in (ping API)
-s list senders
-e email - search member by email
-l get lists
-L break-down lists by language
-T audienceName audience name used as template for new lists
-A audienceName - just add all to that audience
-U upsert list (-c listname)
-D subcribe after DOI
-O opt out as transactional
-o only opt ins
-S skip campaigns
-P amqp prefetch count
-k keystore
    `);
    }
    if (opt.t) {
        console.log(yield (0, client_1.ping)(client));
    }
    if (opt.s) {
        const r = yield (0, client_1.senders)(client);
        console.log(r);
    }
    if (opt.l) {
        const { lists } = yield (0, client_1.allLists)(client);
        console.log(JSON.stringify(lists, null, 2));
    }
    if (opt.U) {
        (0, client_1.upsertList)(client, opt.c, opt.T)
            .then(x => console.log(x))
            .catch(e => console.error('cant upsert', e));
    }
    if (opt.e) {
        (0, client_1.findMember)(client, opt.e)
            .then(x => console.log(JSON.stringify(x, null, 2)))
            .catch(e => console.error('cont find', e));
    }
    let keyStore;
    if (opt.k) {
        keyStore = (0, crypto_1.loadKeyStoreFromFile)(opt.k);
    }
    if (opt.q) {
        const url = opt.u || process.env.QUEUE_URL;
        const templateList = opt.T || process.env.TEMPLATE_LIST;
        const targetList = opt.A || process.env.TARGET_LIST;
        const listPerLang = Boolean(opt.L);
        const skipCampaigns = opt.S ? opt.S.split(",") : [];
        if (!targetList && !templateList)
            throw Error("Please provide target audience with -A or template audience with -T");
        if (!url)
            throw Error(`Provide -u or set QUEUE_URL`);
        (0, queue_1.syncQueue)(url, opt.q, (action) => __awaiter(void 0, void 0, void 0, function* () {
            var _a, _b, _c;
            if (action.schema === 'proca:action:2') {
                if (action.campaign.name in skipCampaigns) {
                    console.info(`Not syncing action because ${action.campaign.name} is skipped`);
                    return false;
                }
                if (!(0, contact_1.isActionSyncable)(action, opt.o)) {
                    console.info(`Not syncing action id ${action.actionId} (no consent/opt in)`);
                    return false;
                }
                const list = targetList ?
                    yield (0, client_1.upsertList)(client, targetList, targetList) : // XXX use upsert to fetch
                    yield (0, client_1.upsertList)(client, (0, contact_1.listName)(action, listPerLang), templateList);
                const member = (0, contact_1.actionToContactRecord)(action, Boolean(opt.D), Boolean(opt.O));
                const r = yield (0, client_1.addContactToList)(client, list.id, member);
                console.log(`added ${member.email_address} (status ${member.status_if_new}) to list ${list.name} (id ${list.id})`);
                // console.log(r)
                return r;
            }
            if (action.schema === 'proca:event:2' && action.eventType === 'email_status') {
                const record = (0, contact_1.emailChangedToContactRecord)(action);
                if (record) {
                    const search = yield (0, client_1.findMember)(client, action.supporter.contact.email);
                    if (search.exact_matches.members.length === 0) {
                        throw Error(`Did not find ${action.supporter.contact.email}`);
                    }
                    for (const member of search.exact_matches.members) {
                        try {
                            const r = yield (0, client_1.addContactToList)(client, member.list_id, record);
                            console.log(`Update ${action.supporter.contact.contactRef} status to ${r.status}`);
                        }
                        catch (e) {
                            const reason = (_c = (_b = (_a = e.response) === null || _a === void 0 ? void 0 : _a.error) === null || _b === void 0 ? void 0 : _b.text) === null || _c === void 0 ? void 0 : _c.title;
                            if (reason === "Member In Compliance State") {
                                console.warn(`Cannot update ${action.supporter.contact.email} because ${reason}`);
                            }
                            else {
                                throw e;
                            }
                        }
                    }
                }
                else {
                    console.log(action);
                    console.warn(`Ignore event ${action.eventType} for ${action.supporter.contact.email}`);
                }
                // XXX handle clear and double opt in
                return false;
            }
        }), { keyStore, prefetch: opt.P || 10 }).catch(e => console.error(e));
    }
});
exports.cli = cli;
/*
 *
 * */
