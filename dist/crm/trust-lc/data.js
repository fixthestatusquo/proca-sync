
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatAction = exports.handleConsent = void 0;
const handleConsent = (action) => {
    return action.privacy.emailStatus !== "double_opt_in" &&
        !action.action.customFields.isSubscribed
        ? false
        : true;
};
exports.handleConsent = handleConsent;
const formatAction = (queueAction, moveCode) => {
    var _a, _b, _c;
    const postData = queueAction;
    if (!moveCode)
        moveCode = "AKT" + postData.campaign.externalId;
    const action = {
        first_name: postData.contact.firstName,
        last_name: postData.contact.lastName,
        zip_code: postData.contact.postcode,
        email: postData.contact.email,
        phone: postData.contact.phone,
        country: postData.contact.country,
        message: postData.contact.comment,
        subscribe_newsletter: postData.privacy.emailStatus === "double_opt_in",
        data_handling_consent: (0, exports.handleConsent)(queueAction),
        move_code: moveCode,
        origin: (_a = postData.tracking) === null || _a === void 0 ? void 0 : _a.location,
        created_at: postData.action.createdAt || "",
        confirmed_at: postData.privacy.givenAt || "",
        additional_attributes_attributes: [
            { name: "action_id", value: postData.actionId.toString() },
            { name: "petition_id", value: postData.actionPage.name },
            { name: "Aktion", value: moveCode },
        ],
    };
    if ((_b = postData.contact.address) === null || _b === void 0 ? void 0 : _b.street)
        action.address1 = postData.contact.address.street;
    if ((_c = postData.contact.address) === null || _c === void 0 ? void 0 : _c.locality)
        action.location = postData.contact.address.locality;
    for (const key in action) {
        const v = action[key];
        if (v === undefined || v === null) {
            delete action[key];
        }
    }
    const signature = { petition_signature: action };
    return signature;
};
exports.formatAction = formatAction;
