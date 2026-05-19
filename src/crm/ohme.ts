import {
  CRM,
  CRMType,
  type ActionMessage,
  type handleResult,
  type ProcaCampaign,
} from "../crm";
import { string2map } from "../utils";
import { fetchCampaign as procaCampaign } from "../proca";
class RateLimiter {
  private timestamps: number[] = [];
  private readonly maxPerMinute: number;
  private readonly haltMs = 15_000;
  private haltPromise: Promise<void> | null = null;

  constructor(maxPerMinute = 80) {
    this.maxPerMinute = maxPerMinute;
  }

  async throttle(): Promise<void> {
    if (this.haltPromise) {
      await this.haltPromise;
    }

    const now = Date.now();
    const windowStart = now - 60_000;
    this.timestamps = this.timestamps.filter((t) => t > windowStart);

    if (this.timestamps.length >= this.maxPerMinute) {
      const oldest = this.timestamps[0];
      const waitMs = oldest + 60_000 - now + 100;
      console.warn(`[ohme] Rate limit reached, waiting ${waitMs}ms`);
      await this.sleep(waitMs);
      this.timestamps = this.timestamps.filter((t) => t > Date.now() - 60_000);
    }

    this.timestamps.push(Date.now());
  }

  halt(): void {
    if (this.haltPromise) return;
    console.warn("[ohme] 429 received — halting all requests for 15s");
    this.haltPromise = this.sleep(this.haltMs).then(() => {
      this.timestamps = [];
      this.haltPromise = null;
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export type OhmeContact = {
  id: number;
  email: string;
  firstname: string;
  lastname: string;
  [key: string]: any;
};

export type OhmeContactPayload = {
  email: string;
  firstname: string;
  lastname: string;
  language?: string;
  [key: string]: any;
};

export type OhmeInteractionPayload = {
  date: string;
  interaction_type_name: string;
  interaction_category_name?: string;
  interaction_label_name?: string;
  contact: { id: number };
  [key: string]: any;
};

type OhmeUpsertResult = {
  contact: OhmeContact;
  isNew: boolean;
};

class OhmeCRM extends CRM {
  private readonly ohmeUrl: string;
  private readonly user: string;
  private readonly token: string;
  private readonly rateLimiter: RateLimiter;
  private readonly sourceField: string;
  private readonly contactExtraFields: Record<string, string> | undefined;
  private readonly interactionExtraFields: Record<string, string> | undefined;

  constructor(opt: {}) {
    super(opt);

    switch (process.env.CRM_TYPE) {
      case "DOUBLE_OPTIN":
        this.crmType = CRMType.DoubleOptIn;
        break;
      case "CONTACT":
        this.crmType = CRMType.Contact;
        break;
      case "ACTION_CONTACT":
        this.crmType = CRMType.ActionContact;
        break;
      default:
        // 'OPTIN'
        this.crmType = CRMType.OptIn;
    }

    this.ohmeUrl =
      process.env.CRM_API_URL || "https://api-ohme.oneheart.fr/api/v1";
    this.user = process.env.CRM_API_USERNAME || "";
    this.token = process.env.CRM_API_TOKEN || "";
    this.sourceField = process.env.CRM_SOURCE || "";
    this.contactExtraFields = process.env.CONTACT_EXTRA_FIELDS
      ? string2map(process.env.CONTACT_EXTRA_FIELDS)
      : undefined;
    this.interactionExtraFields = process.env.INTERACTION_EXTRA_FIELDS
      ? string2map(process.env.INTERACTION_EXTRA_FIELDS)
      : undefined;

    this.rateLimiter = new RateLimiter(
      parseInt(process.env.OHME_RATE_LIMIT || "80", 10),
    );

    if (!this.user || !this.token) {
      throw new Error(
        "[ohme] Missing CRM_API_USERNAME or CRM_API_TOKEN in env",
      );
    }
  }

  private resolveValue(path: string, message: ActionMessage, camp: any): any {
    const context = { message, camp };
    return path.split(".").reduce((obj: any, key) => obj?.[key], context);
  }

  private buildContactPayload(
    message: ActionMessage,
    camp: any,
  ): OhmeContactPayload {
    const payload: OhmeContactPayload = {
      email: message.contact.email,
      firstname: message.contact.firstName,
      lastname: message.contact.lastName || "",
      language: message.actionPage.locale,
    };

    if (this.contactExtraFields) {
      for (const [ohmeField, path] of Object.entries(this.contactExtraFields)) {
        const value = this.resolveValue(path, message, camp);
        if (value !== undefined && value !== null) {
          payload[ohmeField] = value;
        }
      }
    }

    return payload;
  }

  private buildInteractionPayload(
    message: ActionMessage,
    contact: OhmeContact,
    camp: any,
  ): OhmeInteractionPayload {
    const payload: OhmeInteractionPayload = {
      date: message.action.createdAt.split("T")[0],
      interaction_type_name:
        process.env.OHME_INTERACTION_TYPE || "Signature de Pétition",
      interaction_category_name:
        process.env.OHME_INTERACTION_CATEGORY || "Pétition",
      interaction_label_name: message.campaign.name,
      contact: { id: contact.id },
    };

    if (this.interactionExtraFields) {
      for (const [ohmeField, path] of Object.entries(
        this.interactionExtraFields,
      )) {
        const value = this.resolveValue(path, message, camp);
        if (value !== undefined && value !== null) {
          payload[ohmeField] = value;
        }
      }
    }

    return payload;
  }

  private headers(): Record<string, string> {
    return {
      Accept: "application/json",
      "Content-Type": "application/json",
      "client-name": this.user,
      "client-secret": this.token,
    };
  }

  private async ohmeRequest<T = any>(
    method: "GET" | "POST" | "PUT" | "DELETE",
    path: string,
    body?: Record<string, any>,
  ): Promise<{ status: number; data: T }> {
    await this.rateLimiter.throttle();

    const res = await fetch(`${this.ohmeUrl}${path}`, {
      method,
      headers: this.headers(),
      body: body ? JSON.stringify(body) : undefined,
    });

    if (res.status === 429) {
      this.rateLimiter.halt();
      throw { status: 429, message: "Too Many Requests" };
    }

    const raw = await res.json();
    const envelope: { status: number; data: T } = Array.isArray(raw)
      ? raw[0]
      : raw;

    if (!res.ok) {
      throw { status: res.status, body: envelope };
    }

    return { status: envelope.status, data: envelope.data };
  }

  private async upsertContact(
    payload: OhmeContactPayload,
  ): Promise<OhmeUpsertResult> {
    const { status, data } = await this.ohmeRequest<OhmeContact>(
      "POST",
      "/contacts",
      payload,
    );
    return { contact: data, isNew: status === 201 };
  }

  private async createInteraction(
    payload: OhmeInteractionPayload,
  ): Promise<void> {
    await this.ohmeRequest("POST", "/interactions", payload);
  }

  fetchContact = async (email: string): Promise<OhmeContact | null> => {
    const { data } = await this.ohmeRequest<OhmeContact[]>(
      "GET",
      `/contacts?email=${encodeURIComponent(email)}`,
    );
    return data[0] ?? null;
  };

  handleContact = async (
    message: ActionMessage,
  ): Promise<handleResult | boolean> => {
    const email = message.contact.email;

    const camp = await this.campaign(message.campaign);
    console.log("campaign", camp.config.component?.sync);

    try {
      let upsertResult: OhmeUpsertResult;
      try {
        console.log(
          "Payload for contact",
          this.buildContactPayload(message, camp),
        );
        upsertResult = await this.upsertContact(
          this.buildContactPayload(message, camp),
        );
      } catch (e: any) {
        if (e.status === 429) throw e;
        this.error(`[ohme] upsert failed for ${email}: ${JSON.stringify(e)}`);
        return { processed: false };
      }

      const { contact, isNew } = upsertResult;

      if (isNew && this.sourceField) {
        try {
          await this.ohmeRequest("PUT", `/contacts/${contact.id}`, {
            [this.sourceField]: message.campaign.name,
          });
        } catch (e: any) {
          this.error(
            `[ohme] failed to set source for ${email}: ${JSON.stringify(e)}`,
          );
        }
      }

      try {
        await this.createInteraction(
          this.buildInteractionPayload(message, contact, camp),
        );
      } catch (e: any) {
        if (e.status === 429) throw e;
        this.error(
          `[ohme] interaction failed for ${email}: ${JSON.stringify(e)}`,
        );
        return { processed: false };
      }

      this.log(`[ohme] ${isNew ? "created" : "updated"} ${email}`, undefined);
      return { processed: true };
    } catch (e: any) {
      if (e.status === 429) {
        this.error(`[ohme] 429 received, halting`);
        return { processed: false };
      }
      this.error(`[ohme] unexpected error for ${email}: ${JSON.stringify(e)}`);
      return { processed: false };
    }
  };

  fetchCampaign = async (campaign: ProcaCampaign): Promise<any> => {
    return procaCampaign(campaign.id);
  };

  setSubscribed = async (_id: any, _subscribed: boolean): Promise<boolean> => {
    return true;
  };

  setBounce = async (_id: any, _bounced: boolean): Promise<boolean> => {
    return true;
  };
}

export default OhmeCRM;
