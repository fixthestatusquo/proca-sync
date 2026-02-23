
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailChangedToContactRecord = exports.determineOptIn = exports.actionToLeadRecord = exports.actionToContactRecord = exports.isActionSyncable = void 0;
const isActionSyncable = (action) => {
    return action.privacy.withConsent && action.privacy.optIn;
};
exports.isActionSyncable = isActionSyncable;
const actionToContactRecord = (action, opts) => {
    const c = {
        FirstName: action.contact.firstName,
        LastName: action.contact.lastName || opts.defaultLastName,
        Email: action.contact.email,
        Phone: action.contact.phone,
        MailingCountryCode: action.contact.country,
        MailingPostalCode: action.contact.postcode,
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
        //Country: countryName(action.contact.country),
        CountryCode: action.contact.country,
        PostalCode: action.contact.postcode,
        Company: "[not provided]",
        LeadSource: action.campaign.title,
    };
    (0, exports.determineOptIn)(c, action.privacy, opts);
    if (opts.language) {
        c[opts.language] = action.actionPage.locale;
    }
    return c;
};
exports.actionToLeadRecord = actionToLeadRecord;
const determineOptIn = (r, privacy, opts) => {
    let optIn = false;
    if (opts.optInField) {
        // it's always optin, the optout have been filtered out already
        r[opts.optInField] = true;
        return;
    }
    // consents
    // explicit DOI = must be subscribe
    if (privacy.emailStatus === "double_opt_in") { //deadling with doi
        optIn = true;
        // bouncing - cleaned / banned
    }
    else if (privacy.emailStatus !== null) {
        r.EmailBouncedReason = privacy.emailStatus;
        if (privacy.emailStatusChanged)
            r.EmailBouncedDate = privacy.emailStatusChanged;
    }
    if (privacy.optIn && !opts.doubleOptIn) { //regular optin
        optIn = true;
    }
    console.log("optin", optIn, opts.optInField);
    if (!opts.optInField) {
        console.error("you need an optInField");
        //   return;
    }
    if (opts.optInField) {
        r[opts.optInField] = optIn;
    }
    process.exit(1);
};
exports.determineOptIn = determineOptIn;
const emailChangedToContactRecord = (event, optInField) => {
    const emailStatus = event.supporter.privacy.emailStatus;
    const emailStatusChanged = event.supporter.privacy.emailStatusChanged;
    if (emailStatus === "double_opt_in" && emailStatusChanged) {
        const r = {
            Email: event.supporter.contact.email,
        };
        r[optInField] = true;
        return r;
    }
    else if (emailStatusChanged &&
        (emailStatus === "bounce" ||
            emailStatus === "blocked" ||
            emailStatus === "unsub" ||
            emailStatus === "spam")) {
        const r = {
            Email: event.supporter.contact.email,
            EmailBouncedReason: emailStatus,
            EmailBouncedDate: emailStatusChanged,
        };
        return r;
    }
    return null;
};
exports.emailChangedToContactRecord = emailChangedToContactRecord;
