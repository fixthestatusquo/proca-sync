"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatAction = void 0;
const formatAction = (message, update = false) => {
    var _a, _b, _c;
    const global = {
        "petition": message.campaign.title,
        "language": message.actionPage.locale,
        "phone": ((_a = message.contact) === null || _a === void 0 ? void 0 : _a.phone) || "",
        "double_opt_in": "yes",
        "street": message.contact.street || "",
        "zip": message.contact.postcode || "",
        "lastname": message.contact.lastName || "",
        "firstname": message.contact.firstName,
        "country": message.contact.country || message.contact.area || "",
        "company": ((_b = message.action.customFields) === null || _b === void 0 ? void 0 : _b.organisation)
            ? (_c = message.action.customFields) === null || _c === void 0 ? void 0 : _c.organisation.toString()
            : "",
        "city": message.contact.locality || "",
        "last_changed": message.privacy.emailStatusChanged || ""
    };
    const attributes = {
        created_at: message.action.createdAt
    };
    // do not overwrite 'quelle'
    if (!update)
        global.quelle = message.campaign.title;
    return ({
        "email": message.contact.email,
        "source": message.tracking.location || "",
        "attributes": attributes,
        "global_attributes": global
    });
};
exports.formatAction = formatAction;
