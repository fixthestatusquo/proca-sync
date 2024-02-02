import {
  CRM,
  CRMType,
  ActionMessage,
  handleResult,
  ProcaCampaign,
  ProcessStatus,
} from "../crm";

import { createClient } from "@supabase/supabase-js";

import { listenConnection } from '@proca/queue';

export type CrmConfigType = {
  server: string;
  publicKey: string;
  user: string;
  password: string;
};

class SupabaseCRM extends CRM {
  crmAPI: any;
  pub: any;
  config: CrmConfigType;

  constructor(opt: {}) {
    super(opt);
    this.crmType = CRMType.OptIn;
    if (!process.env.CRM_URL) {
      console.error(
        "you need to set the url of your crm endpoint in the .env.xx"
      );

      process.exit(1);
    }

    let config: CrmConfigType = {
      server: process.env.CRM_URL || "missing",
      user: process.env.AUTH_USER || "missing",
      publicKey: process.env.AUTH_ANON_KEY || "missing",
      password: process.env.AUTH_PASS || "missing",
    };
    this.crmAPI = createClient(config.server, config.publicKey);
    this.config = config;
  }

  openPublishChannel = (rabbit) => {
console.log("ready to republish");
     this.pub = rabbit.createPublisher({
  // Enable publish confirmations, similar to consumer acknowledgements
  confirm: true,
  // Enable retries
  maxAttempts: 2,
  // Optionally ensure the existence of an exchange before we use it
  //exchanges: [{exchange: 'my-events', type: 'topic'}]
})
  }

  init = async (): Promise<boolean> => {
    // build the api connection, potentially load some constant or extra data you might need
    const { data, error } = await this.crmAPI.auth.signInWithPassword({
      email: this.config.user,
      password: this.config.password,
    });


    listenConnection(this.openPublishChannel);

    const channel = this.crmAPI
      .channel("schema-db-changes")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
        },
        async (payload: any) => {

          if (
            payload.table === "actions" &&
            payload.eventType === "UPDATE" &&
            payload.new.campaign_id === 608
          ) {
            await this.dispatchEvent(payload.status, payload.new);
          } else {
            console.log("update", payload);
          }
        }
      )
      .subscribe();

    console.log(data, error);
    if (error) {
      console.log(error);
      return false;
    }
    return true;
  };

  dispatchEvent = async (status: string, data) => {
    if (status !== 'approved') {
console.log("ignoring, but not");
//      return false;
    }

console.log(this.pub,data);
    try {
    const r = await this.pub.send ('cus.320.deliver',JSON.stringify(data.data));
    console.log("send to SF", data);
    } catch (e) {
console.log(e);
   }
  };

  fetchCampaign = async (campaign: ProcaCampaign): Promise<any> => {
    // usually, fetch the campaign id as set on the CRM (based on the name of proca)
    return campaign.id;
  };

  handleContact = async (
    message: ActionMessage
  ): Promise<handleResult | boolean> => {
    if (this.verbose) {
      console.log("processing...", message);
    }
    const camp = await this.campaign(message.campaign);

    const data = {
      id: message.actionId,
      created_at: message.action.createdAt,
      proca_id: message.actionId,
      data: message,
      campaign_id: camp,
      widget_id: message.actionPageId,
      org_id: message.orgId,
      contact_ref: message.contact.contactRef,
    };

    const { error } = await this.crmAPI.from("actions").insert(data);

    console.log(error);

    return false;
  };
}

export default SupabaseCRM;
