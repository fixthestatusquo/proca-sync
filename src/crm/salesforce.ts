import {
  CRM,
  CRMType,
  ActionMessage,
  handleResult,
  ProcaCampaign,
  ProcessStatus,
} from "../crm";

//import { string2map } from "../utils";

import {
  makeClient,
  upsertContact,
  upsertLead,
  contactByEmail,
  campaignByName,
  addCampaignContact,
  foo,
  leadByEmail,
  CrmConfigType,
} from "./salesforce/client";

import {
  isActionSyncable,
  actionToContactRecord,
  actionToLeadRecord,
  emailChangedToContactRecord,
} from "./salesforce/contact";

class SalesforceCRM extends CRM {
  client: any;
  crmAPI: any;
  config: CrmConfigType;

  constructor(opt: {}) {
    super(opt);
    this.crmType = CRMType.OptIn;
    if (!process.env.SALESFORCE_URL) {
      this.error(
        "you need to set the url of your api4 endpoint in the .env.xx",
      );
      process.exit(1);
    }

    let config: CrmConfigType = {
      server: process.env.SALESFORCE_URL || "missing",
      token: process.env.AUTH_TOKEN || "missing",
      user: process.env.AUTH_USER || "missing",
      password: process.env.AUTH_PASSWORD || "missing",
      fieldOptIn: process.env.FIELD_OPTIN || "missing FIELD_OPTIN",
      fieldLanguage: process.env.FIELD_LANGUAGE || "",
      doi: Boolean(process.env.DOUBLE_OPT_IN),
    };
    if (process.env.SUPPORTER_TYPE && process.env.SUPPORTER_TYPE === "lead") {
      config.lead = true;
      config.contact = false;
    } else {
      config.lead = false;
      config.contact = true;
    }
    if (this.verbose) {
      this.crmAPI.debug(true);
    }

    if (process.env.CAMPAIGN_RECORD_TYPE) {
      config.campaignType = process.env.CAMPAIGN_RECORD_TYPE;
    }
    this.config = config;
  }

  init = async (): Promise<boolean> => {
    const { userInfo, conn } = await makeClient(this.config);
    this.crmAPI = conn;
    return true;
  };

  fetchCampaign = async (campaign: ProcaCampaign): Promise<any> => {
    const camp = await campaignByName(this.crmAPI, campaign.name, this.config);
    return camp;
  };

  handleContact = async (
    message: ActionMessage,
  ): Promise<handleResult | boolean> => {
    if (this.verbose) {
      console.log("processing...", message);
    }
    try {
      const camp = await this.campaign(message.campaign);
      const defaultLastName = "[not provided]";
      //#ExecStart=/opt/nvm/nvm-exec salesforce-sync -q cus... -l -O Opt_In__c -D -T
      if (this.config.lead) {
        const record = actionToLeadRecord(message, {
          language: this.config.fieldLanguage,
          doubleOptIn: this.config.doi,
          optInField: this.config.fieldOptIn,
          defaultLastName: defaultLastName,
        });
        const LeadId = await upsertLead(this.crmAPI, record);
        if (!LeadId) throw Error(`Could not upsert lead`);
        try {
          const r = await addCampaignContact(
            this.crmAPI,
            camp.Id,
            { LeadId },
            message,
          );
        } catch (e) {
          return true;
        }
        //        console.log(`Added lead to campaign ${JSON.stringify(r)}`);
      } else {
        const record = actionToContactRecord(message, {
          language: this.config.fieldLanguage,
          doubleOptIn: this.config.doi,
          optInField: this.config.fieldOptIn,
          defaultLastName: defaultLastName,
        });
        const ContactId = await upsertContact(this.crmAPI, record);
        if (!ContactId) throw Error(`Could not upsert contact`);
        const r = await addCampaignContact(
          this.crmAPI,
          camp.Id,
          { ContactId },
          message,
        );
        //        console.log(`Added contact to campaign ${JSON.stringify(r)}`);
      }
      return true;
    } catch (er) {
      if (er.errorCode === "DUPLICATE_VALUE") {
        // already in campaign
        return true;
      }
      console.log(message);
      this.error(
        `tried to add ${message.contact.email} but error happened ` +
          JSON.stringify(er) +
          ` CODE>${er.errorCode}<`,
      );
      return false;
    }
    return false;
  };
}

export default SalesforceCRM;
