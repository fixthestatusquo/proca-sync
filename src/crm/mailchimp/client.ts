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

export const allCampaigns = async (
  client: any,
  list: string,
  category: string,
): Promise<any> => {
  if (!category) {
    const r = await client.lists.getListInterestCategories(list);
    const categories = r.categories || [];
    console.log(categories);
    categories &&
      categories.forEach((d: any) => {
        console.log(d.id, d.title);
      });
    return { interests: [] };
  }
  const response = await client.lists.listInterestCategoryInterests(
    list,
    category,
  );
  console.log(response);
  return response;
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
  templateName: string,
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

export const findMember = async (client: any, email: string) => {
  const result = await client.searchMembers.search(email);
  //  exact_matches: { members: [ [Object] ], total_items: 1 },

  if (!(result?.exact_matches?.total_items === 1)) return false;
  return result.exact_matches.members;
};
