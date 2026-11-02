import {
  type ActionMessage,
  type CampaignUpdatedEvent,
  CRM,
  CRMType,
  type EventMessage,
  type handleResult,
  type ProcaCampaign,
} from "../crm.ts";
import { fetchCampaign as procaCampaign } from "../proca.ts";
import { getContact, getToken, upsertContact } from "./cleverreach/client.ts";
import { formatAction } from "./cleverreach/data.ts";

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
    const id = campaign.id;
    if (!id) throw new Error("campaign has no id, cannot fetch");
    const r = await procaCampaign(id);
    this.campaignCache.set(id, r);
    return r;
  };

  initializeToken = async () => {
    try {
      this.token = await getToken();
    } catch (_error) {
      throw new Error("Failed to retrieve token");
    }
  };

  handleMessage = async (message: ActionMessage) => {
    if (this.verbose) {
      console.log(message);
    }
    let camp = message.campaign.id
      ? this.campaignCache.get(message.campaign.id)
      : undefined;
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

  fetchContact = async (_email: string, _context?: any): Promise<any> => {
    return true;
  };

  setSubscribed = async (_id: any, _subscribed: boolean): Promise<boolean> => {
    return true;
  };
}

export default CleverreachCRM;
