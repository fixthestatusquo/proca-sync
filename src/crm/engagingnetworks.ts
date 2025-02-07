import {
  CRM,
  CRMType,
  ActionMessage,
  EventMessage,
  handleResult
} from "../crm";
import dotenv from 'dotenv';

dotenv.config();

const apiUrl = process.env.CRM_URL;
const apiToken = process.env.CRM_API_TOKEN;


if (!apiUrl || !apiToken) {
  console.error("No ccccredentials");
  process.exit(1);
}

const authHeaders = {
  'Accept': 'application/json',
  'Content-Type': 'application/json'
};

export const getToken = async () => {
  try {
      const response = await fetch(apiUrl+'authenticate', {
          method: 'POST',
        headers: authHeaders,
          body: apiToken
        })

      if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(`Error fetching token: ${response.statusText} - ${errorBody}`);
      }

    const data = await response.json();
    return data['ens-auth-token'];
  } catch (error) {
      console.error('Error:', error.message);
  }
}

export const upsertSupporter = async (data, token: string) => {
  try {
    const response = await fetch(apiUrl + 'supporter', {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "ens-auth-token": token,
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const result = await response.json();
    return response.status
  } catch (error) {
    console.error("Error:", error);
  }
}

class CleverreachCRM extends CRM {
  private _token: string | null = null;

  constructor(opt: {}) {
    super(opt);
    this.crmType = CRMType.OptIn;
  }

  // Getter for token that initializes it if needed
  private async getToken(): Promise<string> {
    if (!this._token) {
      this._token = await getToken();
    }
    return this._token as string;
  }

  handleContact = async (
    message: ActionMessage
  ): Promise<handleResult | boolean> => {
    console.log("Action taken from the queue", message.action.id);

    if (this.verbose) {
      console.log(message);
    }

    const token = await this.getToken();

    if (!token) {
      throw new Error("Auth token is missing");
    }

    const data = {
      'Email Address': message.contact.email,
      'First Name': message.contact.firstName,
      'Last Name': message.contact.lastName || "",
      'Address 1': message.contact.street || "",
      Postcode: message.contact?.postcode || "",
      Phone:  message.contact?.phone || "",
      "questions": {
       "Accepts Email": "Y"
       }
    };

    console.log(data)

    const status = await upsertSupporter(data, token);
    return status === 200;
  };
}

export default CleverreachCRM;
