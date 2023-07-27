"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailChangedToContactRecord = exports.actionToContactRecord = exports.listName = exports.isActionSyncable = void 0;
const isActionSyncable = (action, onlyOptIn) => {
    return (action.privacy.withConsent) && (action.privacy.optIn || !onlyOptIn);
};
exports.isActionSyncable = isActionSyncable;
const listName = (action, listPerLang) => {
    let c = action.campaign.name;
    if (listPerLang)
        c = c + ` ${action.actionPage.locale}`;
    if (action.privacy.optIn) {
        return `${c} (opt-in)`;
    }
    else {
        return `${c} (opt-out)`;
    }
};
exports.listName = listName;
const actionToContactRecord = (action, doubleOptIn, optOutAsTransactional) => {
    var _a, _b, _c, _d;
    const r = {
        email_address: action.contact.email,
        language: action.actionPage.locale,
        timestamp_signup: action.action.createdAt,
        merge_fields: {
            FNAME: action.contact.firstName
        },
        tags: [action.campaign.name]
    };
    if (action.contact.lastName)
        r.merge_fields.LNAME = action.contact.lastName;
    // address fields
    if (action.contact.country) {
        r.merge_fields.ADDRESS = {
            country: action.contact.country || '',
            state: ((_a = action.contact.address) === null || _a === void 0 ? void 0 : _a.region) || '',
            zip: action.contact.postcode || '',
            city: ((_b = action.contact.address) === null || _b === void 0 ? void 0 : _b.locality) || '',
            addr1: ((_c = action.contact.address) === null || _c === void 0 ? void 0 : _c.street) || ''
        };
        if ((_d = action.contact.address) === null || _d === void 0 ? void 0 : _d.street_number)
            r.merge_fields.ADDRESS.addr1 += ' ' + action.contact.address.street_number;
    }
    // consents
    // explicit DOI = must be subscribe
    if (action.privacy.emailStatus === "double_opt_in") {
        r.status_if_new = 'subscribed';
        // bouncing - cleaned / banned
    }
    else if (action.privacy.emailStatus !== null) {
        r.status_if_new = 'cleaned';
    }
    else {
        // else, lets infer:
        if (action.privacy.optIn) {
            // we have some opt in
            if (doubleOptIn) {
                // id DOI, wait
                r.status_if_new = 'pending';
            }
            else {
                // otherwise it's ok
                r.status_if_new = 'subscribed';
            }
        }
        else {
            // soft opt-out - 1 more mail to send
            if (optOutAsTransactional) {
                r.status_if_new = 'transactional';
            }
            else {
                // no means no
                r.status_if_new = 'unsubscribed';
            }
        }
    }
    return r;
};
exports.actionToContactRecord = actionToContactRecord;
const emailChangedToContactRecord = (event) => {
    const emailStatus = event.supporter.privacy.emailStatus;
    const emailStatusChanged = event.supporter.privacy.emailStatusChanged;
    if (emailStatus === 'double_opt_in' && emailStatusChanged) {
        return {
            email_address: event.supporter.contact.email,
            status: 'subscribed',
            timestamp_opt: emailStatusChanged
        };
    }
    else if (emailStatus === 'bounce' || emailStatus === 'blocked' || emailStatus === 'unsub' || emailStatus === 'spam') {
        return {
            email_address: event.supporter.contact.email,
            status: 'cleaned'
        };
    }
    return null;
};
exports.emailChangedToContactRecord = emailChangedToContactRecord;
