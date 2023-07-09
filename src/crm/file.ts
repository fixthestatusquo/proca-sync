import _ from "lodash";
import {
  CRM,
  CRMType,
  ActionMessage,
  handleResult,
  ProcaCampaign,
} from "../crm";
import { writeFileSync } from "fs";

/*
 * A debug CRM that saves the data into the data folder
 *
 */

// TODO export from proca/queue
type ContactID = string | number | undefined;

const writeJson = (data: object, name: string, folder?: string) => {
  let path = "./data/";
  if (folder) path = path + folder + "/";
  writeFileSync(path + name + ".json", JSON.stringify(data, null, 2));
};

class FileCRM extends CRM {
  /*
getContactByEmail = async (email : string) : Promise<Contact | undefined> => {
  return undefined;
}


addContact = async (contact: Contact ) => {
  writeJson(contact,contact.email,"contact");
  console.log(contact);
  return 0;
}

setSubscribed = async (id : number, subscribed:boolean) => {
  console.log(id,subscribed);
}

setBounced = async (id : number, bounced:boolean) => {
  console.log(id,bounced);
}
*/

  handleActionContact = async (
    message: ActionMessage
  ): Promise<handleResult | void> => {
    const camp = await this.campaign(message.campaign);
    writeJson(message, message.action.actionType + "_" + message.actionId);
    return { processed: true };
  };

  fetchCampaign = async (campaign: ProcaCampaign): Promise<any> => {
    writeJson(campaign, campaign.name, "campaign");
    return campaign;
  };
}

export default FileCRM;
