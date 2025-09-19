import { ActionMessageV2 } from '@proca/queue';
import {
  Contact,
  CRM,
  CRMType,
  handleResult,
  ProcaCampaign
} from "../crm";
import dotenv from "dotenv";

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
  email_addresses: { address: string, status: string }[];
  phone_numbers?: { number: string, status: string }[];
  postal_addresses?: { postal_code?: string }[];
  identifiers?: string[];
  languages_spoken?: string[];
};

type ANPersonPayload = {
  person: ANPerson;
  add_tags: string[];
};

const customizePersonAttrs = (message: ActionMessageV2, attrs: any) => {
  switch (process.env.PROCA_USERNAME) {
    case "greens": {
      const locale = attrs.languages_spoken?.[0];
      if (locale) {
        const lang = message.actionPage.locale.split("_")[0].toLowerCase(); // en_GB → en
        attrs.custom_fields ||= {};
        attrs.custom_fields[`speaks_${lang}`] = "1";
      }
      break;
    }
  }
};

const actionToPerson = (message: ActionMessageV2,
  tags: string[],
  status: "subscribed" | "unsubscribed"): ANPersonPayload => {
  const { area, contactRef, country, email, firstName, lastName, postcode, phone } = message.contact;
  const lang = message.actionPage.locale.split("_")[0].toLowerCase() || "en";

  const person: any = {
    identifiers: [`proca:${contactRef}`],
    given_name: firstName,
    family_name: lastName,
    email_addresses: [{ address: email, status: status }],
    languages_spoken: [lang]
  };

  if (phone) {
    person.phone_numbers = [
      {
        number: phone,
        status: status
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

  customizePersonAttrs(message, person);

  return { person: person, "add_tags": tags  };
};



const adjustStatus = (personPayload: ANPersonPayload, exists: any, contact: Contact & { phone: string }) => {

  const existingEmail = exists?.email_addresses?.find(
    e => e.address.toLowerCase() === contact.email
  );

  if (existingEmail && existingEmail.status === "subscribed") {
    personPayload.person.email_addresses[0].status = "subscribed";
  }

  if (contact?.phone && exists?.phone_numbers?.length) {
    const existingPhone = exists.phone_numbers.find(
      p => p.number.replace(/\D/g, "") === contact.phone.replace(/\D/g, "")
    );
    if (existingPhone && existingPhone.status === "subscribed" && personPayload.person.phone_numbers) {
      personPayload.person.phone_numbers[0].status = "subscribed";
    }
  }
  return personPayload;
};

const headers = {
  "Content-Type": "application/json",
  "OSDI-API-Token": token!,
};


class ActionNetwork extends CRM {
  formCache: Map<any, any>;
  tagCache: Map<any, any>;
  constructor(opt: {}) {
    super(opt);
    this.crmType = CRMType.Contact;
    this.formCache = new Map();
    this.tagCache = new Map();
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


fetchTestForm = async () => {
  const url = `https://actionnetwork.org/api/v2/forms/9693c20c-37e4-408b-8de1-caee11407d4e/`;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: headers    });

    if (!res.ok) {
      throw new Error(`Request failed: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    return data;
  } catch (err) {
    console.error("Error fetching form:", err);
    throw err;
  }
}

fetchContact = async (email: string): Promise<any> => {
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
      return await res.json();
    } catch (err: any) {
      console.error(`Error upserting contact in ActionNetwork: ${err.message}`);
      return null;
    }
  };

  setTags = async (tagNames: string[]): Promise<void> => {
  for (const tagName of tagNames) {
    try {
      if (this.tagCache.has(tagName)) continue;

      // Try fetching the tag
      const res = await fetch(`${url}/tags?filter=name eq '${encodeURIComponent(tagName)}'`, { headers });
      if (!res.ok) throw new Error(`Failed to fetch tag "${tagName}": ${res.status}`);

      const data = await res.json();
      let tag = data?._embedded?.["osdi:tags"]?.find((t: any) => t.name === tagName) || null;

      // If no tag, create it
      if (!tag) {
        const createRes = await fetch(`${url}/tags`, {
          method: "POST",
          headers,
          body: JSON.stringify({ name: tagName, origin_system: "Proca" }),
        });
        if (!createRes.ok) throw new Error(`Failed to create tag "${tagName}": ${createRes.status} ${createRes.statusText}`);
        tag = await createRes.json();
      }

      // Cache the tag
      this.tagCache.set(tagName, tag);
    } catch (err: any) {
      throw new Error(`Error ensuring tag "${tagName}": ${err.message}`);
    }
  }
};

  handleContact = async (message: ActionMessageV2): Promise<handleResult | boolean> => {
     console.log("Processing action:", message.action.id, "testing:", message.action.testing);

      if (this.verbose) {
      console.log(JSON.stringify(message, null, 2));
    }
    try {
      const tags = ["supporter", message.campaign.name];
      await this.setTags(tags);
      const status = message.privacy.optIn ? "subscribed" : "unsubscribed";
      const personPayload = actionToPerson(message, tags, status);

      if (!message.privacy.optIn) {
        const exists = await this.fetchContact(message.contact.email);
        // if supporter who opts-out exists and is subscribed, we do not unsubscribe them
        if (exists) adjustStatus(personPayload, exists, message.contact);
      }

      const contact = await this.upsertContact(personPayload);
      const personUri = contact?._links?.self?.href;
      if (!personUri) throw new Error("No person URI returned");
      return true;
    } catch (err: any) {
      console.error("Error handling contact/action:", err.message);
      return false;
    }
  };
}


export default ActionNetwork;
