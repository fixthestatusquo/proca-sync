import {
  CRM,
  CRMType,
  ActionMessage,
  EventMessage,
  handleResult,
  Message
} from "../crm";

type Params = {
  [key: string]: any;
  //  AUTH_TOKEN?: string;
};

class MailjetDOI extends CRM {
  mailjet : any;
  list: number | undefined;

  constructor(opt: Params) {
    super(opt);
    this.crmType = CRMType.DoubleOptIn;
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

  handleMessage = async (
    message: ActionMessage | EventMessage
  ): Promise<handleResult | boolean> => {

    if (message.schema === "proca:action:2") {
      console.log("Action taken from the queue", message.action.id);
    } else if (message.schema === "proca:event:2") {
      console.log("Event taken from queue", message.actionId);
      message.contact = message.supporter.contact;
      message.privacy = message.supporter.privacy;
    }

    if (this.verbose) {
      console.log(message);
    }

    try {
      // create contact
      const { response: { status } } = await this.mailjet
        .post("contact", { 'version': 'v3' })
        .request({
          "Name": message.contact.firstName + " " + message.contact.lastName || "",
          "Email": message.contact.email
        });

      return (status === 201 ? true : false);
    } catch (e: any) {
        if (e.response.statusText.includes("already exists")) {
          return this.updateContact(message);
        }
        console.log(e.message);
        return false;
      }
    }


 updateContact = async (
    message: Message
    // action: any,
    // campaign_id: number,
    // source?: string
  ): Promise<boolean> => {
   try {
    const { response: { status } } = await this.mailjet
       .put("contact", { 'version': 'v3' })
       .id(message.contact.email)
       .request({
         "Name": message.contact.firstName + "x " + message.contact.lastName || ""
       });

     return status === 200 ? true : false;
   } catch (error: any) {
     // mailjet returns error 304 when there is nothing to change
     if (error.statusCode === 304) {
       console.log(error.statusText)
       return true;
     }
     console.log(error.message);
     return false;
   }
}
}

export default MailjetDOI;
