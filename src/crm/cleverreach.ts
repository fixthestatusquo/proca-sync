import {
  CRM,
  CRMType,
  ActionMessage,
  handleResult
} from "../crm";
import { getToken, postContact, getGroups } from "./cleverreach/client";
import { formatAction } from "./cleverreach/data";

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
  const token = await getToken();
  const status = await postContact(token, formatAction(message));
  console.log("status", status)

  if (status === 200) {
    console.log(`Action ${message.actionId} sent`)
    return true;
    } else {
      console.log(`Action ${message.actionId} not sent`)
    return false;
    }
};
}

export default cleverreachCRM;
