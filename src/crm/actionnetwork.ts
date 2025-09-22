import { ActionMessageV2 } from '@proca/queue';
import {
  Contact,
  CRM,
  CRMType,
  handleResult,
  ProcaCampaign
} from "../crm";
import dotenv from "dotenv";
import { fetchCampaign as procaCampaign }  from '../proca';
dotenv.config();

const url = process.env.CRM_URL as string;
const token = process.env.CRM_API_TOKEN as string; // change!!
const formID = process.env.CRM_FORM as string;

const testToken = process.env.CRM_TEST_API_TOKEN as string;
const testFormID = process.env.CRM_TEST_FORM as string;

if (!url || !token) {
  console.error("Missing CRM credentials.");
  process.exit(1);
};

if (!testToken) {
  console.error("Missing test credentials, defaulting to prod")
};

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
        const lang = message.actionPage.locale.split("_")[0].toLowerCase(); // en_GB → en
        attrs.custom_fields ||= {};
        attrs.custom_fields[`speaks_${lang}`] = "1";
      break;
    }
  }
};

const actionToPerson = (message: ActionMessageV2, tags: string[], status: "subscribed" | "unsubscribed"): ANPersonPayload => {
  const { contactRef, email, firstName, lastName, phone, postcode, country, area } = message.contact;
  const lang = (message.actionPage.locale.split("_")[0] || "en").toLowerCase();

  const person: ANPerson = {
    identifiers: [`proca:${contactRef}`],
    given_name: firstName,
    family_name: lastName,
    email_addresses: [{ address: email, status }],
    languages_spoken: [lang],
    ...(phone && { phone_numbers: [{ number: phone, status }] }),
    ...(postcode || country || area ? {
      postal_addresses: [
        ...(postcode ? [{ postal_code: postcode }] : []),
        ...(country || area ? [{ country: country || area }] : []),
      ]
    } : {})
  };

  customizePersonAttrs(message, person);
  return { person, add_tags: tags };
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

const getHeaders = (test: boolean) => ({
  "Content-Type": "application/json",
  "OSDI-API-Token": test && testToken ? testToken : token,
});

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
     const r = await procaCampaign(campaign.id);
    return r;
  }

    async fetchForm(id, test): Promise<any> {
    if (!id) {
      throw new Error("Form ID is missing");
    }

    // return from cache if available
    if (this.formCache.has(id)) {
      return this.formCache.get(id);
    }
      try {
        const res = await fetch(`${url}/forms/${id}`, {
          method: "GET",
          headers: getHeaders(test)
        });

      if (!res.ok) {
        throw new Error(`Failed to fetch form: ${res.status} ${res.statusText}`);
      }

      const formData = await res.json();
      this.formCache.set(id, formData); // cache it
      return formData;
    } catch (err: any) {
      console.error(`Error fetching form ${id}:`, err.message);
      throw err;
    }
  }


  // submit an action (form submission) for a given person
  submitAction = async (
    form: any,
    personUri: string,
    action: ActionMessageV2,
    test,
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
      headers:  getHeaders(test),
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


fetchContact = async (email: string, test): Promise<any> => {
    try {
      const res = await fetch(`${url}/people?filter=email_address eq '${encodeURIComponent(email)}'`, {
        headers: getHeaders(test),
      });

      if (!res.ok) {
        throw new Error(`ActionNetwork API error: ${res.status} ${res.statusText}`);
      }
      const data = await res.json();
      // People are in _embedded["osdi:people"]
      const people = data?._embedded?.["osdi:people"];
      if (people && people.length > 0) {
        return people[0]; // return the first match
      }
      return null;
    } catch (err: any) {
      console.error(`Error fetching contact from ActionNetwork: ${err.message}`);
      return null;
    }
  };

  upsertContact = async (person: ANPersonPayload, test: boolean): Promise<any> => {

    try {
      const res = await fetch(`${url}/people`, {
        method: "POST",
        headers: getHeaders(test),
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

  setTags = async (tagNames: string[], test: boolean): Promise<void> => {
  for (const tagName of tagNames) {
    try {
      if (this.tagCache.has(tagName)) continue;

      // Try fetching the tag
      const res = await fetch(`${url}/tags?filter=name eq '${encodeURIComponent(tagName)}'`, {
        headers: getHeaders(test),
      });

      if (!res.ok) throw new Error(`Failed to fetch tag "${tagName}": ${res.status}`);

      const data = await res.json();
      let tag = data?._embedded?.["osdi:tags"]?.find((t: any) => t.name === tagName) || null;

      // If no tag, create it
      if (!tag) {
        const createRes = await fetch(`${url}/tags`, {
          method: "POST",
          headers: getHeaders(test),
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
    const test = message.action.testing;
    console.log("Processing action:", message.action.id, "testing:", test);

    const campaign = await this.fetchCampaign(message.campaign);

    if (this.verbose) {
      console.log(JSON.stringify(message, null, 2));
    }
    try {
      const tags = ["supporter", message.campaign.name];
      await this.setTags(tags, test);
      const status = message.privacy.optIn ? "subscribed" : "unsubscribed";
      const personPayload = actionToPerson(message, tags, status);

      if (!message.privacy.optIn) {
        const exists = await this.fetchContact(message.contact.email, test);
        // if supporter who opts-out exists and is subscribed, we do not unsubscribe them
        if (exists) adjustStatus(personPayload, exists, message.contact);
      }

      const contact = await this.upsertContact(personPayload, test);
      const personUri = contact?._links?.self?.href;
      if (!personUri) throw new Error("No person URI returned");

      const f = test
      ? (campaign.config.component?.sync?.test_form || testFormID || formID)
      : (campaign.config.component?.sync?.form || formID);

      if (test && !campaign.config.component?.sync?.test_form && !testFormID) {
        console.warn("Test mode enabled but no test form configured – falling back to prod form");
      }
      const form = await this.fetchForm(f, test);
      await this.submitAction(form, personUri, message, test);
      console.log("Submitted action:", message.action.id);
      return true;
    } catch (err: any) {
      console.error("Error handling contact/action:", err.message);
      return false;
    }
  };
}


export default ActionNetwork;
