
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
const civicrm = require("civicrm");
class CiviCRM extends crm_1.CRM {
    constructor(opt) {
        super(opt);
        this.init = () => __awaiter(this, void 0, void 0, function* () {
            if (!this.group) {
                // it will not work without a group, suggesting some
                const r = yield this.crmAPI.get("Group", { limit: 200 });
                if (r.count === 0) {
                    console.error("can't access groups, possible missing permission");
                }
                else {
                    console.warn("missing group id, some options:");
                }
                r.values.forEach((g) => {
                    console.log(g.id, g.name, g.description);
                });
                process.exit(1); // should we create the contacts without putting them in a group?
            }
            else {
                const r = yield this.crmAPI.get("Group", {
                    limit: 1,
                    where: [["id", "=", this.group]],
                });
                if (r.count === 0) {
                    console.error("can't access the group, possible missing permission", this.group);
                    process.exit(1); // should we create the contacts without putting them in a group?
                }
            }
            let countries ;
            try {
                countries = yield this.crmAPI.get("Country", {
                    select: ["id", "iso_code", "row_count"],
                    limit: 9999,
                }, { iso_code: "id" });
                if (countries.error_code) {
                    console.error(countries, "problem accessing civicrm REST API");
                    process.exit(1);
                }
            }
            catch (e) {
                console.error(e, "problem accessing civicrm REST API");
                process.exit(1);
            }
            this.countries = countries.values;
            return true;
        });
        this.handleContact = (message) => __awaiter(this, void 0, void 0, function* () {
            const camp = yield this.campaign(message.campaign);
            if (this.verbose) {
                console.log("processing...", message);
            }
            let source = "proca " + message.action.actionType + " @" + message.actionPage.name;
            if (message.action.testing)
                source = "testing " + source;
            //    customFields: { comment: 'This is a comment', emailProvider: 'gmail.com' },
            const action = message.action;
            action.id = message.actionId;
            const existing = yield this.fetchContact(message.contact.email, {
                action: action,
                campaign_id: camp.id,
            });
            if (existing === false) {
                return this.createContact(message.contact, action, camp.id, source);
            }
            else {
                return this.updateContact(existing, message.contact, action, camp.id, source);
            }
            return false;
        });
        this.getParams = (contact, action, campaign_id, source) => {
            var _a, _b, _c;
            const params = {
                values: {
                    first_name: contact.firstName,
                    last_name: contact.lastName || null,
                    //        external_identifier: "proca_" + contact.contactRef, // creates problems if the contact exists in trash
                    source: source,
                },
                chain: {
                    email: [
                        "Email",
                        "create",
                        {
                            values: {
                                contact_id: "$id",
                                email: contact.email,
                                is_primary: true,
                            },
                        },
                    ],
                    address: [
                        "Address",
                        "create",
                        {
                            values: {
                                contact_id: "$id",
                                street_address: contact.street || null,
                                city: contact.locality || null,
                                postal_code: contact.postcode || null,
                                country_id: this.countries[contact.area], // test if country? option?
                                is_primary: true,
                            },
                        },
                    ],
                    activity: [
                        "Activity",
                        "create",
                        {
                            values: {
                                activity_type_id: 32,
                                source_contact_id: "$id",
                                subject: ((_a = action.customFields) === null || _a === void 0 ? void 0 : _a.subject)
                                    ? action.customFields.subject
                                    : contact.dupeRank === 0
                                        ? source
                                        : source + " #" + contact.dupeRank,
                                location: "action_" + action.id,
                                activity_date_time: action.createdAt,
                                //              location: action.,
                                campaign_id: campaign_id,
                                details: ((_b = action === null || action === void 0 ? void 0 : action.customFields) === null || _b === void 0 ? void 0 : _b.message) || ((_c = action === null || action === void 0 ? void 0 : action.customFields) === null || _c === void 0 ? void 0 : _c.comment),
                            },
                        },
                    ],
                },
            };
            if (contact.phone) {
                params.chain.phone = [
                    "Phone",
                    "create",
                    {
                        values: {
                            contact_id: "$id",
                            is_primary: true,
                            phone: contact.phone,
                        },
                    },
                ];
            }
            if (this.group) {
                params.chain.group = [
                    "GroupContact",
                    "create",
                    {
                        values: {
                            contact_id: "$id",
                            group_id: this.group,
                        },
                    },
                ];
            }
            return params;
        };
        this.updateContact = (crmContact, contact, action, campaign_id, source) => __awaiter(this, void 0, void 0, function* () {
            if (campaign_id === null) {
                throw new Error("missing campaign id");
            }
            const params = this.getParams(contact, action, campaign_id, source);
            params.where = [["id", "=", crmContact.id]];
            // we do not overwrite existing contact data, we do not set the source
            delete params.values.source;
            delete params.chain.email;
            params.values["is_opt_out"] = false;
            ["first_name", "last_name"].forEach((d) => {
                if (crmContact[d]) {
                    delete params.values[d];
                }
            });
            if (crmContact["address.id"]) {
                ["street_address", "country_id", "city", "postal_code"].forEach((d) => {
                    if (crmContact["address." + d])
                        delete params.chain.address[2].values[d];
                });
                params.chain.address[1] = "update";
                params.chain.address[2].where = [["id", "=", crmContact["address.id"]]];
            }
            if (crmContact["phone.id"])
                delete params.chain.phone;
            if (crmContact["activity.id"])
                delete params.chain.activity;
            if (crmContact["group.id"]) {
                params.chain.group[1] = "update";
                params.chain.group[2].where = [
                    ["group_id", "=", this.group],
                    ["contact_id", "=", crmContact["id"]],
                ];
                params.chain.group[2].values = { status: "Added" };
            }
            const r = yield this.crmAPI.update("Contact", params);
            //    console.dir(r, { depth: null });
            if (!r.error_message)
                return true;
            console.error("updateContact", r.error_message, params);
            return false;
        });
        this.createContact = (contact, action, campaign_id, source) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            if (campaign_id === null) {
                throw new Error("missing campaign id");
            }
            const params = this.getParams(contact, action, campaign_id, source);
            try {
                const r = yield this.crmAPI.create("Contact", params);
                console.log("created", r);
                if (!r.error_message)
                    return true;
                console.error("createContact", r.error_message, params, r);
                if (r.status === 403) {
                    console.info("probably a missing permission, it needs to access civi, create activity, group, contact");
                }
            }
            catch (e) {
                console.log("aaaa", e);
                if (((_a = e.cause) === null || _a === void 0 ? void 0 : _a.status) === 403) {
                    console.info("probably a missing permission, it needs to access civi, create activity, group, contact");
                }
            }
            console.log("aaaa");
            return false;
        });
        this.fetchContact = (email, context) => __awaiter(this, void 0, void 0, function* () {
            const results = yield this.crmAPI.get("Contact", {
                select: [
                    "first_name",
                    "last_name",
                    "email.email",
                    "email.on_hold",
                    "email.is_primary",
                    "phone.id",
                    "phone.phone",
                    "address.id",
                    "address.street_address",
                    "address.postal_code",
                    "address.city",
                    "address.country_id",
                    "source",
                    "group.id",
                    "group.status",
                    "activity.id",
                ],
                join: [
                    ["Email AS email", "INNER"],
                    ["Phone AS phone", "LEFT", ["phone.is_primary", "=", true]],
                    ["Address AS address", "LEFT", ["address.is_primary", "=", true]],
                    [
                        "Group AS group",
                        "LEFT",
                        "GroupContact",
                        ["group.id", "=", this.group],
                    ],
                    [
                        "Activity AS activity",
                        "LEFT",
                        "ActivityContact",
                        ["activity.campaign_id", "=", context.campaign_id],
                        [
                            "activity.activity_date_time",
                            "=",
                            '"' + context.action.createdAt + '"',
                        ],
                        ["activity.location", "=", '"action_' + context.action.id + '"'],
                    ],
                ],
                where: [["email.email", "=", email]],
                limit: 2,
            });
            if (results.count === 0)
                return false;
            if (this.verbose) {
                console.log(results.values);
            }
            return results.values[0];
            //    return findMember(this.client, email);
        });
        this.fetchCampaign = (campaign) => __awaiter(this, void 0, void 0, function* () {
            let r = yield this.crmAPI.get("Campaign", {
                select: ["id", "name", "title"],
                limit: 1,
                where: [["name", "=", campaign.name]],
            }, 0);
            if (r.error_code) {
                throw new Error("can't read campaign " +
                    campaign.name +
                    ":" +
                    r.error_message +
                    ". CHeck your permission on civicampaign");
            }
            if (r.count === 1) {
                console.log("campaign", r.values[0]);
                return r.values[0];
            }
            console.log("let's create the campaign", campaign.name);
            const now = new Date();
            r = yield this.crmAPI.create("Campaign", {
                values: {
                    name: campaign.name,
                    title: campaign.title,
                    description: "campaign on proca",
                    start_date: now.toISOString(),
                },
            }, 0);
            console.log(r);
            if (!r.values.id) {
                throw new Error("can't get or create campaign " + campaign.name);
            }
            return r.values;
        });
        this.countries = {};
        this.crmType = crm_1.CRMType.OptIn;
        if (!process.env.CIVICRM_API_KEY) {
            console.error("you need to set the CIVICRM_API_KEY from CiviCRM in the .env.xx");
            process.exit(1);
        }
        if (!process.env.CIVICRM_URL) {
            console.error("you need to set the url of your api4 endpoint from CiviCRM in the .env.xx");
            process.exit(1);
        }
        const config = {
            server: process.env.CIVICRM_URL,
            api_key: process.env.CIVICRM_API_KEY,
        };
        if (process.env.CIVICRM_PATH) {
            config.path = process.env.CIVICRM_PATH;
        }
        if (process.env.CIVICRM_KEY) {
            config.key = process.env.CIVICRM_KEY;
        }
        this.crmAPI = civicrm(config);
        if (this.verbose) {
            this.crmAPI.debug(true);
        }
        if (!process.env.GROUP) {
            console.error("you need to set the GROUP (usually your newsletter group) from CiviCRM in the .env.xx");
        }
        this.group = process.env.GROUP || "";
        if (typeof process.env.CUSTOM_FIELDS === "string") {
            // get query format, key = contact field, value = merge field in CiviCRM
            // eg. MERGE_FIELDS="firstName=PRENOM&lastName=NOM&country=PAYS&locality=VILLE&postcode=CP&street=RUE1"
            this.customFields = (0, utils_1.string2map)(process.env.CUSTOM_FIELDS);
            console.log("custom mergeFields", this.customFields);
        }
    }
}
exports.default = CiviCRM;
