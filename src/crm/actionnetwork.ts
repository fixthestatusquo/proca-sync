import { ActionMessageV2 } from '@proca/queue';
import {
  CRM,
  CRMType,
  handleResult,
  ProcaCampaign
} from "../crm";
import dotenv from "dotenv";
import { fetchCampaign as procaCampaign }  from '../proca';

dotenv.config();

const url = process.env.CRM_URL as string;
const token = process.env.CRM_API_TOKEN as string;

if (!url || !token) {
  console.error("Missing CRM credentials.");
  process.exit(1);
}

type ANPerson = {
  given_name?: string;
  family_name?: string;
  email_addresses: { address: string }[];
  phone_numbers?: { number: string }[];
  postal_addresses?: { postal_code?: string }[];
  identifiers?: string[];
  languages_spoken?: string[];
};

type ANPersonPayload = {
  person: ANPerson;
};

const actionToPerson = (message: ActionMessageV2): ANPersonPayload => {
  const { area, contactRef, country,  email, firstName, lastName,  postcode, phone } = message.contact;

  const person: any = {
    identifiers: [`proca:${contactRef}`],
    given_name: firstName,
    family_name: lastName,
    email_addresses: [{ address: email }],
    languages_spoken: [ message.actionPage?.locale ]
  };

  if (phone) {
    person.phone_numbers = [
      {
        number: phone
      },
    ];
  };

  if (postcode || country || area) {
    person.postal_addresses = [];
    if (postcode) {
    person.postal_addresses.push({ postal_code: postcode });
  }
    if (country || area) {
      person.postal_addresses.push({ country: country || area });
    }
  };

  // Clean out undefined keys which is only maybe lastName
  Object.keys(person).forEach(
    (k) => person[k] === undefined && delete person[k]
  );

  return { person };
};

const headers = {
  "Content-Type": "application/json",
  "OSDI-API-Token": token!,
};


class ActionNetwork extends CRM {
  formCache: Map<any, any>;
  constructor(opt: {}) {
    super(opt);
    this.crmType = CRMType.OptIn;
    this.formCache = new Map();
  }

  fetchCampaign = async (campaign: ProcaCampaign): Promise<any> => {
    return true;
  }

  async fetchForm(campaignTitle: string, locale: string): Promise<any> {
    const key = `${campaignTitle}:${locale}`;
    if (this.formCache.has(key)) {
      return this.formCache.get(key);
    }

    const formTitle = `${campaignTitle} ${locale.split("_")[0].toUpperCase()}`;
    const res = await fetch(
      `${url}/forms?filter=title eq '${encodeURIComponent(formTitle)}'`,
      {
        headers: headers
      }
    );

    if (!res.ok) {
      throw new Error(`Failed to fetch form: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    let form = data?._embedded?.["osdi:forms"]?.[0] || null;

    // If no form, create one
    if (!form) {
      console.log(`No form found, creating new form: ${formTitle}`);
      const createRes = await fetch(`${url}/forms`, {
        method: "POST",
        headers: headers,
        body: JSON.stringify({
          name: formTitle,
          title: formTitle,
          origin_system: "Proca",
        }),
      });

      if (!createRes.ok) {
        throw new Error(`Failed to create form: ${createRes.status} ${createRes.statusText}`);
      };
      form = await createRes.json();
    }
    this.formCache.set(key, form);
    return form;
  }

  // submit an action (form submission) for a given person
  submitAction = async (
    form: any,
    personUri: string,
    action: ActionMessageV2,
    autoresponse = true
  ) => {
    const submissionUrl = form._links?.["osdi:submissions"]?.href;
    if (!submissionUrl) throw new Error("Form has no submissions link");

    const data: any = {
      _links: {
        "osdi:person": { href: personUri },
      },
      triggers: { autoresponse: { enabled: autoresponse } },
    };

    if (action.tracking?.source) {
      const rd: any = {
        source: action.tracking.source === "a/n" ? "unknown" : action.tracking.source,
      };
      if (action.tracking.source === "referrer") {
        rd.website = action.tracking.campaign;
      }
      data["action_network:referrer_data"] = rd;
    }

    const res = await fetch(submissionUrl, {
      method: "POST",
      headers:  headers,
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(
        `Error submitting action: ${res.status} ${res.statusText} - ${errText}`
      );
    }
    return await res.json();
  };

  fetchContact = async (email: string, context?: any): Promise<any> => {
    console.log(`Fetching contact for email: ${email}`);
    try {
      const res = await fetch(`${url}/people?filter=email_address eq '${encodeURIComponent(email)}'`, {
        headers: headers,
      });

      if (!res.ok) {
        throw new Error(`ActionNetwork API error: ${res.status} ${res.statusText}`);
      }
      const data = await res.json();
      // People are in _embedded["osdi:people"]
      const people = data?._embedded?.["osdi:people"];
      if (people && people.length > 0) {
        console.log(`Found ${people.length} contact(s) for email ${email}`);
        return people[0]; // return the first match
      }
      return null;
    } catch (err: any) {
      console.error(`Error fetching contact from ActionNetwork: ${err.message}`);
      return null;
    }
  };

  upsertContact = async (person: ANPersonPayload): Promise<any> => {

    try {
      const res = await fetch(`${url}/people`, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(person),
      });

      if (!res.ok) {
        throw new Error(`ActionNetwork API error: ${res.status} ${res.statusText}`);
      }
      console.log(`Upserted contact with status ${res.status}`);
      return await res.json();
    } catch (err: any) {
      console.error(`Error upserting contact in ActionNetwork: ${err.message}`);
      return null;
    }
  };

  handleActionContact = async (message: ActionMessageV2): Promise<handleResult | boolean> => {
     console.log("Processing action:", message.action.id, "testing:", message.action.testing);

      if (this.verbose) {
      console.log(JSON.stringify(message, null, 2));
    }
    try {
      const personPayload = actionToPerson(message);
      const contact = await this.upsertContact(personPayload);
      const personUri = contact?._links?.self?.href;
      if (!personUri) throw new Error("No person URI returned");

      const form = await this.fetchForm(message.campaign.title, message.actionPage.locale);

      await this.submitAction(form, personUri, message);
      console.log("Submitted action:", message.action.id);

      return true;
    } catch (err: any) {
      console.error("Error handling contact/action:", err.message);
      return false;
    }
  };
}


export default ActionNetwork;
