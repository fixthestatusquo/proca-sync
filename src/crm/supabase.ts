import {
  CRM,
  CRMType,
  ActionMessage,
  handleResult,
  ProcaCampaign,
  ProcessStatus,
} from "../crm";


import { createClient } from '@supabase/supabase-js'

export type CrmConfigType = {
  server: string;
  publicKey: string;
  user: string;
  password: string;
};


class SupabaseCRM extends CRM {
  crmAPI: any;
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
      server: process.env.CRM_URL || 'missing',
      user: process.env.AUTH_USER || 'missing',
      publicKey: process.env.AUTH_ANON_KEY || 'missing',
      password: process.env.AUTH_PASS || 'missing',

    };
    this.crmAPI = createClient(config.server, config.publicKey);
    this.config = config;
  }

  init = async (): Promise<boolean> => { // build the api connection, potentially load some constant or extra data you might need
    const { data, error } = await this.crmAPI.auth.signInWithPassword({
  email: this.config.user,
  password: this.config.password,
});

console.log(data,error);
    if (error) {
 console.log(error);
return false }
    return true;
  };

  fetchCampaign = async (campaign: ProcaCampaign): Promise<any> => {
// usually, fetch the campaign id as set on the CRM (based on the name of proca)
      return campaign.id;
  }

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

  const { error } = await this.crmAPI
  .from('actions')
  .insert(data);

console.log(error);

    return false;
  };

}


export default SupabaseCRM;
