"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailChangedToContactRecord = exports.determineOptIn = exports.actionToLeadRecord = exports.actionToContactRecord = exports.countryName = exports.isActionSyncable = void 0;
const i18n_iso_countries_1 = __importDefault(require("i18n-iso-countries"));
const en_json_1 = __importDefault(require("i18n-iso-countries/langs/en.json"));
en_json_1.default.countries['US'].shift(); // remove the United States of America - Salesforce does not understand it - leave United States
en_json_1.default.countries['VE'] = 'Venezuela, Bolivarian Republic of'; // srsly Salesforce....
i18n_iso_countries_1.default.registerLocale(en_json_1.default);
const isActionSyncable = (action) => {
    return (action.privacy.withConsent && action.privacy.optIn);
};
exports.isActionSyncable = isActionSyncable;
const countryName = (code) => {
    if (code) {
        return i18n_iso_countries_1.default.getName(code.toUpperCase(), "en");
    }
    return code;
};
exports.countryName = countryName;
const actionToContactRecord = (action, opts) => {
    const c = {
        FirstName: action.contact.firstName,
        LastName: action.contact.lastName || opts.defaultLastName,
        Email: action.contact.email,
        Phone: action.contact.phone,
        MailingCountry: (0, exports.countryName)(action.contact.country),
        MailingPostalCode: action.contact.postcode
    };
    (0, exports.determineOptIn)(c, action.privacy, opts);
    if (opts.language) {
        c[opts.language] = action.actionPage.locale;
    }
    return c;
};
exports.actionToContactRecord = actionToContactRecord;
const actionToLeadRecord = (action, opts) => {
    const c = {
        FirstName: action.contact.firstName,
        LastName: action.contact.lastName || opts.defaultLastName,
        Email: action.contact.email,
        Phone: action.contact.phone,
        Country: (0, exports.countryName)(action.contact.country),
        PostalCode: action.contact.postcode,
        Company: '[not provided]',
        LeadSource: action.campaign.title
    };
    (0, exports.determineOptIn)(c, action.privacy, opts);
    if (opts.language) {
        c[opts.language] = action.actionPage.locale;
    }
    return c;
};
exports.actionToLeadRecord = actionToLeadRecord;
const determineOptIn = (r, privacy, opts) => {
    if (opts.optInField) { // it's always optin, the optout have been filtered out already
        r[opts.optInField] = true;
        return;
    }
    // consents
    // explicit DOI = must be subscribe
    let optIn = false;
    if (privacy.emailStatus === "double_opt_in") {
        optIn = true;
        // bouncing - cleaned / banned
    }
    else if (privacy.emailStatus !== null) {
        optIn = false;
        r.EmailBouncedReason = privacy.emailStatus;
        if (privacy.emailStatusChanged)
            r.EmailBouncedDate = privacy.emailStatusChanged;
    }
    else {
        // else, lets infer:
        if (privacy.optIn) {
            // we have some opt in
            if (opts.doubleOptIn) {
                // id DOI, wait
                optIn = false;
            }
            else {
                // otherwise it's ok
                optIn = true;
            }
        }
        else {
            optIn = false;
        }
    }
    if (opts.optInField) {
        r[opts.optInField] = optIn;
    }
};
exports.determineOptIn = determineOptIn;
const emailChangedToContactRecord = (event, optInField) => {
    const emailStatus = event.supporter.privacy.emailStatus;
    const emailStatusChanged = event.supporter.privacy.emailStatusChanged;
    if (emailStatus === 'double_opt_in' && emailStatusChanged) {
        const r = {
            Email: event.supporter.contact.email
        };
        r[optInField] = true;
        return r;
    }
    else if (emailStatusChanged && (emailStatus === 'bounce' || emailStatus === 'blocked' || emailStatus === 'unsub' || emailStatus === 'spam')) {
        const r = {
            Email: event.supporter.contact.email,
            EmailBouncedReason: emailStatus,
            EmailBouncedDate: emailStatusChanged
        };
        return r;
    }
    return null;
};
exports.emailChangedToContactRecord = emailChangedToContactRecord;
