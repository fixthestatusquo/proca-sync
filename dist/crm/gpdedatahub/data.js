"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatAction = void 0;
const formatAction = (queueAction) => {
    var _a, _b, _c, _d;
    const data = queueAction;
    const action = {
        id: data.actionId,
        form_type: data.actionPage.name,
        "Datum": data.action.createdAt,
        "Vorname": data.contact.firstName,
        "Nachname": data.contact.lastName || null,
        "Geburtsjahr": data.contact.birth_date || null, //where's this recorded??
        "Strasse+Nr": ((_a = data.contact.address) === null || _a === void 0 ? void 0 : _a.street) || null,
        "PLZ": ((_b = data.contact) === null || _b === void 0 ? void 0 : _b.postcode) || null,
        "Ort": ((_c = data.contact.address) === null || _c === void 0 ? void 0 : _c.locality) || null,
        "E-Mail-Adresse*": data.contact.email,
        "Werbecode": 123456,
        "NewsletterDOI": data.privacy.emailStatus === "double_opt_in" ? "Yes" : "No", // CHECK!!!
        "Submit_timestamp": data.privacy.givenAt || null,
        origin: (_d = data.tracking) === null || _d === void 0 ? void 0 : _d.location
    };
    //where's phone number recorded??
    // phone needs formating
    if (data.contact.phone)
        action["Telefonnummer(Vorwahl+Durchwahl)"] = data.contact.phone;
    if (data.contact.country)
        action.iso = data.contact.country;
    return action;
};
exports.formatAction = formatAction;
