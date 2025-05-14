import { count } from '@proca/queue';
import {
  CRM,
  CRMType,
  ActionMessage,
  handleResult,
  ProcaCampaign,
} from "../crm";
import dotenv from "dotenv";

dotenv.config();

const url = process.env.CRM_URL;
const token = process.env.CRM_API_TOKEN;

if (!url || !token) {
  console.error("Missing CRM credentials.");
  process.exit(1);
}

// type ContactPayload = {
//   email: string;
//   firstName?: string;
//   lastName?: string;
//   petitionId: string;
// };

class ActiveCampaign extends CRM {
  constructor(opt: {}) {
    super(opt);
    this.crmType = CRMType.ActionContact;
  }

  headers: HeadersInit = {
    'Api-Token': token!,
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  };

  body = (email: string, firstName: string, lastName?: string) => {
    const body: any = {
      contact: {
        email: email,
        firstName: firstName,
      },
    };

    if (lastName) {
      body.contact.lastName = lastName;
    }
    return JSON.stringify(body);
  };

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

  createContact = async (email: string, firstName: string, lastName?: string): Promise<string> => {
    const b = this.body(email, firstName, lastName);
    const res = await fetch(`${url}/api/3/contacts`, {
      method: "POST",
      headers: this.headers,
      body: b,
    });
    if (!res.ok) throw new Error(`Failed to create contact: ${res.statusText}`);
    const data = await res.json();
    return data.contact.id;
  };

  updateContact = async (contactId: string, firstName: string, lastName?: string): Promise<string> => {
    const res = await fetch(`${url}/api/3/contacts/${contactId}`, {
      method: "PUT",
      headers: this.headers,
      body: JSON.stringify({
        contact: {
          firstName: firstName,
          lastName: lastName
        }
      }),
    });

    if (!res.ok) throw new Error(`Failed to update contact: ${res.statusText}`);
   const data = await res.json();
    return data.contact.id;

  };
// listId = "10" proca-test list
  subscribeToList = async (contactId: string, listId: string = "10"): Promise<void> => {
    const res = await fetch(`${url}/api/3/contactLists`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({
        contactList: {
          list: listId,
          contact: contactId,
          //status: 1, // 1 = subscribed
        },
      }),
    });

    if (!res.ok) throw new Error(`Failed to subscribe to list: ${res.statusText}`);
    console.log(`Subscribed contact ${contactId} to list ${listId}`);
  };

  //The tag must already exist, default tag // name: p:ftsq-test1
  addTagToContact = async (contactId: string, tagId = 174): Promise<void> => {
    const res = await fetch(`${url}/api/3/contactTags`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({
        "contactTag": {
          "contact": contactId,
          "tag": tagId
        }
      }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(`Failed to add tag: ${JSON.stringify(errorData)}`);
    }

    console.log(`Tag ${tagId} added to contact ${contactId}`);
  };

  handleActionContact = async (
    message: ActionMessage
  ): Promise<handleResult | boolean> => {
    const { email, firstName, lastName } = message.contact;


    console.log("Processing action:", message.action.id, "testing:", message.action.testing);

    if (this.verbose) {
      console.log(JSON.stringify(message, null, 2));
    }

    try {
      let contactId = await this.fetchContact(email);

      console.log("Contact ID:", contactId);
      if (contactId) {
        console.log("Contact already exists, update:", contactId);
       contactId = await this.updateContact(contactId, firstName, lastName);
      } else {
        contactId = await this.createContact(email, firstName, lastName);
      }

      if (!contactId) {
        console.error("Failed to create or update contact");
        return false;
      }

      // Subscribe to list
      await this.subscribeToList(contactId);

      // Add petition-specific tag
      await this.addTagToContact(contactId);

      console.log("Action contact processed successfully", message.action.id);
      return true;
    } catch (err) {
      console.error("Error handling contact action:", err);
      return false;
    }
  };
}

export default ActiveCampaign;
