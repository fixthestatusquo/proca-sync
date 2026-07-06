import {
  CRM,
  CRMType,
  type ActionMessage,
  type EventMessage,
  type handleResult,
  type ProcaCampaign,
  type CampaignUpdatedEvent,
} from "../crm";
import { getToken, upsertContact, getContact } from "./cleverreach/client";
import { formatAction } from "./cleverreach/data";
import { fetchCampaign as procaCampaign } from "../proca";

class CleverreachCRM extends CRM {
  token: string | null = null;
  campaignCache = new Map<number, any>(); // Store campaigns in memory

  constructor(opt: {}) {
    super(opt);
    this.crmType = CRMType.DoubleOptIn;
    this.initializeToken();
  }

  handleCampaignUpdate = async (
    message: CampaignUpdatedEvent,
  ): Promise<handleResult | boolean> => {
    //we need to refetch campaign when it is updated
    await this.fetchCampaign({
      id: message.campaignId,
      name: message.campaign.name,
      title: message.campaign.title,
      externalId: message.campaign.externalId,
    });
    return true;
  };

  fetchCampaign = async (campaign: ProcaCampaign): Promise<any> => {
    const r = await procaCampaign(campaign.id!);
    this.campaignCache.set(campaign.id!, r);
    return r;
  };

  initializeToken = async () => {
    try {
      this.token = await getToken();
    } catch (error) {
      throw new Error("Failed to retrieve token");
    }
  };

  handleMessage = async (message: ActionMessage) => {
    if (this.verbose) {
      console.log(message);
    }
    let camp = this.campaignCache.get(message.campaign.id!);
    if (!camp) {
      camp = await this.fetchCampaign(message.campaign);
    }

    // listId might be different for each campaign
    // custom label is different for each campaign
    if (
      !camp.config?.component?.sync?.listId ||
      !camp.config?.component?.sync?.customLabel
    ) {
      console.error(
        `Campaign config params missing, set the listId and custom label for the campaign ${message.campaign.name}`,
      );
    }

    await this.initializeToken();

    const listId = camp.config?.component?.sync?.listId;
    const customLabel = camp.config?.component?.sync?.customLabel;

    if (!this.token) {
      throw new Error("Token is not available");
    }

    const hasValues = await getContact(message.contact.email, this.token);
    const done = await upsertContact(
      this.token,
      formatAction(message, hasValues, customLabel.toLowerCase()),
      listId,
    );

    if (done) {
      console.log(`Message ${message.actionId} sent`);
      return true;
    }
    console.log(`Message ${message.actionId} not sent`);
    return false;
  };

  handleContact = async (
    message: ActionMessage,
  ): Promise<handleResult | boolean> => {
    console.log("Action taken from the queue", message.action.id);
    return this.handleMessage(message);
  };

  handleEvent = async (
    message: EventMessage,
  ): Promise<handleResult | boolean> => {
    if (message.eventType === "campaign_updated") {
      return this.handleCampaignUpdate(message);
    }
    if (message.eventType !== "email_status") return true;

    console.log("Event taken from queue", message.action?.id);

    const normalized = {
      ...message,
      contact: message.supporter.contact,
      privacy: message.supporter.privacy,
      actionId: message.action?.id,
    };
    return this.handleMessage(normalized as any);
  };

  fetchContact = async (email: string, context?: any): Promise<any> => {
    return true;
  };

  setSubscribed = async (id: any, subscribed: boolean): Promise<boolean> => {
    return true;
  };
}

export default CleverreachCRM;
