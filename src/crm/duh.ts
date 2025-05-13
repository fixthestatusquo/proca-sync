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

class Duh extends CRM {
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

      const data = await res.json(); console.log("Contact data:", res, data.contacts);
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


      return false;
    } catch (err) {
      console.error("Error handling contact action:", err);
      return false;
    }
  };
}

export default Duh;
