
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
const dotenv_1 = __importDefault(require("dotenv"));
const proca_1 = require("../proca");
dotenv_1.default.config();
const url = process.env.CRM_URL;
const token = process.env.CRM_API_TOKEN; // change!!
const formID = process.env.CRM_FORM;
const testToken = process.env.CRM_TEST_API_TOKEN;
const testFormID = process.env.CRM_TEST_FORM;
if (!url || !token) {
    console.error("Missing CRM credentials.");
    process.exit(1);
}
;
if (!testToken) {
    console.error("Missing test credentials, defaulting to prod");
}
;
const customizePersonAttrs = (message, attrs) => {
    switch (process.env.PROCA_USERNAME) {
        case "greens": {
            const lang = message.actionPage.locale.split("_")[0].toLowerCase(); // en_GB → en
            attrs.custom_fields || (attrs.custom_fields = {});
            attrs.custom_fields[`speaks_${lang}`] = "1";
            break;
        }
    }
};
const actionToPerson = (message, tags, status) => {
    const { contactRef, email, firstName, lastName, phone, postcode, country, area } = message.contact;
    const lang = (message.actionPage.locale.split("_")[0] || "en").toLowerCase();
    const person = Object.assign(Object.assign({ identifiers: [`proca:${contactRef}`], given_name: firstName, family_name: lastName, email_addresses: [{ address: email, status }], languages_spoken: [lang] }, (phone && { phone_numbers: [{ number: phone, status }] })), (postcode || country || area ? {
        postal_addresses: [
            ...(postcode ? [{ postal_code: postcode }] : []),
            ...(country || area ? [{ country: country || area }] : []),
        ]
    } : {}));
    customizePersonAttrs(message, person);
    return { person, add_tags: tags };
};
const adjustStatus = (personPayload, exists, contact) => {
    var _a, _b;
    const existingEmail = (_a = exists === null || exists === void 0 ? void 0 : exists.email_addresses) === null || _a === void 0 ? void 0 : _a.find(e => e.address.toLowerCase() === contact.email);
    if (existingEmail && existingEmail.status === "subscribed") {
        personPayload.person.email_addresses[0].status = "subscribed";
    }
    if ((contact === null || contact === void 0 ? void 0 : contact.phone) && ((_b = exists === null || exists === void 0 ? void 0 : exists.phone_numbers) === null || _b === void 0 ? void 0 : _b.length)) {
        const existingPhone = exists.phone_numbers.find(p => p.number.replace(/\D/g, "") === contact.phone.replace(/\D/g, ""));
        if (existingPhone && existingPhone.status === "subscribed" && personPayload.person.phone_numbers) {
            personPayload.person.phone_numbers[0].status = "subscribed";
        }
    }
    return personPayload;
};
const getHeaders = (test) => ({
    "Content-Type": "application/json",
    "OSDI-API-Token": test && testToken ? testToken : token,
});
class ActionNetwork extends crm_1.CRM {
    constructor(opt) {
        super(opt);
        this.fetchCampaign = (campaign) => __awaiter(this, void 0, void 0, function* () {
            const r = yield (0, proca_1.fetchCampaign)(campaign.id);
            return r;
        });
        // submit an action (form submission) for a given person
        this.submitAction = (form_1, personUri_1, action_1, test_1, ...args_1) => __awaiter(this, [form_1, personUri_1, action_1, test_1, ...args_1], void 0, function* (form, personUri, action, test, autoresponse = true) {
            var _a, _b, _c;
            const submissionUrl = (_b = (_a = form._links) === null || _a === void 0 ? void 0 : _a["osdi:submissions"]) === null || _b === void 0 ? void 0 : _b.href;
            if (!submissionUrl)
                throw new Error("Form has no submissions link");
            const data = {
                _links: {
                    "osdi:person": { href: personUri },
                },
                triggers: { autoresponse: { enabled: autoresponse } },
            };
            if ((_c = action.tracking) === null || _c === void 0 ? void 0 : _c.source) {
                const rd = {
                    source: action.tracking.source === "a/n" ? "unknown" : action.tracking.source,
                };
                if (action.tracking.source === "referrer") {
                    rd.website = action.tracking.campaign;
                }
                data["action_network:referrer_data"] = rd;
            }
            const res = yield fetch(submissionUrl, {
                method: "POST",
                headers: getHeaders(test),
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const errText = yield res.text();
                throw new Error(`Error submitting action: ${res.status} ${res.statusText} - ${errText}`);
            }
            return yield res.json();
        });
        this.fetchContact = (email, test) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const res = yield fetch(`${url}/people?filter=email_address eq '${encodeURIComponent(email)}'`, {
                    headers: getHeaders(test),
                });
                if (!res.ok) {
                    throw new Error(`ActionNetwork API error: ${res.status} ${res.statusText}`);
                }
                const data = yield res.json();
                // People are in _embedded["osdi:people"]
                const people = (_a = data === null || data === void 0 ? void 0 : data._embedded) === null || _a === void 0 ? void 0 : _a["osdi:people"];
                if (people && people.length > 0) {
                    return people[0]; // return the first match
                }
                return null;
            }
            catch (err) {
                console.error(`Error fetching contact from ActionNetwork: ${err.message}`);
                return null;
            }
        });
        this.upsertContact = (person, test) => __awaiter(this, void 0, void 0, function* () {
            try {
                const res = yield fetch(`${url}/people`, {
                    method: "POST",
                    headers: getHeaders(test),
                    body: JSON.stringify(person),
                });
                if (!res.ok) {
                    throw new Error(`ActionNetwork API error: ${res.status} ${res.statusText}`);
                }
                return yield res.json();
            }
            catch (err) {
                console.error(`Error upserting contact in ActionNetwork: ${err.message}`);
                return null;
            }
        });
        this.setTags = (tagNames, test) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            for (const tagName of tagNames) {
                try {
                    if (this.tagCache.has(tagName))
                        continue;
                    // Try fetching the tag
                    const res = yield fetch(`${url}/tags?filter=name eq '${encodeURIComponent(tagName)}'`, {
                        headers: getHeaders(test),
                    });
                    if (!res.ok)
                        throw new Error(`Failed to fetch tag "${tagName}": ${res.status}`);
                    const data = yield res.json();
                    let tag = ((_b = (_a = data === null || data === void 0 ? void 0 : data._embedded) === null || _a === void 0 ? void 0 : _a["osdi:tags"]) === null || _b === void 0 ? void 0 : _b.find((t) => t.name === tagName)) || null;
                    // If no tag, create it
                    if (!tag) {
                        const createRes = yield fetch(`${url}/tags`, {
                            method: "POST",
                            headers: getHeaders(test),
                            body: JSON.stringify({ name: tagName, origin_system: "Proca" }),
                        });
                        if (!createRes.ok)
                            throw new Error(`Failed to create tag "${tagName}": ${createRes.status} ${createRes.statusText}`);
                        tag = yield createRes.json();
                    }
                    // Cache the tag
                    this.tagCache.set(tagName, tag);
                }
                catch (err) {
                    throw new Error(`Error ensuring tag "${tagName}": ${err.message}`);
                }
            }
        });
        this.handleContact = (message) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g, _h;
            const test = message.action.testing;
            console.log("Processing action:", message.action.id, "testing:", test);
            const campaign = yield this.fetchCampaign(message.campaign);
            if (this.verbose) {
                console.log(JSON.stringify(message, null, 2));
            }
            try {
                const tags = ["supporter", message.campaign.name];
                yield this.setTags(tags, test);
                const status = message.privacy.optIn ? "subscribed" : "unsubscribed";
                const personPayload = actionToPerson(message, tags, status);
                if (!message.privacy.optIn) {
                    const exists = yield this.fetchContact(message.contact.email, test);
                    // if supporter who opts-out exists and is subscribed, we do not unsubscribe them
                    if (exists)
                        adjustStatus(personPayload, exists, message.contact);
                }
                const contact = yield this.upsertContact(personPayload, test);
                const personUri = (_b = (_a = contact === null || contact === void 0 ? void 0 : contact._links) === null || _a === void 0 ? void 0 : _a.self) === null || _b === void 0 ? void 0 : _b.href;
                if (!personUri)
                    throw new Error("No person URI returned");
                const f = test
                    ? (((_d = (_c = campaign.config.component) === null || _c === void 0 ? void 0 : _c.sync) === null || _d === void 0 ? void 0 : _d.test_form) || testFormID || formID)
                    : (((_f = (_e = campaign.config.component) === null || _e === void 0 ? void 0 : _e.sync) === null || _f === void 0 ? void 0 : _f.form) || formID);
                if (test && !((_h = (_g = campaign.config.component) === null || _g === void 0 ? void 0 : _g.sync) === null || _h === void 0 ? void 0 : _h.test_form) && !testFormID) {
                    console.warn("Test mode enabled but no test form configured – falling back to prod form");
                }
                const form = yield this.fetchForm(f, test);
                yield this.submitAction(form, personUri, message, test);
                console.log("Submitted action:", message.action.id);
                return true;
            }
            catch (err) {
                console.error("Error handling contact/action:", err.message);
                return false;
            }
        });
        this.crmType = crm_1.CRMType.Contact;
        this.formCache = new Map();
        this.tagCache = new Map();
    }
    fetchForm(id, test) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!id) {
                throw new Error("Form ID is missing");
            }
            // return from cache if available
            if (this.formCache.has(id)) {
                return this.formCache.get(id);
            }
            try {
                const res = yield fetch(`${url}/forms/${id}`, {
                    method: "GET",
                    headers: getHeaders(test)
                });
                if (!res.ok) {
                    throw new Error(`Failed to fetch form: ${res.status} ${res.statusText}`);
                }
                const formData = yield res.json();
                this.formCache.set(id, formData); // cache it
                return formData;
            }
            catch (err) {
                console.error(`Error fetching form ${id}:`, err.message);
                throw err;
            }
        });
    }
}
exports.default = ActionNetwork;
