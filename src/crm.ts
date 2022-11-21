import { ActionMessageV2, EventMessageV2 } from "@proca/queue";
export type handleResult = {
  pause?: 0; // should it wait delay seconds before reading the next message?
  processed: boolean; // if the message has been processed or skipped
};

export { ActionMessageV2 as ActionMessage };
export { EventMessageV2 as EventMessage };

type Obj = { [key: string]: any };

export type ProcaCampaign = { [key: string]: any }; // TODO export from proca/queue

export type Contact = {
  area: string;
  contactRef: string;
  country: string;
  dupeRank: number;
  email: string;
  firstName: string;
  lastName: string;
  postcode: string;
};

export type Privacy = {
  //  emailStatus: null,
  //  emailStatusChanged: null,
  givenAt: string;
  optIn: boolean;
  withConsent: boolean;
};

export type Action = {
  actionType: string;
  createdAt: string;
  customFields: object;
  testing: boolean;
};

interface CRMInterface {
  handleActionContact: (
    message: ActionMessageV2
  ) => Promise<handleResult | void>;
  // TODO: proca/queue exports Action and ContactType, probably source and ap too?
  handleContact?: (message: ActionMessageV2) => Promise<handleResult|void>,
  handleEvent?: (message: EventMessageV2) => Promise<handleResult | void>; //WIP
  handleEmailStatusChange?: (
    message: EventMessageV2
  ) => Promise<handleResult | void>; //WIP
  campaign: (campaign: ProcaCampaign) => Promise<any>; // get the extra data from the campaign
  fetchCampaign?: (campaign: ProcaCampaign) => Promise<any>; // fetch the campaign extra data and store it locally
}

export enum CRMType {
  ActionContact, // Process all actions, primary and secondary, optin and optout
  Contact, // Process only the primary actions (eg petition signature, mtt), not the secondary ones (eg share actions)
  OptIn, // Process only the primary actions of the contacts that opted in
  //  DoubleOptIn, @marcin, can we easily do that? it'd need to memstore temporarily contacts until the doubleoptin arrives, right?
}
export abstract class CRM implements CRMInterface {
  public campaigns: Obj;
  public crmType: CRMType;

  constructor() {
    this.campaigns = {};
    this.crmType = CRMType.ActionContact;
  }

  fetchCampaign = async (campaign: ProcaCampaign): Promise<any> => {
    // we don't fetch nor create the campaign from the CRM, by default we consider that all information needed is the name of the campaign as set on proca
    // in most CRMs, you'll want to fetch the campaign details from the CRM or create one if it doesn't exist
    // by campaign, we mean whatever your CRM uses to segment contacts and actions, it might be named list, segment...

    return Promise.resolve(campaign);
  };

  handleContact= async (
    message: ActionMessageV2
  ): Promise<handleResult | void> => {
      throw new Error("you need to implement handleContact in your CRM");
  }


  handleActionContact = async (
    message: ActionMessageV2
  ): Promise<handleResult | void> => {
    if (message.privacy.withConsent && this.crmType === CRMType.Contact) {
      return this.handleContact(message);
    }
    if (message.privacy.optIn && this.crmType === CRMType.OptIn) {
      return this.handleContact(message);
    }
    if (this.crmType === CRMType.ActionContact) {
      throw new Error(
        "You need to eith: \n -define handleActionContact on your CRM or\n- set crmType to Contact or OptIn"
      );
    }
  };

  campaign = async (campaign: ProcaCampaign): Promise<Obj> => {
    const name: string = campaign.name;
    if (!this.campaigns[name]) {
      this.campaigns[name] = await this.fetchCampaign(campaign);
    }
    return Promise.resolve(this.campaigns[name]);
  };

  handleEvent = async (
    message: EventMessageV2
  ): Promise<handleResult | void> => {
    return Promise.resolve({ processed: false });
  };
}
