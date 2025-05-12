import {
  CRM,
  CRMType,
  ActionMessage,
  handleResult,
  ProcaCampaign
} from "../crm";

class gpdedatahubCRM extends CRM {
  constructor(opt: {}) {
    super(opt);
    this.crmType = CRMType.ActionContact;
  }


  handleActionContact = async (
    message: ActionMessage
  ): Promise<handleResult | boolean> => {
    console.log("Taken from the queue", message.action.id, "test:", message.action.testing);

console.log(message);
    if (this.verbose) {
      console.log(message);
    }

   return false
  };
}

export default gpdedatahubCRM;
