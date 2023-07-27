import crypto from "crypto";
import mailchimp from "@mailchimp/mailchimp_marketing";
import { Contact, ContactSubscription } from "./contact";

export const makeClient = () => {
  if (process.env.AUTH_TOKEN) {
    const [tok, srv] = process.env.AUTH_TOKEN.split("-");

    if (!tok || !srv)
      throw Error("make sure token has both parts [token]-[zone eg us1]");

    mailchimp.setConfig({
      apiKey: tok,
      server: srv,
    });
    return mailchimp;
  }
  throw Error("Define AUTH_TOKEN");
};

export const ping = async (client: any) => {
  return client.ping.get();
};

export const senders = async (client: any) => {
  return client.senders.list();
};

export const allLists = async (client: any): Promise<any> => {
  return client.lists.getAllLists({ count: 30 });
};

export interface List {
  id: string;
  name: string;
  contact: Record<string, any>;
  permission_reminder: string;
  campaign_defaults: {
    from_name?: string;
    from_email?: string;
    subject?: string;
    langauge?: string;
  };
}

const LIST_CACHE: Record<string, List> = {};

export const upsertList = async (
  client: any,
  name: string,
  templateName: string
) => {
  //const ls: Record<string,any>[] = await lists(client)
  console.error("not updated");
  if (name in LIST_CACHE) {
    return LIST_CACHE[name];
  }
  const count = 100;
  for (let offset = 0; ; ) {
    const {
      lists,
      total_items,
      constraints: { current_total_instances },
    } = await client.lists.getAllLists({ count, offset });

    for (const l of lists) {
      LIST_CACHE[l.name] = l;
    }
    offset += total_items;
    if (offset >= current_total_instances) break;
  }

  if (name in LIST_CACHE) return LIST_CACHE[name];

  const template = LIST_CACHE[templateName];
  if (!template) throw Error(`audience not found "${templateName}"`);
  // add
  const newList = await client.lists.createList({
    name,
    permission_reminder: template.permission_reminder,
    contact: template.contact,
    email_type_option: false,
    campaign_defaults: template.campaign_defaults,
  });
  console.log("created", newList);

  LIST_CACHE[newList.name] = newList;

  return newList;
};

export const memberHash = (email: string) => {
  const hash = crypto.createHash("md5").update(email).digest("hex");
  return hash;
};

export const addContactToList = async (
  client: any,
  list_id: string,
  member: Contact | ContactSubscription,
  verbose= false
): Promise<boolean> => {
  //  const existing = await client.searchMembers.search(member.email_address);
  //  console.log(existing);
  //  const hash = memberHash(member.email_address.toLowerCase())
  if (!member.status) {
    member.status = member.status_if_new;
  }
  try {
    const response = await client.lists.addListMember(list_id, member, {
      skipMergeValidation: true,
    });
    if (response.errors?.length) {
      console.log("aaaaaa"); //response.errors.body);
      throw new Error(response.errors);
    }
    if (verbose) {
      delete response._links;
      console.log(response);
    }
    return true;
  } catch (e: any) {
    const b = e?.response?.body || e;
    switch (b?.title) {
      case "Member Exists":
        console.log("all good, already subscribed");
        return true;
      case "Forgotten Email Not Subscribed":
      case "Member In Compliance State":
      case "Invalid Resource":
        console.log(b?.detail || b.title);
        return true;
      default:
      console.log("unexpected error", b);
    }
    return false;
  }
  return true;
};

export const findMember = async (client: any, email: string) => {
  const result = await client.searchMembers.search(email);
  //  exact_matches: { members: [ [Object] ], total_items: 1 },

  if (!(result?.exact_matches?.total_items === 1)) return false;
  return result.exact_matches.members;
};
