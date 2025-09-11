import {
  CRM,
  CRMType,
  ActionMessage,
  handleResult,
  ProcessStatus,
  Params,
} from "../crm";
import fs from "fs";
import { stringify } from "csv-stringify/sync";

type CsvCRMOptions = Params & {
  csvPath?: string;
};

class CsvCRM extends CRM {
  private csvPath: string;
  private stream: fs.WriteStream | null = null;
  private columns = [
    { key: "email", header: "email" },
    { key: "firstName", header: "firstname" },
    { key: "lastName", header: "lastname" },
    { key: "country", header: "country" },
    { key: "postcode", header: "postcode" },
    { key: "actionType", header: "action" },
    { key: "createdAt", header: "date" },
    { key: "campaign", header: "campaign" },
    { key: "organisation", header: "org" },
    { key: "lang", header: "lang" },
    { key: "gdpr", header: "gdpr" },
    { key: "message", header: "comment" },
    { key: "provider", header: "provider" },
  ];

  constructor(options: CsvCRMOptions = {}) {
    super(options);
    this.crmType = CRMType.Contact;
    this.csvPath =
      process.env.CSV_PATH ||
      options.csvPath ||
      "./data/" + process.env.PROCA_QUEUE + ".csv";
  }

  public init = async (): Promise<boolean> => {
    if (!fs.existsSync(this.csvPath)) {
      const header = stringify([], {
        header: true,
        columns: this.columns,
      });
      fs.writeFileSync(this.csvPath, header);
    }
    this.stream = fs.createWriteStream(this.csvPath, { flags: "a" });
    return true;
  };

  public handleContact = async (
    message: ActionMessage,
  ): Promise<handleResult> => {
    const { contact, action } = message;

    const getgdpr = (privacy) => {
      if (privacy?.emailStatus === "double_opt_in") return "doi";
      if (privacy.optIn === true) return "optin";
      if (privacy.optIn === false) return "optout";
      return "unknown";
    };
    const filter = (obj, ...propsToExclude) => {
      const result = { ...obj };
      propsToExclude.forEach((prop) => delete result[prop]);
      return result;
    };

    const filteredCustomFields = filter(
      action.customFields,
      "comment",
      "message",
      "emailProvider",
    );

    const record = {
      email: contact.email,
      firstName: contact.firstName,
      lastName: contact.lastName,
      country: contact.country,
      postcode: contact.postcode,
      actionType: action.actionType,
      createdAt: action.createdAt,
      gdpr: getgdpr(message.privacy),
      provider: action.customFields.emailProvider,
      message: action.customFields.comment || action.customFields.message,
      campaign: message.campaign.name,
      organisation: message.org.name,
      lang: message.actionPage.locale,
      ...filteredCustomFields,
    };

    // Discover new custom fields and add them to the columns
    const customFieldKeys = Object.keys(action.customFields);
    const newColumns = customFieldKeys.filter(
      (key) => !this.columns.find((c) => c.key === key),
    );
    if (newColumns.length > 0) {
      newColumns.forEach((key) => {
        this.columns.push({ key, header: key });
      });
      // We would need to rewrite the file to add new columns to the header.
      // For simplicity, we will not do that. New fields will be added at the end
      // without a header. A better implementation would handle this more gracefully.
    }

    const csvString = stringify([record], {
      header: false,
      columns: this.columns,
    });

    return new Promise((resolve, reject) => {
      if (!this.stream) {
        this.error(`Stream not initialized for ${this.csvPath}`);
        return resolve({ processed: false });
      }
      this.stream.write(csvString, (err) => {
        if (err) {
          this.error(`Failed to write to ${this.csvPath}: ${err.message}`);
          resolve({ processed: false });
        } else {
          //          this.log(`Saved action to ${this.csvPath}`, ProcessStatus.processed);
          resolve({ processed: true });
        }
      });
    });
  };

  /**
   * Closes the underlying file stream. It's recommended to call this on graceful shutdown.
   */
  public close = (): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      if (this.stream) {
        this.stream.end(() => {
          resolve(true);
        });
      } else {
        resolve(false);
      }
    });
  };
}

export default CsvCRM;
