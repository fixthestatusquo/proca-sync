import {
  CRM,
  CRMType,
  ActionMessage,
  handleResult,
  ProcaCampaign,
} from "../crm";

import { createClient } from "@supabase/supabase-js";

export type CrmConfigType = {
  server: string;
  publicKey: string;
  user?: string;
  password?: string;
};

type PublicCommentType = {
  created_at: string;
  comment: string;
  campaign: string;
  widget_id: number;
  uuid: string;
  lang: string;
  area?: string;
  name?: string;
  locality?: string;
};

class PublicCommentCRM extends CRM {
  crmAPI: any;
  pub: any;
  config: CrmConfigType;

  constructor(opt: {}) {
    super(opt);
    this.crmType = CRMType.Contact;
    if (!process.env.CRM_URL) {
      console.error(
        "you need to set the url of your crm endpoint in the .env.xx",
      );

      process.exit(1);
    }

    let config: CrmConfigType = {
      server: process.env.CRM_URL || "missing",
      publicKey: process.env.AUTH_ANON_KEY || "missing",
      user: process.env.AUTH_USER,
      password: process.env.AUTH_PASS,
    };
    this.crmAPI = createClient(config.server, config.publicKey);
    this.config = config;
  }

  init = async (): Promise<boolean> => {
    // build the api connection, potentially load some constant or extra data you might need
    if (this.config.user) {
      const { data, error } = await this.crmAPI.auth.signInWithPassword({
        email: this.config.user,
        password: this.config.password,
      });
      console.log(data, error);
      if (error) throw new Error(error);
      this.crmAPI.auth.startAutoRefresh();
    } else {
      console.info(
        "Starting as anonymous. Consider adding AUTH_USER and AUTH_PATH in your env instead.",
      );
      //      const { data, error } = await this.crmAPI.auth.signInAnonymously();
      //      console.log(data, error);
      //if (error) throw new Error (error);
      //this.crmAPI.auth.startAutoRefresh();
    }
    return true;
  };

  fetchCampaign = async (campaign: ProcaCampaign): Promise<any> => {
    return campaign;
  };

  handleContact = async (
    message: ActionMessage,
  ): Promise<handleResult | boolean> => {
    if (this.verbose) {
      console.log("processing...", message);
    }
    const camp = await this.campaign(message.campaign);

    const comment = message.action.customFields.comment;
    if (!comment) {
      console.log("nothing to save, no comment on the action");
      return true;
    }
    const data: PublicCommentType = {
      //      id: message.actionId, let's keep the sequence
      created_at: message.action.createdAt,
      comment: comment.toString(),
      campaign: camp.name,
      widget_id: message.actionPageId,
      uuid: message.contact.contactRef,
      lang: message.actionPage.locale,
    };

    if (message.contact.area) data.area = message.contact.area;
    if (message.contact.firstName) {
      data.name = message.contact.firstName.trim();
      if (message.contact.lastName) {
        data.name +=
          " " + message.contact.lastName.charAt(0).toUpperCase().trim();
      }
      if (message.action.customFields.locality) {
        data.locality = message.action.customFields.locality.toString();
        data.name = data.name + ", " + data.locality;
      }
    }

    console.log(data);
    const { error } = await this.crmAPI.from("comments").insert(data);

    if (!error) return true;

    if (error.code === "23505")
      //ack already processed 'duplicate key value violates unique constraint "actions_proca_id_key"'
      return true;

    console.log(error);

    return false;
  };
}

export default PublicCommentCRM;
