
var __awaiter = (this && this.__awaiter) || ((thisArg, _arguments, P, generator) => {
    function adopt(value) { return value instanceof P ? value : new P((resolve) => { resolve(value); }); }
    return new (P || (P = Promise))((resolve, reject) => {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
});
Object.defineProperty(exports, "__esModule", { value: true });
const crm_1 = require("../crm");
const utils_1 = require("../utils");
class Mailjet extends crm_1.CRM {
    constructor(opt) {
        super(opt);
        this.init = () => __awaiter(this, void 0, void 0, function* () {
            if (!this.list) {
                // it will not work without a group, suggesting some
                console.warn("missing list id, some options:");
                const r = yield this.mailjet
                    .get("contactslist", { version: "v3", limit: 200 })
                    .request();
                r.body.Data.forEach((g) => {
                    console.log(g.ID, g.Name, g.SubscriberCount);
                });
                return false;
            }
            return true;
        });
        this.addContactToList = (email) => __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield this.mailjet
                    .post("listrecipient", { version: "v3" })
                    .request({
                    IsUnsubscribed: "false",
                    ContactAlt: email,
                    ListID: this.list,
                });
                return true;
            }
            catch (error) {
                console.error(`Failed to add contact ${email} to list ${this.list}: ${error.statusCode}`);
                return false;
            }
        });
        this.updateContactProperties = (message) => __awaiter(this, void 0, void 0, function* () {
            const data = Object.entries(this.contactProperties).map(([sourceField, mailjetField]) => ({
                Name: mailjetField,
                Value: message.contact[sourceField] || "",
            }));
            try {
                yield this.mailjet
                    .put("contactdata", { version: "v3" })
                    .id(message.contact.email)
                    .request({
                    Data: data,
                });
                return true;
            }
            catch (e) {
                console.error(`Updating properties for contact ${message.contact.email}, action ${message.actionId} faile with ${e.statusCode}`);
                return false;
            }
        });
        this.handleContact = (message) => __awaiter(this, void 0, void 0, function* () {
            console.log("Action taken from the queue", message.action.id);
            if (this.verbose) {
                console.log(message);
            }
            try {
                // create contact
                const { response: { status }, } = yield this.mailjet.post("contact", { version: "v3" }).request({
                    Name: message.contact.lastName
                        ? message.contact.firstName + " " + message.contact.lastName
                        : message.contact.firstName,
                    Email: message.contact.email,
                });
                // add properties to the contact
                const properties = yield this.updateContactProperties(message);
                // add contact to the list
                const list = yield this.addContactToList(message.contact.email);
                return properties && list;
            }
            catch (e) {
                if (e.response.statusText.includes("already exists")) {
                    // we do not care for errors, because the contact already exists
                    yield this.updateContact(message);
                    yield this.updateContactProperties(message);
                    yield this.addContactToList(message.contact.email);
                    return true;
                }
                return false;
            }
        });
        this.updateContact = (message) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { response: { status }, } = yield this.mailjet
                    .put("contact", { version: "v3" })
                    .id(message.contact.email)
                    .request({
                    Name: message.contact.lastName
                        ? message.contact.firstName + " " + message.contact.lastName
                        : message.contact.firstName,
                });
                return status === 200 ? true : false;
            }
            catch (error) {
                // mailjet returns error 304 when there is nothing to change
                if (error.statusCode === 304) {
                    console.log(`${error.statusText} for ${message.contact.email}, ${message.actionId}`);
                    return true;
                }
                console.error(`Error: ${error.message} for ${message.contact.email}, ${message.actionId}`);
                return false;
            }
        });
        this.crmType = crm_1.CRMType.OptIn;
        if (!process.env.MJ_APIKEY_PUBLIC) {
            console.error("you need to set the MJ_APIKEY_PUBLIC from mailjet in the .env.xx");
            process.exit(1);
        }
        if (!process.env.MJ_APIKEY_PRIVATE) {
            console.error("you need to set the MJ_APIKEY_PRIVATE from mailjet in the .env.xx");
            process.exit(1);
        }
        if (!process.env.LIST) {
            console.error("you need to set the LIST (audience id) from mailjet in the .env.xx");
        }
        else {
            this.list = +process.env.LIST;
        }
        try {
            this.mailjet = require("node-mailjet").apiConnect(process.env.MJ_APIKEY_PUBLIC, process.env.MJ_APIKEY_PRIVATE);
        }
        catch (e) {
            console.log(e.message, "can't connect, check MJ_APIKEY_PUBLIC and PRIVATE?");
            process.exit(1);
        }
        if (typeof process.env.CONTACT_PROPERTIES === "string") {
            // get query format, key = contact field, value = merge field in mailjet
            // eg. CONTACT_PROPERTIES="firstName=PRENOM&lastName=NOM&country=PAYS&locality=VILLE&postcode=CP&street=RUE1"
            this.contactProperties = (0, utils_1.string2map)(process.env.CONTACT_PROPERTIES);
        }
    }
}
exports.default = Mailjet;
