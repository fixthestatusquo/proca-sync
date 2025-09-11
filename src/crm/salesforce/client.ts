import { Connection, Record as SFRecord } from "jsforce";
import { ActionMessageV2 } from "@proca/queue";

export type CrmConfigType = {
  server: string;
  token: string;
  user: string;
  password: string;
  campaignType?: string;
  lead?: boolean; // should supporters be created as lead ?
  contact?: boolean; // should supporters be created as contact? (the most common)
  fieldOptIn: string;
  fieldLanguage: string;
  doi: boolean;
};

export const makeClient = async (opt: CrmConfigType) => {
  const conn = new Connection({ loginUrl: opt.server });

  //  const u = `${process.env.AUTH_USER}`
  //  const p = `${process.env.AUTH_PASSWORD}${process.env.AUTH_TOKEN}`

  const userInfo = await conn.login(opt.user, opt.password + opt.token);

  return { conn, userInfo };
};

export const campaignByName = async (
  conn: Connection,
  name: string,
  opt: any,
) => {
  let campaign;
  const campaignTypeId = opt.campaignType;

  // fetch
  const r = await conn.sobject("Campaign").find({ name: name });

  // fail hard on missing campaign
  if (r.length === 0) {
    console.log("will try to create " + name);
    const cattr: Record<string, string> = { name: name, Type: "Proca" };

    if (campaignTypeId) cattr["RecordTypeId"] = campaignTypeId;
    const n = await conn.sobject("Campaign").create(cattr); //  'Proca online campaign'
    if (!n.success) throw Error(`Cannot create campaign ${name}: ${n.errors}`);
    campaign = await conn.sobject("Campaign").retrieve(n.id);
  } else {
    campaign = r[0];
  }

  return campaign;
};

type MemberID = {
  ContactId?: string;
  LeadId?: string;
};

export const fields = async (conn: Connection, name: string) => {
  const r = await conn.sobject(name).describe();

  const f = r.fields.map((d) => d.name);
  console.log(name, "fields", f);
  return r;
};

export const addCampaignContact = async (
  conn: Connection,
  CampaignId: string,
  memberId: MemberID,
  _action: ActionMessageV2,
) => {
  // const _addedDate = action.action.createdAt.split("T")[0]
  const resp = await conn
    .sobject("CampaignMember")
    .find(Object.assign({ CampaignId }, memberId))
    .update({ Status: "Responded" });

  if (resp.length !== 0) return resp[0];
  // console.log(`creating campaign membership  ${ContactId} -> ${CampaignId}`)

  const r2 = await conn
    .sobject("CampaignMember")
    .create(Object.assign({ CampaignId, Status: "Responded" }, memberId));

  return r2;
};

export const contactByEmail = async (conn: Connection, Email: string) => {
  // return await conn.query(`SELECT id, firstname, lastname, email, phone FROM Contact WHERE email =  '${email}'`)
  const r = await conn.sobject("Contact").find({ Email });
  return r[0];
};

export const leadByEmail = async (conn: Connection, Email: string) => {
  // return await conn.query(`SELECT id, firstname, lastname, email, phone FROM Contact WHERE email =  '${email}'`)

  const IsConverted = false;
  const r = await conn.sobject("Lead").find({ Email, IsConverted });

  return r[0];
};

export const upsertLead = async (conn: Connection, contact: SFRecord) => {
  let r;

  try {
    r = await conn.sobject("Lead").upsert(contact, "Email");
  } catch (er) {
    if (er.name === "MULTIPLE_CHOICES") {
      const idPath = er.content[er.content.length - 1].split("/");
      console.warn(
        `Duplicate records for ${contact.Email}:  ${er.content}, returning last one`,
      );
      return idPath[idPath.length - 1];
    } else if (er.name === "CANNOT_UPDATE_CONVERTED_LEAD") {
      r = await conn.sobject("Lead").create(contact);
      // returns id: ... success: true
    } else {
      console.log(`LEAD UPSERT ERROR, unhandled er.name='${er.name}'`);
      await fields(conn, "Lead"); // trying to help here and show available fields
      throw er;
    }
  }

  // for success value, id can be there
  if (r && "id" in r && r.id) return r.id; // I just can't.... id vs Id sometimes returned

  const e = await leadByEmail(conn, contact.Email);
  return e.Id;
};

export const upsertContact = async (conn: Connection, contact: SFRecord) => {
  const r = await conn.sobject("Contact").upsert(contact, "Email");

  if (!r.success) throw Error(`Error upserting contact: ${r.errors}`);
  if (r.id) return r.id; // I just can't.... id vs Id

  // On update, id is *not* returned - we have to fetch - SAD!
  const e = await contactByEmail(conn, contact.Email);
  return e.Id;
};

export const foo = async (conn: Connection) => {
  return await conn
    .sobject("CampaignMember")
    .find({}, { limit: 10, offset: 0 });
};
