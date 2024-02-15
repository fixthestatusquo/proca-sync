import _ from "lodash";
import {
  CRM,
  CRMType,
  ActionMessage,
  handleResult,
  ProcaCampaign,
} from "../crm";

const SibApiV3Sdk = require("@sendinblue/client");

/*
 *

interface CRM {
  fetchCampaigns = () : Promise<void>
}
*/

class SendInBlueCRM extends CRM {
  apiInstance = new SibApiV3Sdk.ContactsApi();
  folderId = 0;

  constructor(opt: {}) {
    super(opt);
    this.crmType = CRMType.OptIn;
    this.apiInstance.setApiKey(
      SibApiV3Sdk.AccountApiApiKeys.apiKey,
      process.env.SENDINBLUE_KEY
    );
  }

  handleContact = async (
    message: ActionMessage
  ): Promise<handleResult | boolean> => {
    const camp = await this.campaign(message.campaign);
    console.log(camp.id, message.contact.email);
    let createContact = new SibApiV3Sdk.CreateContact();
    createContact.email = message.contact.email;
    createContact.attributes = {"LANG":message.actionPage.locale,"FIRSTNAME":message.contact.firstName, "LASTNAME":message.contact.lastName || ""};

    createContact.listIds = [camp.id];
    createContact.updateEnabled = true;
    try {
      const contact = await this.apiInstance.createContact(createContact);
    } catch (e) {
console.log(e); 
    return { processed: false };
    }
    return { processed: true };
  };

  fetchCampaigns = async () => {
    try {
      let folders = await this.apiInstance.getFolders(10, 0);
      const name = "proca";
      if (folders.body.folders) {
        let procaFolder = folders.body.folders.filter(
          (d: any) => d.name === name
        );
        if (!procaFolder.length) {
          const createFolder = new SibApiV3Sdk.CreateUpdateFolder();
          createFolder.name = name;
          const data = await this.apiInstance.createFolder(createFolder);
          procaFolder = data.body;
        } else {
          procaFolder = procaFolder[0];
        }
        this.folderId = procaFolder.id;

        let lists = await this.apiInstance.getLists(20, 0);
          lists = lists.body.lists;
        if (lists.length) {
          lists.forEach ( (d:any) => this.campaigns[d.name] = d);
        }

      }
    } catch (e) {
      console.log(e);
    }
  };

  fetchCampaign = async (campaign: ProcaCampaign): Promise<any> => {
    if (Object.keys(this.campaigns).length === 0) {
      await this.fetchCampaigns();
      if (this.campaigns[campaign.name])
        return this.campaigns[campaign.name];
    }
    try {
      const createList = new SibApiV3Sdk.CreateList();

      createList.name = campaign.name;
      createList.folderId = this.folderId;

      const data = await this.apiInstance.createList(createList);
      console.log("fetching campaign " + campaign.name, data.body);
      return data.body;
    } catch (e) {
      console.log(e);
    }
  };
}
export default SendInBlueCRM;
