import {
  CRM,
  CRMType,
  type ActionMessage,
  type handleResult,
  type ProcaCampaign,
} from "../crm";

class OhmeCRM extends CRM {
  private user: string;
  private token: string;
  private url: string;

  constructor(opt: {}) {
    super(opt);
    this.crmType = CRMType.OptIn;
    this.user = process.env.CRM_API_USERNAME || "";
    this.token = process.env.CRM_API_TOKEN || "";
    this.url = process.env.CRM_API_URL || "https://api-ohme.oneheart.fr/api/v1";
  }

  private headers() {
    return {
      Accept: "application/json",
      "Content-Type": "application/json",
      "client-name": this.user,
      "client-secret": this.token,
    };
  }

  fetchContact = async (email: string): Promise<any> => {
    const res = await fetch(
      `${this.url}/contacts?email=${encodeURIComponent(email)}`,
      {
        headers: this.headers(),
      },
    );
    if (!res.ok) throw { status: res.status, body: await res.json() };
    const json = await res.json();
    return json[0]?.data?.[0] ?? null;
  };

  handleContact = async (
    message: ActionMessage,
  ): Promise<handleResult | boolean> => {
    console.log(
      "handling contact",
      message.contact.email,
      "for campaign",
      message.campaign,
    );

    try {
      const res = await this.fetchContact(message.contact.email);
      console.log("fetched contact", res);
      return false;
    } catch (e) {
      this.error(`failed ${message.contact.email} ${JSON.stringify(e)}`);
      return false;
    }
  };

  fetchCampaign = async (campaign: ProcaCampaign): Promise<any> => {
    return true;
  };
}

export default OhmeCRM;
