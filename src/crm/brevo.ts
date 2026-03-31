import { BrevoClient } from "@getbrevo/brevo";
import {
  CRM,
  CRMType,
  type ActionMessage,
  type handleResult,
  type ProcaCampaign,
} from "../crm";
import { string2map } from "../utils";

class BrevoCRM extends CRM {
  private brevo: BrevoClient;
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

    this.brevo = new BrevoClient({
      apiKey: process.env.SENDINBLUE_KEY || process.env.BREVO_KEY || "",
    });

    const attributes = process.env.CONTACT_ATTRIBUTES;
    if (attributes !== undefined) {
      this.mapping = string2map(attributes as string);
    }
  }

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

    const attributes: Record<string, any> = {};

    if (this.mapping) {
      if (message.contact.phone) {
        message.contact.phone = message.contact.phone.replaceAll(" ", "");
      }
      for (const key in this.mapping) {
        if (message.contact[key]) {
          attributes[this.mapping[key]] = message.contact[key];
        }
      }
    } else {
      attributes.LANG = message.actionPage.locale;
      attributes.FIRSTNAME = message.contact.firstName;
      attributes.LASTNAME = message.contact.lastName || "";
    }

    if (process.env.OPTIN) {
      attributes[process.env.OPTIN] = true;
    }
    if (process.env.DOUBLE_OPTIN) {
      attributes[process.env.DOUBLE_OPTIN] = "Yes";
    }

    const listIds = [camp.id];
    if (process.env.LIST) {
      listIds.push(parseInt(process.env.LIST, 10));
    }

    const payload = {
      email: message.contact.email,
      attributes,
      listIds,
      emailBlacklisted: false,
      updateEnabled: true,
    };

    try {
      await this.brevo.contacts.createContact(payload);
      console.log("contact added", message.contact.email);
      return { processed: true };
    } catch (e) {
      console.log(this.error(e));
      if (e.body) {
        if (
          e.body.code === "invalid_parameter" &&
          e.body.message === "Invalid LANDLINE_NUMBER number"
        ) {
          try {
            payload.attributes["LANDLINE_NUMBER"] = undefined;
            await this.brevo.contacts.createContact(payload);
            console.error("Invalid phone number");
            return { processed: true };
          } catch (e) {
            console.log("error creating even after removing phone", e.body);
            return { processed: false };
          }
        }
        console.log("error creating", e.body);
      } else {
        console.log("error creating no code", e);
      }

      return { processed: false };
    }
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

  fetchCampaigns = async (): Promise<void> => {
    try {
      const folders = await this.brevo.contacts.getFolders({
        limit: 10,
        offset: 0,
      });
      if (!folders.folders) return;

      let procaFolder = folders.folders.find((d: any) => d.name === "proca");
      if (!procaFolder) {
        procaFolder = (await this.brevo.contacts.createFolder({
          name: "proca",
        })) as any;
      }

      this.folderId = procaFolder!.id; // <-- non-null assertion

      const lists = await this.brevo.contacts.getLists({
        limit: 50,
        offset: 0,
      });
      lists.lists?.forEach((d: any) => (this.campaigns[d.name] = d));
    } catch (e) {
      console.log("error fetching campaigns", e);
    }
  };

  fetchCampaign = async (campaign: ProcaCampaign): Promise<any> => {
    if (campaign.externalId) {
      try {
        const data = await this.brevo.contacts.getList(campaign.externalId);
        return data;
      } catch {
        console.error("can't fetch list by externalId", campaign.externalId);
      }
    }

    if (Object.keys(this.campaigns).length === 0) {
      await this.fetchCampaigns();
      if (this.campaigns[campaign.name]) return this.campaigns[campaign.name];
    }

    try {
      const data = await this.brevo.contacts.createList({
        name: campaign.name,
        folderId: this.folderId,
      });
      console.log("created list for campaign", campaign.name, data);
      return data;
    } catch (e) {
      console.log("error creating list", e);
    }
  };
}

export default BrevoCRM;
