import {
  CRM,
  CRMType,
  ActionMessage,
  handleResult
} from "../crm";
import { getToken, apiCall } from "./cleverreach/client";

class cleverreachCRM extends CRM {
  constructor(opt: {}) {
    super(opt);
    this.crmType = CRMType.DoubleOptIn;
  }

handleContact = async (
  message: ActionMessage
): Promise<handleResult | boolean> => {

  console.log("Taken from the queue", message.action.id);

  if (this.verbose) {
    console.log(message);
  }
  const token = getToken();
  const data = await apiCall(token, message);

 if (data?.status === 200) {
   console.log(`Action ${message.actionId} sent`)
   return true;
  } else {
    console.log(`Action ${message.actionId} not sent`)
   return false;
  }
};
}

export default cleverreachCRM;
