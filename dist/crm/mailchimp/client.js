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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.findMember = exports.addContactToList = exports.memberHash = exports.upsertList = exports.allLists = exports.senders = exports.ping = exports.makeClient = void 0;
const crypto_1 = __importDefault(require("crypto"));
const mailchimp_marketing_1 = __importDefault(require("@mailchimp/mailchimp_marketing"));
const makeClient = () => {
    if (process.env.AUTH_TOKEN) {
        const [tok, srv] = process.env.AUTH_TOKEN.split('-');
        if (!tok || !srv)
            throw Error('make sure token has both parts xxxxxxx-YYYY');
        mailchimp_marketing_1.default.setConfig({
            apiKey: tok,
            server: srv
        });
        return mailchimp_marketing_1.default;
    }
    throw Error('Define AUTH_TOKEN');
};
exports.makeClient = makeClient;
const ping = (client) => __awaiter(void 0, void 0, void 0, function* () {
    return yield client.ping.get();
});
exports.ping = ping;
const senders = (client) => __awaiter(void 0, void 0, void 0, function* () {
    return yield client.senders.list();
});
exports.senders = senders;
const allLists = (client) => __awaiter(void 0, void 0, void 0, function* () {
    return yield client.lists.getAllLists();
});
exports.allLists = allLists;
const LIST_CACHE = {};
const upsertList = (client, name, templateName) => __awaiter(void 0, void 0, void 0, function* () {
    //const ls: Record<string,any>[] = await lists(client)
    if (name in LIST_CACHE) {
        return LIST_CACHE[name];
    }
    const count = 100;
    for (let offset = 0;;) {
        const { lists, total_items, constraints: { current_total_instances } } = yield client.lists.getAllLists({ count, offset });
        for (const l of lists) {
            LIST_CACHE[l.name] = l;
        }
        offset += total_items;
        if (offset >= current_total_instances)
            break;
    }
    if (name in LIST_CACHE)
        return LIST_CACHE[name];
    const template = LIST_CACHE[templateName];
    if (!template)
        throw Error(`audience not found "${templateName}"`);
    // add
    const newList = yield client.lists.createList({
        name,
        permission_reminder: template.permission_reminder,
        contact: template.contact,
        email_type_option: false,
        campaign_defaults: template.campaign_defaults
    });
    console.log('created', newList);
    LIST_CACHE[newList.name] = newList;
    return newList;
});
exports.upsertList = upsertList;
const memberHash = (email) => {
    const hash = crypto_1.default.createHash('md5').update(email).digest('hex');
    return hash;
};
exports.memberHash = memberHash;
const addContactToList = (client, list_id, member) => __awaiter(void 0, void 0, void 0, function* () {
    const hash = (0, exports.memberHash)(member.email_address.toLowerCase());
    const result = yield client.lists.setListMember(list_id, hash, member, { skipMergeValidation: true });
    return result;
});
exports.addContactToList = addContactToList;
const findMember = (client, email) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield client.searchMembers.search(email);
    return result;
});
exports.findMember = findMember;
