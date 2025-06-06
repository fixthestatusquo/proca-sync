import {
  CRM,
  CRMType,
  ActionMessage,
  handleResult,
  ProcaCampaign,
} from "../crm";
import dotenv from "dotenv";
import { pick } from "lodash";
import { fetchCampaign as procaCampaign }  from '../proca';

dotenv.config();

const url = process.env.CRM_URL;
const token = process.env.CRM_API_TOKEN;

if (!url || !token) {
  console.error("Missing CRM credentials.");
  process.exit(1);
}

type ContactPayload = {
  email?: string;
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
  email?: string;
  firstName: string;
  lastName?: string;
  phone?: string;
  fieldValues: FieldValue[];
};

type ActiveCampaignPayload = {
  contact: ActiveCampaignContact;
};

class ActiveCampaign extends CRM {
  constructor(opt: {}) {
    super(opt);
    this.crmType = CRMType.ActionContact;
  }

  fetchCampaign = async (campaign: ProcaCampaign): Promise<any> => {
    const r = await procaCampaign (campaign.id);
    return r;
  }

  headers: HeadersInit = {
    'Api-Token': token!,
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  };

  // actionid for the last campaign
  // send data source, text field, value "proca"

  body = ({ email, firstName, lastName, contactRef, id, phone, postcode }: ContactPayload,
    data_source: string,
    action_id_field: string,
    ref_field: string,
    zip_field: string) => {
    const fieldValues = [
      {
        field: data_source, // data_source field ID
        value: 'proca'
      },
      {
        field: action_id_field,
        value: id
      },
      {
        field: ref_field,
        value: contactRef
      }
    ];

  // Add ZIP (postcode) only if it's provided
  if (postcode) {
    fieldValues.push({
      field: zip_field, // ZIP field ID, default is 11
      value: postcode
    });
  }

  const contact: ActiveCampaignContact = {
    firstName,
    fieldValues
  };

  // Conditionally add optional fields
  if (email) contact.email = email;
  if (lastName) contact.lastName = lastName;
  if (phone) contact.phone = phone;

  return JSON.stringify({ contact });
  };

  async  getActiveCampaignFields() {
    try {
      const response = await fetch(`${url}/api/3/fields`, {
        method: 'GET',
        headers: this.headers
      });
      if (!response.ok) {
        throw new Error(`Error fetching fields: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      console.log('Retrieved fields:', data.fields);
      return data.fields;
    } catch (error) {
      console.error('Failed to fetch ActiveCampaign fields:', error);
      return null;
    }
  }

  async getActiveCampaignLists() {
  try {
    const response = await fetch(`${url}/api/3/lists`, {
      method: 'GET',
      headers: this.headers
    });

    if (!response.ok) {
      throw new Error(`Error fetching lists: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    console.log('Retrieved lists:', data.lists);
    return data.lists;
  } catch (error) {
    console.error('Failed to fetch ActiveCampaign lists:', error);
    return null;
  }
}


  fetchContact = async (email: string): Promise<string | undefined> => {
    console.log("Fetching contact:", email);
    try {
      const res = await fetch(`${url}/api/3/contacts?email=${encodeURIComponent(email)}`, {
        method: "GET",
        headers: this.headers,
      });

      if (!res.ok) return;

      const data = await res.json();
      return data.contacts?.[0]?.id;


    } catch (err) {
      console.error("Error fetching contact:", err);
    }
  };

  createContact = async (bodyContent: string): Promise<string> => {
    const res = await fetch(`${url}/api/3/contacts`, {
      method: "POST",
      headers: this.headers,
      body: bodyContent,
    });
    if (!res.ok) throw new Error(`Failed to create contact: ${res.statusText}`);
    const data = await res.json();
    return data.contact.id;
  };

  updateContact = async (contactid: string, bodyContent: string): Promise<string> => {
    const res = await fetch(`${url}/api/3/contacts/${contactid}`, {
      method: "PUT",
      headers: this.headers,
      body: bodyContent,
    });

    if (!res.ok) throw new Error(`Failed to update contact: ${res.statusText}`);
    const data = await res.json();
    return data.contact.id;
  };

  subscribeToList = async (contactid: string, listid: string): Promise<void> => {
    const res = await fetch(`${url}/api/3/contactLists`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({
        contactList: {
          list: listid,
          contact: contactid,
          status: 1
        },
      }),
    });

    if (!res.ok) throw new Error(`Failed to subscribe to list: ${res.statusText}`);
  };

  //The tag must already exist, default?
  addTagsToContact = async (contactId: string, tagIds: string): Promise<void> => {
    const ids = tagIds.replace(/\s+/g, "").split(",");
    for (const tagId of ids) {
      const res = await fetch(`${url}/api/3/contactTags`, {
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
      throw new Error(`Failed to add tag ${tagId}: ${JSON.stringify(errorData)}`);
    }
  }
};

  handleActionContact = async (
    message: ActionMessage
  ): Promise<handleResult | boolean> => {
    const email = message.contact.email;

    console.log("Processing action:", message.action.id, "testing:", message.action.testing);

      if (this.verbose) {
      console.log(JSON.stringify(message, null, 2));
    }
    try {
      // updates will not be considered!!!
      const camp = await this.campaign(message.campaign);
      const { listid,
        tagids,
        action_id_field,
        ref_field,
        data_source,
        zip_field } = camp.config?.component?.sync || {};

      if (!tagids || !action_id_field || !ref_field || !data_source || !zip_field) {
        console.error("Missing required configuration for ActiveCampaign sync");
        return false;
      };

      let contactid = await this.fetchContact(email);

      // Email is necessary to create contact, but it is redundant for the update
      const contactPayload: ContactPayload = {
        ...(contactid
          ? pick(message.contact, ['firstName', 'lastName', 'contactRef', 'phone', 'postcode'])
          : pick(message.contact, ['email', 'firstName', 'lastName', 'contactRef', 'phone', 'postcode'])),
        id: message.action.id,
      };

      const bodyContent = this.body(
        contactPayload,
        data_source,
        action_id_field,
        ref_field,
        zip_field);

      if (contactid) {
        console.log("Contact already exists, update:", contactid);
        contactid = await this.updateContact(contactid, bodyContent);
      } else {
        console.log("Creating new contact:", email);
        contactid = await this.createContact(bodyContent);
      }

      if (!contactid) {
        console.error("Failed to create or update contact");
        return false;
      }

      // Subscribe to list
      await this.subscribeToList(contactid, listid || '1');

      // Add petition-specific tags
      await this.addTagsToContact(contactid, tagids);

      console.log("Action contact processed successfully", message.action.id);
      return true;
    } catch (err) {
      console.error("Error handling contact action:", err.message);
      return false;
    }
    };
}

export default ActiveCampaign;
