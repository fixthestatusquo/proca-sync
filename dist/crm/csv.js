
var __awaiter = (this && this.__awaiter) || ((thisArg, _arguments, P, generator) => {
    function adopt(value) { return value instanceof P ? value : new P((resolve) => { resolve(value); }); }
    return new (P || (P = Promise))((resolve, reject) => {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
});
var __importDefault = (this && this.__importDefault) || ((mod) => (mod && mod.__esModule) ? mod : { "default": mod });
Object.defineProperty(exports, "__esModule", { value: true });
const crm_1 = require("../crm");
const fs_1 = __importDefault(require("fs"));
const sync_1 = require("csv-stringify/sync");
class CsvCRM extends crm_1.CRM {
    constructor(options = {}) {
        super(options);
        this.stream = null;
        this.init = () => __awaiter(this, void 0, void 0, function* () {
            if (!fs_1.default.existsSync(this.csvPath)) {
                const header = (0, sync_1.stringify)([], {
                    header: true,
                    columns: Object.keys(this.simplify({
                        contact: {},
                        action: {},
                        campaign: {},
                        privacy: {},
                        org: {},
                        actionPage: {},
                        tracking: {},
                    })),
                });
                fs_1.default.writeFileSync(this.csvPath, header);
            }
            this.stream = fs_1.default.createWriteStream(this.csvPath, { flags: "a" });
            return true;
        });
        this.simplify = (message) => {
            var _a;
            const { contact, action, tracking } = message;
            const getgdpr = (privacy) => {
                if ((privacy === null || privacy === void 0 ? void 0 : privacy.emailStatus) === "double_opt_in")
                    return "doi";
                if (privacy.optIn === true)
                    return "optin";
                if (privacy.optIn === false)
                    return "optout";
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
                provider: (_a = action.customFields) === null || _a === void 0 ? void 0 : _a.emailProvider,
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
        this.handleContact = (message) => __awaiter(this, void 0, void 0, function* () {
            const record = this.simplify(message);
            const csvString = (0, sync_1.stringify)([record], {
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
                    }
                    else {
                        //          this.log(`Saved action to ${this.csvPath}`, ProcessStatus.processed);
                        resolve({ processed: true });
                    }
                });
            });
        });
        /**
         * Closes the underlying file stream. It's recommended to call this on graceful shutdown.
         */
        this.close = () => {
            return new Promise((resolve) => {
                if (this.stream) {
                    this.stream.end(() => {
                        resolve(true);
                    });
                }
                else {
                    resolve(false);
                }
            });
        };
        this.crmType = crm_1.CRMType.Contact;
        this.csvPath =
            process.env.CSV_PATH ||
                options.csvPath ||
                "./data/" + process.env.PROCA_QUEUE + ".csv";
        console.log("writing to", this.csvPath);
    }
}
exports.default = CsvCRM;
