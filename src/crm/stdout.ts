import {
  CRM,
  CRMType,
  ActionMessage,
  handleResult,
  Params,
  //  ProcaCampaign,
  //  ProcessStatus,
} from "../crm";

class StdOut extends CRM {
  constructor(opt: Params) {
    super(opt);
    this.crmType = CRMType.OptIn;
  }

  init = async (): Promise<boolean> => {
    return true;
  };

  handleContact = async (
    message: ActionMessage,
  ): Promise<handleResult | boolean> => {
    console.log(message);
    return false; // do not empty the queue
  };
}

export default StdOut;
