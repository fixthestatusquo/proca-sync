import _ from "lodash";
import {
  CRM,
  CRMType,
  type ActionMessage,
  type handleResult,
  type ProcaCampaign,
} from "../crm";

//import {ContactsApi, AccountApiApiKeys, CreateContact} from "@sendinblue/client";
const SibApiV3Sdk = require("@sendinblue/client");
import { string2map } from "../utils";

/*
 *

interface CRM {
  fetchCampaigns = () : Promise<void>
}
*/

class SendInBlueCRM extends CRM {
  apiInstance = new SibApiV3Sdk.ContactsApi();
  folderId = 0;
  mapping: undefined | Record<string, string>;

  constructor(opt: {}) {
    super(opt);
    switch (process.env.CRM_TYPE) {
      case "DOUBLE_OPTIN":
        this.crmType = CRMType.DoubleOptIn;
        break;
      case "OPTIN":
      default:
        this.crmType = CRMType.OptIn;
    }
    this.apiInstance.setApiKey(
      SibApiV3Sdk.AccountApiApiKeys.apiKey,
      process.env.SENDINBLUE_KEY,
    );

    const attributes = process.env.CONTACT_ATTRIBUTES;
    if (attributes !== undefined) {
      this.mapping = string2map(attributes as string);
    }
  }

  //  mergeFields: any,
  //  doubleOptIn = false,

  handleContact = async (
    message: ActionMessage,
  ): Promise<handleResult | boolean> => {
    let camp;
    try {
      camp = await this.campaign(message.campaign);
    } catch (error) {
      console.log("failed fetching the campaign", message.campaign);
      return { processed: false };
    }
    const createContact = new SibApiV3Sdk.CreateContact();
    createContact.email = message.contact.email;
    createContact.attributes = {};
    if (this.mapping) {
      if (message.contact.phone)
        message.contact.phone = message.contact.phone.replaceAll(" ", "");
      for (const key in this.mapping) {
        if (message.contact[key])
          createContact.attributes[this.mapping[key]] = message.contact[key];
      }
    } else {
      createContact.attributes = {
        LANG: message.actionPage.locale,
        FIRSTNAME: message.contact.firstName,
        LASTNAME: message.contact.lastName || "",
      };
    }
    if (process.env.OPTIN) {
      createContact.attributes[process.env.OPTIN] = true;
    }
    if (process.env.DOUBLE_OPTIN) {
      createContact.attributes[process.env.DOUBLE_OPTIN] = "Yes";
    }

    createContact.listIds = [camp.id];
    if (process.env.LIST) {
      createContact.listIds.push(parseInt(process.env.LIST, 10));
    }
    createContact.emailBlacklisted = false;
    createContact.updateEnabled = true;
    console.log(createContact);
    try {
      await this.apiInstance.createContact(createContact);
    } catch (e) {
      if (e.response.body) {
        if (
          e.response.body.code === "invalid_parameter" &&
          e.response.body.message === "Invalid LANDLINE_NUMBER number"
        ) {
          try {
            createContact.attributes["LANDLINE_NUMBER"] = undefined;
            console.error("Invalid phone number");
            await this.apiInstance.createContact(createContact);
            return { processed: true };
          } catch (e) {
            console.log(
              "error creating even after removing phone",
              e.response.body,
            );
            return { processed: false };
          }
        }
        console.log("error creating", e.response.body);
      } else {
        console.log("error creating no code", e);
      }
      //      const error = JSON.parse(e.body);
      //      console.log(error.code,error.message);
      return { processed: false };
    }
    return { processed: true };
  };

  campaign = async (campaign: ProcaCampaign): Promise<Record<string, any>> => {
    let name: string = campaign.name;
    if (campaign.externalId) {
      name = "proca.externalId:" + campaign.externalId; // hopefully prefix never used anywhere
    }
    if (!this.campaigns[name]) {
      this.campaigns[name] = await this.fetchCampaign(campaign);
    }
    return Promise.resolve(this.campaigns[name]);
  };

  fetchCampaigns = async () => {
    try {
      const folders = await this.apiInstance.getFolders(10, 0);
      const name = "proca";
      if (folders.body.folders) {
        let procaFolder = folders.body.folders.filter(
          (d: any) => d.name === name,
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

        let lists = await this.apiInstance.getLists(50, 0);
        lists = lists.body.lists;
        if (lists.length) {
          lists.forEach((d: any) => (this.campaigns[d.name] = d));
        }
      }
    } catch (e) {
      console.log("error fetching campaigns", e);
    }
  };

  fetchCampaign = async (campaign: ProcaCampaign): Promise<any> => {
    if (campaign.externalId) {
      try {
        const data = await this.apiInstance.getList(campaign.externalId);
        return data.body;
      } catch (e) {
        console.error("can't fetch list", campaign.externalId);
        //        throw e; let's continue and fetch by name "normal"
      }
    }

    if (Object.keys(this.campaigns).length === 0) {
      await this.fetchCampaigns();
      if (this.campaigns[campaign.name]) return this.campaigns[campaign.name];
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
