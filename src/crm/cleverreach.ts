import {
  CRM,
  CRMType,
  ActionMessage,
  handleResult
} from "../crm";
import { getToken, postContact, getContact } from "./cleverreach/client";
import { formatAction } from "./cleverreach/data";

class cleverreachCRM extends CRM {
  constructor(opt: {}) {
    super(opt);
    this.crmType = CRMType.DoubleOptIn;
  }

  fetchContact = async (email: string, context?: any): Promise<any> => { return true }
  setSubscribed = async (id: any, subscribed: boolean): Promise<boolean> => {
    console.error("we need to implement changing the double optin status")
    return false;

  };

handleContact = async (
  message: ActionMessage
): Promise<handleResult | boolean> => {

  console.log("Taken from the queue", message.action.id);

  if (this.verbose) {
    console.log(message);
  }
  const token = await getToken();
  const status = await postContact(token, formatAction(message), message.campaign.externalId);
  console.log("status", status)

  if (status === 200) {
    console.log(`Action ${message.actionId} sent`)
    return true;
  } else {
    const status = await postContact(token, formatAction(message, true), message.campaign.externalId, true);
    if (status === 200) {
      return true;
    } else {
      console.log(`Action ${message.actionId} not sent`);
      return false;
    }
  }
};
}

export default cleverreachCRM;
