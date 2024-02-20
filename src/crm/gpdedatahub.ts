import {
  CRM,
  CRMType,
  ActionMessage,
  handleResult
} from "../crm";
import { formatAction } from "./gpdedatahub/data";
import { postAction } from "./gpdedatahub/client";

class gpdedatahubCRM extends CRM {
  constructor(opt: {}) {
    super(opt);
    this.crmType = CRMType.DoubleOptIn;
  }

  handleContact = async (
    message: ActionMessage
  ): Promise<handleResult | boolean> => {
    const camp = await this.campaign(message.campaign);
    const actionPayload = formatAction(message);
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
