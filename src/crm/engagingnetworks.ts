import {
  CRM,
  CRMType,
  ActionMessage,
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
    const response = await fetch(apiUrl + 'authenticate', {
      method: 'POST',
      headers: authHeaders,
      body: apiToken
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Error fetching token: ${response.statusText} - ${errorBody}`);
    }

    const data = await response.json();
    return {
      token: data['ens-auth-token'],
      expires_in: data['expires_in'] || 3600 // Default to 1 hour if not provided
    };
  } catch (error) {
    console.error('Error:', error.message);
  }
};

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
    return response.status;
  } catch (error) {
    console.error("Error:", error);
  }
}
export const getSupporter = async (email, token: string) => {
  try {
    const response = await fetch(apiUrl + 'supporter?' + 'email=' + 'brucewayne@example.com', {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "ens-auth-token": token,
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    if (response.statusText === "No Content") {
      return {};
    }
    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Error:", error);
  }
}

class CleverreachCRM extends CRM {
  private _token: string | null = null;
  private _tokenExpiry: number | null = null;

  constructor(opt: {}) {
    super(opt);
    this.crmType = CRMType.OptIn;
  }
   // Getter for token that initializes it if needed

  private async getToken(): Promise<string> {
    const now = Date.now();

    // Fetch new token if missing or expired
    if (!this._token || (this._tokenExpiry && now >= this._tokenExpiry)) {
      const tokenData = await getToken();
      if (!tokenData) {
        throw new Error("Failed to retrieve token");
      }
      this._token = tokenData.token;
      this._tokenExpiry = now + tokenData.expires_in * 1000; // Convert seconds to milliseconds
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

    const {
      ["Last Name"]: lastName,
      City,
      Postcode,
      Phone
    } = await getSupporter(message.contact.email, token);

    const data = {
      'Email Address': message.contact.email,
      'First Name': message.contact.firstName,
      'Last Name': message.contact?.lastName || lastName || "",
      City: message.action.customFields?.locality || City || "",
      Postcode: message.contact?.postcode || Postcode || "",
      Phone: message.contact?.phone || Phone || "",
      "questions": {
        "Accepts Email": "Y",
        "NatureVoter": "Y"
       }
    };

    if (message.actionPage.locale.toLowerCase().startsWith("fr")) {
      data["questions"]["French"] = "Y";
    }

    const status = await upsertSupporter(data, token);
    status === 200
      ? console.log(`Message ${message.actionId} sent`)
      : console.log(`Message ${message.actionId} failed`);

    return status === 200;
  };
}

export default CleverreachCRM;
