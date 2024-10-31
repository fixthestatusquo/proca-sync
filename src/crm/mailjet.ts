import {
  CRM,
  CRMType,
  ActionMessage,
  handleResult,
} from "../crm";
import { string2map } from "../utils";

type Params = {
  [key: string]: any;
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

  addContactToList = async (email: string): Promise<boolean> => {
    try {
      const response = await this.mailjet
        .post("listrecipient", { 'version': 'v3' })
        .request({
          "IsUnsubscribed":"false",
          "ContactAlt": email,
          "ListID": this.list
        });

      return true;
    } catch (error: any) {
      console.error(`Failed to add contact ${email} to list ${this.list}: ${error.statusCode}`);
      return false;
    }
  }

  updateContactProperties = async (message: ActionMessage): Promise<boolean> => {

    const data = Object.entries(this.contactProperties).map(([sourceField, mailjetField]) => ({
        Name: mailjetField,
      Value: message.contact[sourceField] || ""
      }));

    try {
      await this.mailjet
        .put("contactdata", { 'version': 'v3' })
        .id(message.contact.email)
        .request({
          "Data": data
        })

      return true;
    } catch (e) {
      console.error(`Updating properties for contact ${message.contact.email}, action ${message.actionId} faile with ${e.statusCode}`);
      return false;
	    }
    }

  handleContact = async (
    message: ActionMessage
  ): Promise<handleResult | boolean> => {
    console.log("Action taken from the queue", message.action.id);

    if (this.verbose) {
      console.log(message);
    }

    try {
      // create contact
      const { response: { status } } = await this.mailjet
        .post("contact", { 'version': 'v3' })
        .request({
          "Name": message.contact.lastName ? message.contact.firstName + " " + message.contact.lastName : message.contact.firstName,
          "Email": message.contact.email
        });
      // add properties to the contact
      const properties = await this.updateContactProperties(message);
      // add contact to the list
        const list = await this.addContactToList(message.contact.email);
        return (properties && list);
    } catch (e: any) {
      if (e.response.statusText.includes("already exists")) {
        // we do not care for errors, because the contact already exists
        await this.updateContact(message);
        await this.updateContactProperties(message);
        await this.addContactToList(message.contact.email);
        return true;
      }
      return false;
    }
  }

 updateContact = async (
    message: ActionMessage
  ): Promise<boolean> => {
   try {
    const { response: { status } } = await this.mailjet
       .put("contact", { 'version': 'v3' })
       .id(message.contact.email)
       .request({
         "Name": message.contact.lastName ? message.contact.firstName + " " + message.contact.lastName : message.contact.firstName
       });

     return status === 200 ? true : false;
   } catch (error: any) {
     // mailjet returns error 304 when there is nothing to change
     if (error.statusCode === 304) {
       console.log(`${error.statusText} for ${message.contact.email}, ${message.actionId}`);
       return true;
     }
     console.error(`Error: ${error.message} for ${message.contact.email}, ${message.actionId}`);
     return false;
   }
 }

  //   fetchCampaign = async (campaign: ProcaCampaign): Promise<any> => {
  // console.log(campaign);

  //      return this.list;
  //   };
  // fetchContact = async (email: string, context: any): Promise<any> => {
  //   const result= await this.mailjet.get("contact",{'version': 'v3'}).id(email).request();

  // if (result.body.Data.count ===0)
  //   return false;
  // const contact=result.body.Data[0];
  // console.log(contact);
  // return true;
  // }
}

export default Mailjet;
