import {
  CRM,
  CRMType,
  type ActionMessage,
  type handleResult,
  type ProcaCampaign,
  ProcessStatus,
} from "../crm";
import {
  actionToContactRecord as formatAction,
  type Contact,
  type ContactSubscription,
} from "./mailchimp/contact";
import {
  ping,
  allLists,
  allCampaigns,
  senders,
  makeClient,
  upsertList,
  //  addContactToList,
  findMember,
} from "./mailchimp/client";

import { string2map } from "../utils";

type Params = {
  [key: string]: any;
  //  AUTH_TOKEN?: string;
};

class MailchimpCRM extends CRM {
  client: any;
  token: string;
  list: string;
  group: string;
  interest: string;
  lists: [] | undefined;
  mergeFields: any;

  constructor(opt: Params) {
    super(opt);
    this.crmType = CRMType.OptIn;
    if (!process.env.AUTH_TOKEN) {
      console.error(
        "you need to set the AUTH_TOKEN from mailchimp in the .env.xx",
      );
      process.exit(1);
    }
    this.token = process.env.AUTH_TOKEN;
    if (!process.env.LIST) {
      console.error(
        "you need to set the LIST (audience id) from mailchimp in the .env.xx",
      );
    }
    this.list = process.env.LIST || "";
    if (!process.env.GROUP) {
      console.warn(
        "you might want to set interest groups from mailchimp in the .env.xx if you want to use it to store campaigns",
      );
    }
    this.group = process.env.GROUP || "";
    if (!process.env.INTEREST) {
      console.warn(
        "you might want to set interest from mailchimp in the .env.xx if you want to use it to store campaigns",
      );
    }
    this.interest = process.env.INTEREST || "";
    try {
      this.client = makeClient();
    } catch (e: any) {
      console.log(e.message, "can't connected, check AUTH_TOKEN?");
      process.exit(1);
    }
    if (typeof process.env.MERGE_FIELDS === "string") {
      // get query format, key = contact field, value = merge field in mailchimp
      // eg. MERGE_FIELDS="firstName=PRENOM&lastName=NOM&country=PAYS&locality=VILLE&postcode=CP&street=RUE1"
      this.mergeFields = string2map(process.env.MERGE_FIELDS);
      console.log("custom mergeFields", this.mergeFields);
    }
  }

  init = async (): Promise<boolean> => {
    if (this.list === "") {
      console.log("fetching exisiting lists");
      const r = await allLists(this.client);
      const lists = r.lists || [];
      lists &&
        lists.forEach((d: any) => {
          console.log(d.id, d.name);
        });
      return false;
    }
    const r = await allCampaigns(this.client, this.list, this.group);
    r.interests?.forEach((d: any) => {
      console.log("campaign?", d.id, d.name, d.subscriber_count);
    });
    return true;
  };

  handleContact = async (
    message: ActionMessage,
  ): Promise<handleResult | boolean> => {
    //const response = await this.client.ping.get();
    const actionPayload = formatAction(message, this.mergeFields, false, false);
    if (this.verbose) {
      console.log(actionPayload);
    }
    try {
      const r = await this.addContactToList(
        this.client,
        this.list,
        actionPayload,
        this.verbose,
      );
      if (r) {
        return r;
      } else {
        console.error("error, should be boolean", r);
        return false;
      }
    } catch (e) {
      console.log("error adding", e);
      throw e;
    }
    return false;
  };

  fetchContact = async (email: string): Promise<any> => {
    return findMember(this.client, email);
  };

  fetchCampaign = async (campaign: ProcaCampaign): Promise<any> => {
    console.log("fetching campaign", campaign.name);
    if (this.lists === undefined) {
      console.log("fetching lists", campaign.name);
    } else {
    }
    return campaign;
  };

  addContactToList = async (
    client: any,
    list_id: string,
    member: Contact | ContactSubscription,
    verbose = false,
  ): Promise<boolean> => {
    if (!member.status) {
      member.status = member.status_if_new;
    }
    if (this.interest) {
      member.interests = {};
      member.interests[this.interest] = true;
      console.log("add to interest", member);
    }
    try {
      const response = await client.lists.addListMember(list_id, member, {
        skipMergeValidation: true,
      });
      if (response.errors?.length) {
        console.error(response);
        throw new Error(response.errors);
      }
      if (verbose) {
        console.log("verbose addContactToList");
        delete response._links;
        console.log(response);
      }
      this.log("adding " + member.email_address, ProcessStatus.processed);
      return true;
    } catch (e: any) {
      const b = e?.response?.body || e;
      switch (b?.title) {
        case "Member Exists":
          if (verbose) {
            this.log("member exists already", b);
          } else {
            this.log("", ProcessStatus.skipped);
          }
          return true;
        case "Forgotten Email Not Subscribed":
        case "Member In Compliance State":
        case "Invalid Resource":
          this.log(b?.detail || b.title, ProcessStatus.ignored);
          return true;
        default:
          console.log("unexpected error", b);
      }
      return false;
    }
    return true;
  };
}

export default MailchimpCRM;
