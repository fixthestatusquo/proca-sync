import {
  CRM,
  CRMType,
  type ActionMessage,
  type handleResult,
  type ProcaCampaign,
} from "../crm";

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
  source?: string;
  [key: string]: any;
};

export type OhmeInteractionPayload = {
  date: string;
  interaction_type_name: string;
  contact: { id: number };
  app_name?: string;
  interaction_category_name?: string;
  interaction_label_name?: string;
  comment?: string;
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
  private readonly client: string;
  private readonly rateLimiter: RateLimiter;

  constructor(opt: {}) {
    super(opt);
    this.crmType = CRMType.OptIn;

    this.ohmeUrl =
      process.env.CRM_API_URL || "https://api-ohme.oneheart.fr/api/v1";
    this.user = process.env.CRM_API_USERNAME || "";
    this.token = process.env.CRM_API_TOKEN || "";
    this.client = (process.env.OHME_CLIENT || "").toLowerCase();
    this.rateLimiter = new RateLimiter(80);

    if (!this.user || !this.token) {
      throw new Error(
        "[ohme] Missing CRM_API_USERNAME or CRM_API_TOKEN in env",
      );
    }
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

  private buildContactPayload(message: ActionMessage): OhmeContactPayload {
    const payload: OhmeContactPayload = {
      email: message.contact.email,
      firstname: message.contact.firstName,
      lastname: message.contact.lastName || "",
    };

    switch (this.client) {
      case "pollinis": {
        const campaignValue = message.campaign.title || message.campaign.name;
        const petitionField =
          process.env.OHME_PETITIONNAIRE_FIELD || "petitionnaire";
        const interestField =
          process.env.OHME_CENTRE_INTERET_FIELD || "centre_interet";
        payload[petitionField] = [campaignValue];
        payload[interestField] = [campaignValue];
        break;
      }
    }

    return payload;
  }

  private getSource(message: ActionMessage): string {
    return (
      process.env.OHME_SOURCE || message.campaign.title || message.campaign.name
    );
  }

  private buildInteractionPayload(
    message: ActionMessage,
    contact: OhmeContact,
  ): OhmeInteractionPayload {
    const base: OhmeInteractionPayload = {
      date: message.action.createdAt.split("T")[0],
      interaction_type_name:
        process.env.OHME_INTERACTION_TYPE || "Signature pétition",
      app_name: process.env.OHME_APP_NAME || "proca",
      interaction_label_name: message.campaign.title || message.campaign.name,
      contact: { id: contact.id },
    };

    return base;
  }

  handleContact = async (
    message: ActionMessage,
  ): Promise<handleResult | boolean> => {
    const email = message.contact.email;

    try {
      let upsertResult: OhmeUpsertResult;
      try {
        upsertResult = await this.upsertContact(
          this.buildContactPayload(message),
        );
      } catch (e: any) {
        if (e.status === 429) throw e;
        this.error(`[ohme] upsert failed for ${email}: ${JSON.stringify(e)}`);
        return { processed: false };
      }

      const { contact, isNew } = upsertResult;

      if (isNew) {
        try {
          await this.ohmeRequest("PUT", `/contacts/${contact.id}`, {
            source: this.getSource(message),
          });
        } catch (e: any) {
          this.error(
            `[ohme] failed to set source for ${email}: ${JSON.stringify(e)}`,
          );
        }
      }

      try {
        await this.createInteraction(
          this.buildInteractionPayload(message, contact),
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

  fetchCampaign = async (_campaign: ProcaCampaign): Promise<any> => {
    return _campaign;
  };

  setSubscribed = async (_id: any, _subscribed: boolean): Promise<boolean> => {
    return true;
  };

  setBounce = async (_id: any, _bounced: boolean): Promise<boolean> => {
    return true;
  };
}

export default OhmeCRM;
