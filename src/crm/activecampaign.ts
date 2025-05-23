import { count } from '@proca/queue';
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
};

class ActiveCampaign extends CRM {
  constructor(opt: {}) {
    super(opt);
    this.crmType = CRMType.ActionContact;
  }

   fetchCampaign = async (id: number): Promise<any> => {
     const r = await procaCampaign(id);
    return r;
  }

  headers: HeadersInit = {
    'Api-Token': token!,
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  };

  // actionid for the last campaign
  // send data source, text field, value "proca"

  body = ({ email, firstName, lastName, contactRef, id }: ContactPayload) => {
    const body: any = {
      contact: {
          firstName: firstName,
          lastName: lastName,
          proca_ref_id: contactRef,
          proca_777_action_id: id,
          fieldValues: [
            {
              field: '29', // ID of the 'data_source' custom field
              value: 'proca'
            },
            {
              field: '39', // ID of the 'proca_777_action_id' custom field
              value: id
            },
            {
              field: '38', // ID of the 'proca_ref_id' custom field
              value: contactRef
            }
          ]
        }
    };

    if (email) {
      body.contact.email = email;
    }

    if (lastName) {
      body.contact.lastName = lastName;
    }
    return JSON.stringify(body);
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


  fetchContact = async (email: string): Promise<string | null> => {
    console.log("Fetching contact:", email);
    try {
      const res = await fetch(`${url}/api/3/contacts?email=${encodeURIComponent(email)}`, {
        method: "GET",
        headers: this.headers,
      });

      if (!res.ok) return null;

      const data = await res.json();
      return data.contacts?.[0]?.id || null;


    } catch (err) {
      console.error("Error fetching contact:", err);
      throw err;
    }
  };

  createContact = async (contactPayload: ContactPayload): Promise<string> => {
    const b = this.body(contactPayload);
    const res = await fetch(`${url}/api/3/contacts`, {
      method: "POST",
      headers: this.headers,
      body: b,
    });
    if (!res.ok) throw new Error(`Failed to create contact: ${res.statusText}`);
    const data = await res.json();
    return data.contact.id;
  };

  updateContact = async (contactid: string, contactPayload:ContactPayload ): Promise<string> => {
    const b = this.body(contactPayload);
    const res = await fetch(`${url}/api/3/contacts/${contactid}`, {
      method: "PUT",
      headers: this.headers,
      body: b,
    });

    if (!res.ok) throw new Error(`Failed to update contact: ${res.statusText}`);
   const data = await res.json();
    return data.contact.id;

  };
// listid = "10" proca-test list
  subscribeToList = async (contactid: string, listid: string): Promise<void> => {
    const res = await fetch(`${url}/api/3/contactLists`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({
        contactList: {
          list: listid || 1, // default value??
          contact: contactid,
          status: 1
        },
      }),
    });

    if (!res.ok) throw new Error(`Failed to subscribe to list: ${res.statusText}`);
    console.log(`Subscribed contact ${contactid} to list ${listid}`);
  };

  //The tag must already exist, default?
  addTagToContact = async (contactid: string, tagid): Promise<void> => {
    const res = await fetch(`${url}/api/3/contactTags`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({
        "contactTag": {
          "contact": contactid,
          "tag": tagid || 175 // default value??
        }
      }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(`Failed to add tag: ${JSON.stringify(errorData)}`);
    }

    console.log(`Tag ${tagid} added to contact ${contactid}`);
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
      let contactid = await this.fetchContact(email);

      const contactPayload: ContactPayload = {
        ...(contactid
          ? pick(message.contact, ['firstName', 'lastName', 'contactRef'])
          : pick(message.contact, ['email', 'firstName', 'lastName', 'contactRef'])),
        id: message.action.id,
      };

      if (contactid) {
        console.log("Contact already exists, update:", contactid);
        contactid = await this.updateContact(contactid, contactPayload);
      } else {
        console.log("Creating new contact:", email);
        contactid = await this.createContact(contactPayload);
      }

      if (!contactid) {
        console.error("Failed to create or update contact");
        return false;
      }
      let camp = await this.fetchCampaign(message.campaign.id);
      const { listid, tagid } = camp.config?.component?.sync || {};

      // Subscribe to list
      await this.subscribeToList(contactid, listid);

      // Add petition-specific tag
      await this.addTagToContact(contactid, tagid);

      console.log("Action contact processed successfully", message.action.id);
      return true;
    } catch (err) {
      console.error("Error handling contact action:", err);
      return false;
    }
  };
}

export default ActiveCampaign;
