import { Campaign, ActionMessageV2, EventMessageV2, Counters } from "@proca/queue";
import { Configuration } from "./config";
import color from 'cli-color';
import {spin} from "./spinner";

export type handleResult = {
  processed: boolean; // if the message has been processed or skipped
  // there will likely be more attributes to let the CRM inform the queue processor to pause for instance
};

export enum ProcessStatus {
  unknown = 0,
  processed = 1,
  skipped = 2,
  ignored = 3,
  error = 4,
}
export { ActionMessageV2 as ActionMessage };
export { EventMessageV2 as EventMessage };
export { Campaign as ProcaCampaign };

type ProcaCampaign = Campaign;

//export type ProcaCampaign = { [key: string]: any }; // TODO export from proca queue
/*export type ProcaCampaign = {
    contactSchema: string,
    externalId?: number,
    name: string,
    title: string,
    id?: number,
};
*/

/*
  "campaign": {
    "contactSchema": "basic",
    "externalId": 1984,
    "name": "test-proca",
    "title": "Pineapple doesn’t belong on pizza!"
  },
  "campaignId": 9,
*/

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
  init: () => Promise<boolean>;
  handleActionContact: (
    message: ActionMessageV2
  ) => Promise<handleResult | boolean>;
  handleContact?: (message: ActionMessageV2) => Promise<handleResult | boolean>;
  handleEvent?: (message: EventMessageV2) => Promise<handleResult | boolean>;
  handleEmailStatusChange: (
    message: EventMessageV2
  ) => Promise<handleResult | boolean>;
  campaign: (campaign: ProcaCampaign) => Promise<any>; // get the extra data from the campaign
  fetchCampaign?: (campaign: ProcaCampaign) => Promise<any>; // fetch the campaign extra data and store it locally
  fetchContact?: (email: string, context?: any) => Promise<any>; // fetch the contact, mostly for debug
  setSubscribed: (id: any, subscribed: boolean) => Promise<boolean>;
  setBounce: (id: any, bounced: boolean) => Promise<boolean>;
  log: (text: string | void, color:ProcessStatus | void) => void;
  count: Counters;
}

export enum CRMType {
  ActionContact, // Process all actions, primary and secondary, optin and optout
  Contact, // Process only the primary actions (eg petition signature, mtt), not the secondary ones (eg share actions)
  OptIn, // Process only the primary actions of the contacts that opted in
  DoubleOptIn, //only if double opt-in
}
export abstract class CRM implements CRMInterface {
  public campaigns: Record<string, any>;
  public crmType: CRMType;
  public verbose: false;
  public interactive: false;
  public pause: false;
  public count: Counters;
  private lastStatus : ProcessStatus;

  constructor(opt: any) {
    this.verbose = opt?.verbose || false;
    this.pause = opt?.pause || false;
    this.interactive = opt?.interactive || false;
    this.campaigns = {};
    this.crmType = CRMType.ActionContact;
    this.count = opt.count || {ack:0, nack:0};
    this.lastStatus = ProcessStatus.unknown;
  }

  colorStatus = (status: ProcessStatus | void): Function => {
    switch (status) {
      case ProcessStatus.processed: return color.green;
      case ProcessStatus.skipped: return color.blue;
      case ProcessStatus.ignored: return color.magenta;
      case ProcessStatus.error: return color.red;
    }
    return ((d: string) => d);
  }

  log = (text:string | void, status:ProcessStatus | void) => {
     //  progress: (count: number; suffix: string; color:string);
    const newline = status == ProcessStatus.error || !this.interactive || !text;
    spin(this.count.ack +this.count.nack , text || "",{wrapper:this.colorStatus(status), newline: newline});
    if (status)
      this.lastStatus = status;
  }

  error = (text:string) => this.log(text,ProcessStatus.error);

  init = async (): Promise<boolean> => {
     //optional async init for extran fetch and setup that can't be done in the constructor
     return true;
  }

  fetchCampaign = async (campaign: ProcaCampaign): Promise<any> => {
    // we don't fetch nor create the campaign from the CRM, by default we consider that all information needed is the name of the campaign as set on proca
    // in most CRMs, you'll want to fetch the campaign details from the CRM or create one if it doesn't exist
    // by campaign, we mean whatever your CRM uses to segment contacts and actions, it might be named list, segment...

    return Promise.resolve(campaign);
  };

  fetchContact = async (email: string, context?: any): Promise<any> => {
    throw new Error("you need to implement fetchContact in your CRM");
  };

  setSubscribed = async (id: any, subscribed: boolean): Promise<boolean> => {
    throw new Error("you need to implement setSubscribed in your CRM");
  };
  setBounce = async (id: any, bounced: boolean): Promise<boolean> => {
    throw new Error("you need to implement setBounce in your CRM");
  };

  handleContact = async (
    message: ActionMessageV2
  ): Promise<handleResult | boolean> => {
    throw new Error("you need to implement handleContact in your CRM");
  };

  formatResult = (result: handleResult | boolean): boolean => {
    if (typeof result === "boolean") return result;
    return result.processed;
  };

  handleActionContact = async (
    message: ActionMessageV2
  ): Promise<handleResult | boolean> => {
    switch (this.crmType) {
      case CRMType.Contact:
        if (message.privacy.withConsent) {
          const r = this.formatResult(await this.handleContact(message));
          if (r) {
            this.log("added " + message.contact.email + " "+message.action.createdAt, ProcessStatus.processed);
          } else {
            this.log("failed " + message.contact.email + " "+message.action.createdAt, ProcessStatus.error);
          }
          return r;
        }
        this.log("don't know how to process " + message.contact.email, ProcessStatus.error);
        break;
      case CRMType.OptIn:
        if (!message.privacy.withConsent) {
          this.log("no withConsent " + message.actionId + " ," + message.action.actionType, ProcessStatus.skipped);
          return true;
        }
        if (message.privacy.withConsent && message.privacy.optIn) {
          const r = this.formatResult(await this.handleContact(message));
          if (r) {
            this.log("added " + message.contact.email+ " "+message.action.createdAt, ProcessStatus.processed);
          } else {
            this.log("failed " + message.contact.email+ " "+message.action.createdAt, ProcessStatus.error);
          }
          return r;
        }
        if (message.privacy.optIn === false) {
          this.log("opt-out " + message.actionId, ProcessStatus.skipped);
//          this.verbose && console.log('opt-out',message.actionId);
          return true; //OptOut contact, we don't need to process
        }
        if (message.privacy.optIn === true) {
          this.log("opt-in, but no withConsent " + message.actionId +' '+ message.action?.actionType,ProcessStatus.skipped);
//          this.verbose && console.log('opt-out',message.actionId);
          return true; //OptOut contact, we don't need to process
        }
        if (message.privacy?.emailStatus === 'double_opt_in') { // double opt-in is optin (eg by email)
          const r = this.formatResult(await this.handleContact(message));
          if (r) {
            this.log("added doi" + message.contact.email, ProcessStatus.processed);
          } else {
            this.log("failed doi" + message.contact.email, ProcessStatus.error);
          }
          return r;
        }
        if (message.privacy.optIn === null) {
          this.log("optIn null (implicit) withConsent " + message.actionId +' '+ message.action?.actionType,ProcessStatus.skipped);
          return true;
          /*
          const r = this.formatResult(await this.handleContact(message));
          if (r) {
            this.log("added with implicit optin" + message.contact.email+ " "+message.action.createdAt, ProcessStatus.processed);
          } else {
            this.log("failed with implicit optin" + message.contact.email+ " "+message.action.createdAt, ProcessStatus.error);
          }
          return r; */
        }
console.log(message);
        this.log("don't know how to process -optin " + message.actionId, ProcessStatus.error);
        break;

      case CRMType.DoubleOptIn:
        if (message.privacy?.emailStatus === 'double_opt_in') {
          const r = this.formatResult(await this.handleContact(message));
          if (r) {
            this.log("added doi " + message.contact.email + " " +  message.actionId, ProcessStatus.processed);
            return true;
          } else {
            this.log("failed doi " + message.contact.email + " " +  message.actionId, ProcessStatus.error);
            return false;
          }
        };
           this.log("skip sending, it is not double opt in " + message.contact.email + " " +  message.actionId, ProcessStatus.error);
        return true;
        break;

      case CRMType.ActionContact:
        throw new Error(
          "You need to eith: \n -define handleActionContact on your CRM or\n- set crmType to Contact or OptIn"
        );
      default:
        throw new Error(
          "unexpected crmType " + this.crmType
        );
    }
    console.error ("need, because ts wants a return boolean");
    return false;
  };

  campaign = async (campaign: ProcaCampaign): Promise<Record<string, any>> => {
    const name: string = campaign.name;
    if (!this.campaigns[name]) {
      this.campaigns[name] = await this.fetchCampaign(campaign);
    }
    return Promise.resolve(this.campaigns[name]);
  };

  handleEmailStatusChange = async (
    event: EventMessageV2
  ): Promise<handleResult | boolean> => {
    // If we want to detect supporter clicking on opt in link in email, we can do this here
    // this happens after the action was done, timeline:
    //
    // 1. Supporter signs form
    // 2. Action message arrives, Signature is added
    // 3. Supporter receives an email (click button to subscribe)
    // 4. Supporter clicks this link
    // 5. Event message arrives, We set them as subscribed
    // OR:
    // 3. Supporter email bounces (invalid email)
    // 4. Event message arrives, We set Contact as bounced

    if (event.eventType === "email_status") {
      // handle only email status updates
      // check if we have that contact in CRM
      const cont = await this.fetchContact(event.supporter.contact.email);

      // if not, ignore the event about non-existing contact
      if (!cont) return true;

      switch (event.supporter.privacy.emailStatus) {
        // do this if you want to change the subscription based on opt in in email
        // the timestamp of this opt in is in event.supporter.privacy.emailStatusChanged
        case "double_opt_in": {
          console.log(`Double opt in from ${event.supporter.contact.email}`);

          await this.setSubscribed(cont.id, true);
          break;
        }

        // Different kinds of problems with email delivery:
        case "bounce": // bounce
        case "blocked": // pre-blocked by our transactional email provider (malformed etc)
        case "spam": // supporter clicked "this is spam" on our email
        case "unsub": {
          // supporter clicked "unsubscribe" on our email (if provided by Gmail etc)
          console.log(
            `${event.supporter.privacy.emailStatus} from ${event.supporter.contact.email}`
          );

          await this.setBounce(cont.id, true);
          break;
        }
      }
    }
    return true;
  };

  handleEvent = async (
    message: EventMessageV2
  ): Promise<handleResult | boolean> => {
    return Promise.resolve({ processed: false });
  };
}

export const init = async (config: Configuration): Promise<CRM> => {
  if (!process.env.CRM) {
    console.error(
      "you need to set CRM= in your .env to match a class in src/crm/{CRM}.ts"
    );
    throw new Error("missing process.env.CRM");
  }

  const crm = await import("./crm/" + process.env.CRM);
  if (crm.default) {
    const instance= new crm.default(config);
    const success = await instance.init();
    if (!success) {
      console.error ("can't initialise the crm, we stop");
      process.exit(1);
    }
    return instance;
  } else {
    throw new Error(process.env.CRM + " missing export default YourCRM");
  }
};
