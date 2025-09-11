import { CRM, CRMType, ActionMessage, handleResult } from "../crm";
import dotenv from "dotenv";

dotenv.config();

const apiUrl = process.env.CRM_URL;
const apiToken = process.env.CRM_API_TOKEN;

if (!apiUrl || !apiToken) {
  console.error("No ccccredentials");
  process.exit(1);
}

const authHeaders = {
  Accept: "application/json",
  "Content-Type": "application/json",
};

export const getToken = async () => {
  try {
    const response = await fetch(apiUrl + "authenticate", {
      method: "POST",
      headers: authHeaders,
      body: apiToken,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `Error fetching token: ${response.statusText} - ${errorBody}`,
      );
    }

    const data = await response.json();
    return {
      token: data["ens-auth-token"],
      expires_in: data["expires_in"] || 3600, // Default to 1 hour if not provided
    };
  } catch (error) {
    console.error("Error:", error.message);
  }
};

export const upsertSupporter = async (data, token: string) => {
  try {
    const response = await fetch(apiUrl + "supporter", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "ens-auth-token": token,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      let errorMessage = `HTTP error! Status: ${response.status}`;
      let errorBody;

      try {
        errorBody = await response.json();
        errorMessage += `, Message: ${JSON.stringify(errorBody)}`;
      } catch {
        errorMessage += ", No additional error details in response body.";
      }

      // We have some invalid emails saved, and there is 'can receive' check on EN side
      // Check if error message contains that error phrase and do not crash to prevent requing those messages
      if (
        errorBody?.message?.includes("Email address not found or is not valid")
      ) {
        // overwrite the status to 200 in status, it will still be 400 in the error message
        return { status: 200, warning: errorMessage };
      }

      throw new Error(errorMessage);
    }

    return { status: response.status };
  } catch (error) {
    console.error("Error:", error);
    throw error; // Re-throw other errors
  }
};

export const getSupporter = async (email, token: string) => {
  try {
    const response = await fetch(
      apiUrl + "supporter?" + "email=" + "brucewayne@example.com",
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          "ens-auth-token": token,
        },
      },
    );

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
};

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
    message: ActionMessage,
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
      Phone,
    } = await getSupporter(message.contact.email, token);

    const data = {
      "Email Address": message.contact.email,
      "First Name": message.contact.firstName,
      "Last Name": message.contact?.lastName || lastName || "",
      City: message.action.customFields?.locality || City || "",
      Postcode: message.contact?.postcode || Postcode || "",
      Phone: message.contact?.phone || Phone || "",
      questions: {
        "Accepts Email": "Y",
      },
    };

    if (message.campaign.name === "naturevoter") {
      data["questions"]["NatureVoter"] = "Y";
    }

    if (message.actionPage.locale.toLowerCase().startsWith("fr")) {
      data["questions"]["French"] = "Y";
    }

    const response = await upsertSupporter(data, token);

    if (response.status === 200) {
      response.warning
        ? console.log(
            `Message ${message.actionId} removed from the queue: ${response.warning}`,
          )
        : console.log(`Message ${message.actionId} sent`);
    } else {
      console.log(`Message ${message.actionId} failed: ${response.status}`);
    }

    return response.status === 200;
  };
}

export default CleverreachCRM;
