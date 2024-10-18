import {
  CRM,
  CRMType,
  ActionMessage,
  handleResult,
  ProcaCampaign,
  ProcessStatus,
} from "../crm";

import { string2map } from "../utils";

type Params = {
  [key: string]: any;
  //  AUTH_TOKEN?: string;
};

class Mailjet extends CRM {
  mailjet : any;
  contactProperties: any;
  list: number | undefined;

  constructor(opt: Params) {
    super(opt);
    this.crmType = CRMType.OptIn;
    if (!process.env.MJ_APIKEY_PUBLIC) {
      console.error(
        "you need to set the MJ_APIKEY_PUBLIC from mailjet in the .env.xx"
      );
      process.exit(1);
    }
    if (!process.env.MJ_APIKEY_PRIVATE) {
      console.error(
        "you need to set the MJ_APIKEY_PRIVATE from mailjet in the .env.xx"
      );
      process.exit(1);
    }



    if (!process.env.LIST) {
      console.error(
        "you need to set the LIST (audience id) from mailjet in the .env.xx"
      );
    } else {
      this.list = +process.env.LIST;
    }

    try {
   this.mailjet = require ('node-mailjet').apiConnect(process.env.MJ_APIKEY_PUBLIC, process.env.MJ_APIKEY_PRIVATE);
    } catch (e: any) {
      console.log(e.message, "can't connect, check MJ_APIKEY_PUBLIC and PRIVATE?");
      process.exit(1);
    }
    if (typeof process.env.CONTACT_PROPERTIES === "string") {
      // get query format, key = contact field, value = merge field in mailjet
      // eg. CONTACT_PROPERTIES="firstName=PRENOM&lastName=NOM&country=PAYS&locality=VILLE&postcode=CP&street=RUE1"
      this.contactProperties = string2map(process.env.CONTACT_PROPERTIES);
      console.log("contact properties", this.contactProperties);
    }
  }

  init = async (): Promise<boolean> => {
    if (!this.list) {
      // it will not work without a group, suggesting some
      console.warn("missing list id, some options:");
      const r = await this.mailjet.get("contactslist", {'version': 'v3', 'limit':200}).request();

      r.body.Data.forEach((g: any) => {
        console.log(g.ID, g.Name, g.SubscriberCount);
      });
      return false;
    }
    return true;
  }

  handleContact = async (
    message: ActionMessage
  ): Promise<handleResult | boolean> => {



try {
    const existing = await this.fetchContact(message.contact.email,{});

const source = "proca";
const camp = {id: 0, name: "todo"};

const action = message.action;

    if (existing === false) {
      return this.createContact(message.contact, action, camp.id, source);
    } else {
console.log(existing);
      return this.updateContact(existing, message.contact, action, camp.id, source);
    }
    return false;
} catch (e:any) {
  console.log(e); throw new Error (e);
}
}

  createContact = async (
    contact: any,
    action: any,
    campaign_id: number,
    source?: string
  ): Promise<boolean> => {

const request = await this.mailjet
	.post("contact", {'version': 'v3'})
	.request({
      "Name":contact.lastName ? contact.firsttName + ' ' + contact.lastName : contact.firstName,
      "Email":contact.email
    });

console.log("request", request);
   return false;
}

  updateContact = async (
    crmContact: any,
    contact: any,
    action: any,
    campaign_id: number,
    source?: string
  ): Promise<boolean> => {
    if (campaign_id === null) {
      throw new Error ("missing campaign id"); 
    }
   return false;
}

  fetchCampaign = async (campaign: ProcaCampaign): Promise<any> => {
console.log(campaign);

     return this.list;
  };
  fetchContact = async (email: string, context: any): Promise<any> => {
    const result= await this.mailjet.get("contact",{'version': 'v3'}).id(email).request();

  if (result.body.Data.count ===0) 
    return false;
  const contact=result.body.Data[0];
console.log(contact);
  return true;
  }

}

export default Mailjet;
