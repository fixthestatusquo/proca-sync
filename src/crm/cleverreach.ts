import { CRM, CRMType, ActionMessage, EventMessage, handleResult } from "../crm";
import { getToken, postContact } from "./cleverreach/client";
import { formatAction, Message } from "./cleverreach/data";



class CleverreachCRM extends CRM {
  token: string | null = null;

  constructor(opt: {}) {
    super(opt);
    this.crmType = CRMType.DoubleOptIn;
    this.initializeToken();
  }

  initializeToken = async () => {
    try {
      this.token = await getToken();
    } catch (error) {
      throw new Error("Failed to retrieve token");
    }
  };


  processMessage = async (
    message: Message
  ): Promise<boolean> => {

    if (!message.campaign.externalId) {
      console.error(`List ID missing, set the externalId for the campaign ${message.campaign.name}`);
      return false;
    };

    await this.initializeToken();

    const listId =  parseInt(message.campaign.externalId.toString().slice(0, 6), 10);

    if (!this.token) {
      throw new Error("Token is not available");
    }

    const status = await postContact(this.token, formatAction(message), listId);
    console.log("status", status);

    if (status === 200) {
      console.log(`Action ${message.actionId} sent`);
      return true;
    } else {
      const retryStatus = await postContact(
        this.token,
        formatAction(message, true),
        listId,
        true
      );
      if (retryStatus === 200) {
        return true;
      } else {
        console.log(`Action ${message.actionId} not sent`);
        return false;
      }
    }
  }

  fetchContact = async (email: string, context?: any): Promise<any> => {
    return true;
  };

  setSubscribed = async (id: any, subscribed: boolean): Promise<boolean> => {
    return true;
  };

  handleContact = async (
    message: ActionMessage
  ): Promise<handleResult | boolean> => {
    console.log("Action taken from the queue", message.action.id);

    if (this.verbose) {
      console.log(message);
    }

    return this.processMessage(message);
  };

  handleEvent = async (
    message: EventMessage
  ): Promise<handleResult | boolean> => {
    console.log("Event taken from queue", message.actionId);

    message.contact = message.supporter.contact;
    message.privacy = message.supporter.privacy;

    if (this.verbose) {
      console.log(message);
    }

    return this.processMessage(message);
  };
}

export default CleverreachCRM;
