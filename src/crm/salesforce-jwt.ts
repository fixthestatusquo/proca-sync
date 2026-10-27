import { createSign } from "node:crypto";
import { readFileSync } from "node:fs";
import { Connection, type Record as SFRecord } from "jsforce";
import { type ActionMessage, CRM, CRMType, type handleResult } from "../crm";
import { string2map } from "../utils";

type CrmConfigType = {
  loginUrl: string;
  consumerKey: string;
  username: string;
  privateKey: string;
  object: string;
  fields: Record<string, string>;
};

// Salesforce expects the generic login host in `aud`, not the My Domain token URL
const audience = (loginUrl: string) => {
  if (
    loginUrl.includes("test.salesforce.com") ||
    loginUrl.includes(".sandbox.")
  ) {
    return "https://test.salesforce.com";
  }
  if (loginUrl.includes(".my.salesforce.com")) {
    return "https://login.salesforce.com";
  }
  return loginUrl;
};

// Salesforce OAuth 2.0 JWT bearer flow, signed with the connected app certificate key
export const jwtAssertion = (c: CrmConfigType) => {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "RS256" })).toString(
    "base64url",
  );
  const claims = Buffer.from(
    JSON.stringify({
      iss: c.consumerKey,
      sub: c.username,
      aud: audience(c.loginUrl),
      exp: now + 300,
    }),
  ).toString("base64url");
  const input = `${header}.${claims}`;
  const signature = createSign("RSA-SHA256").update(input).sign(c.privateKey);
  return `${input}.${signature.toString("base64url")}`;
};

const requestToken = async (c: CrmConfigType) => {
  const oauth = new Connection({ loginUrl: c.loginUrl });
  try {
    return await oauth.oauth2.requestToken({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwtAssertion(c),
    });
  } catch (er) {
    const code = er instanceof Error ? er.name : "unknown";
    const message = er instanceof Error ? er.message : String(er);
    const hints: Record<string, string> = {
      invalid_app_access:
        "the integration user is not pre-authorized for the connected app: in Setup > Connected Apps > Manage, allow the app for the integration user's profile or a permission set, or log in as that user once and approve it",
      invalid_grant:
        "check SALESFORCE_USERNAME matches the pre-authorized integration user, that the connected app uses this certificate, and that the server clock is correct",
      invalid_client_id:
        "check SALESFORCE_CONSUMER_KEY against the connected app's Consumer Key",
    };
    const hint = hints[code] ? ` — ${hints[code]}` : "";
    throw new Error(
      `Salesforce JWT authentication failed (${code}): ${message}${hint}`,
    );
  }
};

const makeClient = async (
  c: CrmConfigType,
  log: (text: string) => void = () => {},
) => {
  const token = await requestToken(c);
  return new Connection({
    instanceUrl: token.instance_url,
    accessToken: token.access_token,
    // JWT bearer flow issues no refresh token: a fresh assertion *is* the refresh.
    // jsforce calls this on a 401 and retries the request, one login for all callers.
    refreshFn: (conn, cb) => {
      log(
        "salesforce session expired, logging in again with a new JWT assertion",
      );
      requestToken(c).then(
        (t) => {
          conn.instanceUrl = t.instance_url;
          cb(null, t.access_token, t);
        },
        (er) => {
          const err = er instanceof Error ? er : new Error(String(er));
          log(`salesforce re-login failed: ${err.message}`);
          cb(err);
        },
      );
    },
  });
};

// Dot path in the Proca message = Salesforce field. Override with SALESFORCE_FIELDS.
// Defaults are standard Contact fields; no standard equivalent for action.createdAt
// (CreatedDate is read-only) or campaign.id (that lives on CampaignMember).
export const DEFAULT_FIELDS =
  "contact.firstName=FirstName" +
  "&contact.lastName=LastName" +
  "&contact.email=Email" +
  "&contact.phone=Phone" +
  "&contact.street=MailingStreet" +
  "&contact.locality=MailingCity" +
  "&contact.postcode=MailingPostalCode" +
  "&contact.country=MailingCountry" +
  "&action.customFields.comment=Description";

type ProcaValue = string | number | boolean | string[] | number[] | undefined;

const readPath = (obj: unknown, path: string): ProcaValue => {
  let value: unknown = obj;
  for (const key of path.split(".")) {
    if (typeof value !== "object" || value === null) return undefined;
    value = (value as Record<string, unknown>)[key];
  }
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    (Array.isArray(value) && value.every((v) => typeof v !== "object"))
  ) {
    return value as ProcaValue;
  }
  return undefined;
};

export const actionToRecord = (
  message: ActionMessage,
  fields: Record<string, string>,
): SFRecord => {
  const record: SFRecord = {};
  for (const [path, target] of Object.entries(fields)) {
    let value = readPath(message, path);
    if (value === undefined || value === null || value === "") continue;
    // keep booleans (checkbox false), stringify numbers (eg campaign id)
    if (typeof value !== "string" && typeof value !== "boolean") {
      value = String(value);
    }
    record[target] = value;
  }
  console.log(record);
  return record;
};

class SalesforceJWTCRM extends CRM {
  conn?: Connection;
  config: CrmConfigType;

  constructor(opt: {}) {
    super(opt);
    this.crmType = CRMType.OptIn;

    const keyPath = process.env.SALESFORCE_PRIVATE_KEY_PATH;
    if (!process.env.SALESFORCE_URL || !process.env.SALESFORCE_CONSUMER_KEY) {
      throw new Error(
        "set SALESFORCE_URL, SALESFORCE_CONSUMER_KEY, SALESFORCE_USERNAME and SALESFORCE_PRIVATE_KEY_PATH in the .env",
      );
    }
    if (!keyPath) throw new Error("missing SALESFORCE_PRIVATE_KEY_PATH");

    this.config = {
      loginUrl: process.env.SALESFORCE_URL.replace(/\/$/, ""),
      consumerKey: process.env.SALESFORCE_CONSUMER_KEY,
      username:
        process.env.SALESFORCE_USERNAME || "missing SALESFORCE_USERNAME",
      privateKey: readFileSync(keyPath, "utf8"),
      object: process.env.SALESFORCE_OBJECT || "Contact",
      fields: string2map(process.env.SALESFORCE_FIELDS || DEFAULT_FIELDS),
    };
  }

  init = async (): Promise<boolean> => {
    const conn = await makeClient(this.config, (text) => this.log(text));
    const { sobjects } = await conn.describeGlobal();
    const names = sobjects.map((s) => s.name);
    const known = names.find(
      (name) => name.toLowerCase() === this.config.object.toLowerCase(),
    );
    if (!known) {
      console.error(names.sort((a, b) => a.localeCompare(b)).join("\n"));
      throw new Error(
        `${this.config.object} is not available to ${this.config.username}: it is not created in this org or the integration user has no access. Custom object API names end in __c. The ${names.length} available objects are listed above.`,
      );
    }
    this.config.object = known;
    const { fields } = await conn.sobject(known).describe();
    const available = fields
      .map((f) => f.name)
      .sort((a, b) => a.localeCompare(b));
    this.log(`${known} fields: ${available.join(", ")}`);
    const missing = [...new Set(Object.values(this.config.fields))].filter(
      (f) => !available.includes(f),
    );
    if (missing.length) {
      this.error(
        `configured fields not on ${known} (INVALID_FIELD if written): ${missing.join(", ")}`,
      );
    }
    this.conn = conn;
    return true;
  };

  handleContact = async (
    message: ActionMessage,
  ): Promise<handleResult | boolean> => {
    try {
      if (!this.conn) throw new Error("CRM not initialised");
      const r = await this.conn
        .sobject(this.config.object)
        .create(actionToRecord(message, this.config.fields));
      if (!r.success) throw new Error(JSON.stringify(r.errors));
      return true;
    } catch (er) {
      this.error(
        `could not add ${message.contact.email} to ${this.config.object}: ${er}`,
      );
      return false;
    }
  };
}

export default SalesforceJWTCRM;
