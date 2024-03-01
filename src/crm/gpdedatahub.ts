import {
  CRM,
  CRMType,
  ActionMessage,
  handleResult,
  ProcaCampaign
} from "../crm";
import { formatAction } from "./gpdedatahub/data";
import { postAction } from "./gpdedatahub/client";
import { fetchCampaign as procaCampaign }  from '../proca';

class gpdedatahubCRM extends CRM {
  constructor(opt: {}) {
    super(opt);
    this.crmType = CRMType.DoubleOptIn;
  }

 fetchCampaign = async (campaign: ProcaCampaign): Promise<any> => {
    const r= await procaCampaign (campaign.name);
    return r;
  }

  handleContact = async (
    message: ActionMessage
  ): Promise<handleResult | boolean> => {
    const camp = await this.fetchCampaign(message.campaign);
    const actionPayload = formatAction(message, camp.config);

    if (this.verbose) {
      console.log(actionPayload);
    }

    const status = await postAction(actionPayload);

   if (status === 200) {
     console.log(`Action ${message.actionId} sent`)
     return true;
    } else {
      console.log(`Action ${message.actionId} not sent`)
     return false;
    }
  };
}

export default gpdedatahubCRM;
