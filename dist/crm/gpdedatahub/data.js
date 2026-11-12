"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatAction = void 0;
const formatAction = (queueAction, config) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
    const data = queueAction;
    /// Add data form_type
    data.form_type =
        queueAction.action.actionType === "mail2target" ||
            queueAction.action.actionType === "email"
            ? "protestmail"
            : "petition";
    if (data.action.customFields.bannerid)
        data.bannerid = data.action.customFields.bannerid.toString();
    if (data.action.customFields.promocode ||
        data.action.customFields.promocodephone) {
        data.promo_code = ((_a = data.contact) === null || _a === void 0 ? void 0 : _a.phone)
            ? ((_b = data.action.customFields.promocodephone) === null || _b === void 0 ? void 0 : _b.toString()) ||
                ((_c = data.action.customFields.promocode) === null || _c === void 0 ? void 0 : _c.toString()) ||
                ""
            : ((_d = data.action.customFields.promocode) === null || _d === void 0 ? void 0 : _d.toString()) || "";
    }
    else if (((_g = (_f = (_e = config === null || config === void 0 ? void 0 : config.component) === null || _e === void 0 ? void 0 : _e.sync) === null || _f === void 0 ? void 0 : _f.promoCode) === null || _g === void 0 ? void 0 : _g.default) ||
        ((_k = (_j = (_h = config === null || config === void 0 ? void 0 : config.component) === null || _h === void 0 ? void 0 : _h.sync) === null || _j === void 0 ? void 0 : _j.promoCode) === null || _k === void 0 ? void 0 : _k.phone)) {
        data.promo_code = ((_l = data.contact) === null || _l === void 0 ? void 0 : _l.phone)
            ? config.component.sync.promoCode.phone || ""
            : config.component.sync.promoCode.default || "";
    }
    return data;
};
exports.formatAction = formatAction;
