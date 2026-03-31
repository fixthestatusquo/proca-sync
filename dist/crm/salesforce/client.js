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
exports.foo = exports.upsertContact = exports.upsertLead = exports.leadByEmail = exports.contactByEmail = exports.addCampaignContact = exports.fields = exports.campaignByName = exports.makeClient = void 0;
const jsforce_1 = require("jsforce");
const makeClient = (opt) => __awaiter(void 0, void 0, void 0, function* () {
    const conn = new jsforce_1.Connection({ loginUrl: opt.server });
    //  const u = `${process.env.AUTH_USER}`
    //  const p = `${process.env.AUTH_PASSWORD}${process.env.AUTH_TOKEN}`
    const userInfo = yield conn.login(opt.user, opt.password + opt.token);
    return { conn, userInfo };
});
exports.makeClient = makeClient;
const campaignByName = (conn, name, opt) => __awaiter(void 0, void 0, void 0, function* () {
    let campaign;
    const campaignTypeId = opt.campaignType;
    // fetch
    const r = yield conn.sobject("Campaign").find({ name: name });
    // fail hard on missing campaign
    if (r.length === 0) {
        console.log("will try to create " + name);
        const cattr = { name: name, Type: "Proca" };
        if (campaignTypeId)
            cattr["RecordTypeId"] = campaignTypeId;
        const n = yield conn.sobject("Campaign").create(cattr); //  'Proca online campaign'
        if (!n.success)
            throw Error(`Cannot create campaign ${name}: ${n.errors}`);
        campaign = yield conn.sobject("Campaign").retrieve(n.id);
    }
    else {
        campaign = r[0];
    }
    return campaign;
});
exports.campaignByName = campaignByName;
const fields = (conn, name) => __awaiter(void 0, void 0, void 0, function* () {
    const r = yield conn.sobject(name).describe();
    const f = r.fields.map((d) => d.name);
    console.log(name, "fields", f);
    return r;
});
exports.fields = fields;
const addCampaignContact = (conn, CampaignId, memberId, _action) => __awaiter(void 0, void 0, void 0, function* () {
    // const _addedDate = action.action.createdAt.split("T")[0]
    const resp = yield conn
        .sobject("CampaignMember")
        .find(Object.assign({ CampaignId }, memberId))
        .update({ Status: "Responded" });
    if (resp.length !== 0)
        return resp[0];
    // console.log(`creating campaign membership  ${ContactId} -> ${CampaignId}`)
    const r2 = yield conn
        .sobject("CampaignMember")
        .create(Object.assign({ CampaignId, Status: "Responded" }, memberId));
    return r2;
});
exports.addCampaignContact = addCampaignContact;
const contactByEmail = (conn, Email) => __awaiter(void 0, void 0, void 0, function* () {
    // return await conn.query(`SELECT id, firstname, lastname, email, phone FROM Contact WHERE email =  '${email}'`)
    const r = yield conn.sobject("Contact").find({ Email });
    return r[0];
});
exports.contactByEmail = contactByEmail;
const leadByEmail = (conn, Email) => __awaiter(void 0, void 0, void 0, function* () {
    // return await conn.query(`SELECT id, firstname, lastname, email, phone FROM Contact WHERE email =  '${email}'`)
    const IsConverted = false;
    const r = yield conn.sobject("Lead").find({ Email, IsConverted });
    return r[0];
});
exports.leadByEmail = leadByEmail;
const upsertLead = (conn, contact) => __awaiter(void 0, void 0, void 0, function* () {
    let r;
    try {
        r = yield conn.sobject("Lead").upsert(contact, "Email");
    }
    catch (er) {
        if (er.name === "MULTIPLE_CHOICES") {
            const idPath = er.content[er.content.length - 1].split("/");
            console.warn(`Duplicate records for ${contact.Email}:  ${er.content}, returning last one`);
            return idPath[idPath.length - 1];
        }
        else if (er.name === "CANNOT_UPDATE_CONVERTED_LEAD") {
            r = yield conn.sobject("Lead").create(contact);
            // returns id: ... success: true
        }
        else {
            console.log(`LEAD UPSERT ERROR, unhandled er.name='${er.name}'`);
            yield (0, exports.fields)(conn, "Lead"); // trying to help here and show available fields
            throw er;
        }
    }
    // for success value, id can be there
    if (r && "id" in r && r.id)
        return r.id; // I just can't.... id vs Id sometimes returned
    const e = yield (0, exports.leadByEmail)(conn, contact.Email);
    return e.Id;
});
exports.upsertLead = upsertLead;
const upsertContact = (conn, contact) => __awaiter(void 0, void 0, void 0, function* () {
    const r = yield conn.sobject("Contact").upsert(contact, "Email");
    if (!r.success)
        throw Error(`Error upserting contact: ${r.errors}`);
    if (r.id)
        return r.id; // I just can't.... id vs Id
    // On update, id is *not* returned - we have to fetch - SAD!
    const e = yield (0, exports.contactByEmail)(conn, contact.Email);
    return e.Id;
});
exports.upsertContact = upsertContact;
const foo = (conn) => __awaiter(void 0, void 0, void 0, function* () {
    return yield conn
        .sobject("CampaignMember")
        .find({}, { limit: 10, offset: 0 });
});
exports.foo = foo;
