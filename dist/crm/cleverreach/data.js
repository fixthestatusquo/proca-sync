"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatAction = void 0;
const formatAction = (message, hasValues, customLabel) => {
    var _a, _b, _c, _d, _e;
    // do not overwrite 'quelle'
    // do not delete first and lastname if they exist in the old record but not it the message
    const global = {
        "quelle": (hasValues === null || hasValues === void 0 ? void 0 : hasValues.quelle) ? hasValues.quelle : message.campaign.title,
        "petition": message.campaign.title,
        "language": message.actionPage.locale,
        "phone": ((_a = message.contact) === null || _a === void 0 ? void 0 : _a.phone) || "",
        "double_opt_in": "yes",
        "street": message.contact.street || "",
        "zip": ((_b = message.contact) === null || _b === void 0 ? void 0 : _b.postcode) ? (_c = message.contact) === null || _c === void 0 ? void 0 : _c.postcode.toString() : (hasValues === null || hasValues === void 0 ? void 0 : hasValues.zip) || "",
        "lastname": (hasValues === null || hasValues === void 0 ? void 0 : hasValues.lastname) && !message.contact.lastName ? hasValues.lastname : message.contact.lastName || "",
        "firstname": message.contact.firstName,
        "country": message.contact.country || message.contact.area || "",
        "company": (hasValues === null || hasValues === void 0 ? void 0 : hasValues.company) && !message.contact.company ? hasValues.company : ((_e = (_d = message.action.customFields) === null || _d === void 0 ? void 0 : _d.organisation) === null || _e === void 0 ? void 0 : _e.toString()) || "",
        "city": message.contact.locality || "",
        "last_changed": message.privacy.emailStatusChanged || "",
        // each campaign should have custom field with the name date (6 figures) and campaign title
        [customLabel]: message.campaign.title
    };
    const attributes = {
        created_at: message.action.createdAt
    };
    return ({
        "email": message.contact.email,
        "source": message.tracking.location || "",
        "activated": Math.floor(Date.now() / 1000),
        "attributes": attributes,
        "global_attributes": global
    });
};
exports.formatAction = formatAction;
