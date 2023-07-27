import {
  CRM,
  CRMType,
  ActionMessage,
  handleResult,
  ProcaCampaign,
} from "../crm";
import { actionToContactRecord as formatAction } from "./mailchimp/contact";
import {
  ping,
  allLists,
  senders,
  makeClient,
  upsertList,
  addContactToList,
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
  lists: [] | undefined;
  mergeFields: any;

  constructor(opt: Params) {
    super(opt);
    this.crmType = CRMType.OptIn;
    if (!process.env.AUTH_TOKEN) {
      console.error(
        "you need to set the AUTH_TOKEN from mailchimp in the .env.xx"
      );
      process.exit(1);
    }
    this.token = process.env.AUTH_TOKEN;
    if (!process.env.LIST) {
      console.error(
        "you need to set the LIST (audience id) from mailchimp in the .env.xx"
      );
    }
    this.list = process.env.LIST || "";
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

  handleContact = async (
    message: ActionMessage
  ): Promise<handleResult | boolean> => {
    //const response = await this.client.ping.get();
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
    const actionPayload = formatAction(message, this.mergeFields, false, false);
    if (this.verbose) {
      console.log(actionPayload);
    }
    try {
      const r = await addContactToList(this.client, this.list, actionPayload, this.verbose);
      if (Boolean(r)) {
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
      /*      try {
        const r = await allLists(this.client);
        this.lists = r.lists || [];
        this.lists && this.lists.forEach ( (d:any) => {
console.log(d.id,d.name);
        });
      } catch (e: any) {
console.error("error fetching campaign",e.error); throw (e);
      }
*/
    }
    return campaign;
  };
}

export default MailchimpCRM;
