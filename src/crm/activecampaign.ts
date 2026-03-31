import {
  CRM,
  CRMType,
  type ActionMessage,
  type EventMessage,
  type handleResult,
  type ProcaCampaign,
} from "../crm";
import dotenv from "dotenv";
import { pick } from "lodash";
import { fetchCampaign as procaCampaign } from "../proca";

dotenv.config();

export type Message = ActionMessage | EventMessage;

type ContactPayload = {
  email: string;
  firstName: string;
  lastName?: string;
  contactRef: string;
  id: string;
  postcode?: string;
  phone?: string;
};

type FieldValue = {
  field: string;
  value: string;
};

type ActiveCampaignContact = {
  email: string;
  firstName: string;
  lastName?: string;
  phone?: string;
  fieldValues: FieldValue[];
};

class ActiveCampaign extends CRM {
  private url: string;
  private token: string;
  private headers: HeadersInit;

  constructor(opt: {}) {
    super(opt);
    switch (process.env.CRM_TYPE) {
      case "DOUBLE_OPTIN":
        this.crmType = CRMType.DoubleOptIn;
        break;
      case "ActionContact":
        this.crmType = CRMType.ActionContact;
        break;
      default:
        this.crmType = CRMType.DoubleOptIn;
    }

    this.url = process.env.CRM_URL || "";
    this.token = process.env.CRM_API_TOKEN || "";

    if (!this.url || !this.token) {
      throw new Error(`Missing CRM_URL or CRM_API_TOKEN`);
    }

    this.headers = {
      "Api-Token": this.token,
      Accept: "application/json",
      "Content-Type": "application/json",
    };
  }

  fetchCampaign = async (campaign: ProcaCampaign): Promise<any> => {
    return procaCampaign(campaign.id);
  };

  private getOrgFieldValues(contact: ContactPayload, sync: any): FieldValue[] {
    switch (process.env.ORG) {
      case "duh": {
        const { data_source, action_id_field, ref_field, zip_field } = sync;
        if (!data_source || !action_id_field || !ref_field) return [];

        const fields: FieldValue[] = [
          { field: data_source, value: "proca" },
          { field: action_id_field, value: contact.id },
          { field: ref_field, value: contact.contactRef },
        ];

        if (contact.postcode && zip_field) {
          fields.push({ field: zip_field, value: contact.postcode });
        }

        return fields;
      }
      default:
        return [];
    }
  }

  body = (contact: ContactPayload, sync: any): string => {
    const fieldValues = this.getOrgFieldValues(contact, sync);

    const ac: ActiveCampaignContact = {
      firstName: contact.firstName,
      email: contact.email,
      fieldValues,
    };

    if (contact.lastName) ac.lastName = contact.lastName;
    if (contact.phone) ac.phone = contact.phone;

    return JSON.stringify({ contact: ac });
  };

  async getActiveCampaignFields() {
    try {
      const response = await fetch(`${this.url}/api/3/fields`, {
        method: "GET",
        headers: this.headers,
      });
      if (!response.ok) {
        throw new Error(
          `Error fetching fields: ${response.status} ${response.statusText}`,
        );
      }
      const data = await response.json();
      console.log("Retrieved fields:", data.fields);
      return data.fields;
    } catch (error) {
      console.error("Failed to fetch ActiveCampaign fields:", error);
      return null;
    }
  }

  async getActiveCampaignLists() {
    try {
      const response = await fetch(`${this.url}/api/3/lists`, {
        method: "GET",
        headers: this.headers,
      });
      if (!response.ok) {
        throw new Error(
          `Error fetching lists: ${response.status} ${response.statusText}`,
        );
      }
      const data = await response.json();
      console.log("Retrieved lists:", data.lists);
      return data.lists;
    } catch (error) {
      console.error("Failed to fetch ActiveCampaign lists:", error);
      return null;
    }
  }

  fetchContact = async (email: string): Promise<string | undefined> => {
    try {
      const res = await fetch(
        `${this.url}/api/3/contacts?email=${encodeURIComponent(email)}`,
        {
          method: "GET",
          headers: this.headers,
        },
      );
      if (!res.ok) return;
      const data = await res.json();
      return data.contacts?.[0]?.id;
    } catch (err) {
      console.error("Error fetching contact:", err);
    }
  };

  createContact = async (bodyContent: string): Promise<string> => {
    const res = await fetch(`${this.url}/api/3/contacts`, {
      method: "POST",
      headers: this.headers,
      body: bodyContent,
    });
    if (!res.ok) throw new Error(`Failed to create contact: ${res.statusText}`);
    const data = await res.json();
    return data.contact.id;
  };

  updateContact = async (
    contactid: string,
    bodyContent: string,
  ): Promise<string> => {
    const res = await fetch(`${this.url}/api/3/contacts/${contactid}`, {
      method: "PUT",
      headers: this.headers,
      body: bodyContent,
    });
    if (!res.ok) throw new Error(`Failed to update contact: ${res.statusText}`);
    const data = await res.json();
    return data.contact.id;
  };

  syncContact = async (bodyContent: string): Promise<string> => {
    const res = await fetch(`${this.url}/api/3/contact/sync`, {
      method: "POST",
      headers: this.headers,
      body: bodyContent,
    });
    if (!res.ok) throw new Error(`Failed to sync contact: ${res.statusText}`);
    const data = await res.json();
    return data.contact.id;
  };

  subscribeToList = async (
    contactid: string,
    listid: string,
  ): Promise<void> => {
    const res = await fetch(`${this.url}/api/3/contactLists`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({
        contactList: {
          list: listid,
          contact: contactid,
          status: 1,
        },
      }),
    });
    if (!res.ok)
      throw new Error(`Failed to subscribe to list: ${res.statusText}`);
  };

  addTagsToContact = async (
    contactId: string,
    tagIds: string,
  ): Promise<void> => {
    const ids = tagIds.replace(/\s+/g, "").split(",");
    for (const tagId of ids) {
      const res = await fetch(`${this.url}/api/3/contactTags`, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify({
          contactTag: {
            contact: contactId,
            tag: tagId,
          },
        }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(
          `Failed to add tag ${tagId}: ${JSON.stringify(errorData)}`,
        );
      }
    }
  };

  handleActionContact = async (
    message: ActionMessage,
  ): Promise<handleResult | boolean> => {
    console.log(
      "Processing action:",
      message.action.id,
      "testing:",
      message.action.testing,
    );
    if (this.verbose) console.log(JSON.stringify(message, null, 2));

    try {
      // updates will not be considered!!!
      const camp = await this.campaign(message.campaign);
      const sync = camp.config?.component?.sync || {};

      const listid = sync.listid || process.env.AC_LIST_ID;
      const tagids = sync.tagids || process.env.AC_TAG_IDS;

      const contactPayload: ContactPayload = {
        ...pick(message.contact, [
          "email",
          "firstName",
          "lastName",
          "contactRef",
          "phone",
          "postcode",
        ]),
        id: message.action.id,
      };

      const bodyContent = this.body(contactPayload, sync);
      const contactid = await this.syncContact(bodyContent);

      if (!contactid) {
        console.error("Failed to sync contact, action ID:", message.action.id);
        return false;
      }
      if (listid) await this.subscribeToList(contactid, listid);
      if (tagids) await this.addTagsToContact(contactid, tagids);

      console.log("Action contact processed successfully", message.action.id);
      return true;
    } catch (err) {
      console.error("Error handling contact action:", err.message);
      return false;
    }
  };
}

export default ActiveCampaign;
