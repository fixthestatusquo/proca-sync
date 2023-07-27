import _ from "lodash";
import {
  CRM,
  CRMType,
  ActionMessage,
  handleResult,
  ProcaCampaign,
} from "../crm";

import {Contact, ContactValues, ContactOptions} from './magnews/interfaces'

import {
  setClientToken,
  addContact
} from './magnews/client'


/*
 *

interface CRM {
  fetchCampaigns = () : Promise<void>
}
*/

class MagNewsCRM extends CRM {
  public iddatabase: number; 
  public clientToken: string;
  public idnewsletter: number;
  public audience: string;

  constructor(opt: {}) {
    super(opt);
    this.crmType = CRMType.OptIn; // will only process opt-in contacts, the other events are filtered before the class
    this.clientToken = setClientToken();
    this.iddatabase = 6;
    this.idnewsletter = 1811;
    this.audience = "ecipel"; // single "campaign" mapping, TODO: implement fetchCampaign when more than one is needed
  }

  handleContact = async (
    message: ActionMessage
  ): Promise<handleResult | boolean> => {
    const camp = await this.campaign(message.campaign);

    const member = this.actionToContactRecord(message, camp);
    const r = await addContact(this.clientToken, member);
    if (!Boolean(r)) {
       //not sure what to do
      return { processed: true };
    }

    console.log(`added ${member.values.EMAIL} to MagNews list`);
    return { processed: true };
  };

  actionToContactRecord = (action: ActionMessage, camp: any) => {
    const cv: ContactValues = {
      EMAIL: action.contact.email,
      NAME: action.contact.firstName,
      SURNAME: action.contact.lastName,
      CELL: action.contact.phone,
      WBST_AUDIENCE: camp.audience,
      NOME_UTENTE: action.contact.email + "_" + camp.audience,
      UTM_SOURCE: action.tracking.source,
      UTM_MEDIUM: action.tracking.medium,
      UTM_CAMPAIGN: action.tracking.campaign,
      UTM_CONTENT: action.tracking.content,
    };

    const co: ContactOptions = {
      iddatabase: this.iddatabase,
      sendemailonactions: "insert,restore,update",
      sendemail: false,
      usenewsletterastemplate: true,
      idnewsletter: camp.idnewsletter,
      denyupdatecontact: false,
      forceallowrestorecontactonupdate: true,
      denysubscribeunsubscribedcontact: false,
    };

    const r: Contact = {
      values: cv,
      options: co,
    };

    return r;
  };

  fetchCampaign = async (campaign: ProcaCampaign): Promise<any> => {
    try {
      // todo: fetch the campaign/audience/newsletterid from the server - needed if more than one campaign
      return { audience: this.audience, idnewsletter: this.idnewsletter };
    } catch (e) {
      console.log(e);
    }
  };
}
export default MagNewsCRM;
