import {
  CRM,
  CRMType,
  type ActionMessage,
  type handleResult,
  ProcessStatus,
  type Params,
} from "../crm";
import fs from "fs";
import { stringify } from "csv-stringify/sync";

type CsvCRMOptions = Params & {
  csvPath?: string;
};

class CsvCRM extends CRM {
  private csvPath: string;
  private stream: fs.WriteStream | null = null;

  constructor(options: CsvCRMOptions = {}) {
    super(options);
    this.crmType = CRMType.Contact;
    this.csvPath =
      process.env.CSV_PATH ||
      options.csvPath ||
      "./data/" + process.env.PROCA_QUEUE + ".csv";
    console.log("writing to", this.csvPath);
  }

  public init = async (): Promise<boolean> => {
    if (!fs.existsSync(this.csvPath)) {
      const header = stringify([], {
        header: true,
        columns: Object.keys(
          this.simplify({
            contact: {},
            action: {},
            campaign: {},
            privacy: {},
            org: {},
            actionPage: {},
            tracking: {},
          }),
        ),
      });
      fs.writeFileSync(this.csvPath, header);
    }
    this.stream = fs.createWriteStream(this.csvPath, { flags: "a" });
    return true;
  };

  simplify = (message) => {
    const { contact, action, tracking } = message;
    const getgdpr = (privacy) => {
      if (privacy?.emailStatus === "double_opt_in") return "doi";
      if (privacy.optIn === true) return "optin";
      if (privacy.optIn === false) return "optout";
      return "unknown";
    };

    const record = {
      email: contact.email,
      firstname: contact.firstName,
      lastname: contact.lastName,
      country: contact.country,
      postcode: contact.postcode,
      locality: contact.locality,
      phone: contact.phone,
      id: message.actionId,
      actiontype: action.actionType,
      date: action.createdAt,
      gdpr: getgdpr(message.privacy),
      provider: action.customFields?.emailProvider,
      //      message: action.customFields.comment || action.customFields.message,
      campaign: message.campaign.name,
      widget: message.actionPage.name,
      organisation: message.org.name,
      lang: message.actionPage.locale,
      utm_campaign: tracking.campaign,
      utm_medium: tracking.medium,
      utm_source: tracking.source,
      location: tracking.location,
    };
    return record;
  };

  public handleContact = async (
    message: ActionMessage,
  ): Promise<handleResult> => {
    const record = this.simplify(message);
    const csvString = stringify([record], {
      header: false,
      columns: Object.keys(record),
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
