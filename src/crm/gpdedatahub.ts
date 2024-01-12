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
     const data = await postAction(actionPayload);
    if (data) {
      return true;
    } else {
      console.error("error, no data" );
      return false;
    }
  };
}

export default gpdedatahubCRM;
