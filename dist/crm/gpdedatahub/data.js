"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatAction = void 0;
const formatAction = (queueAction, config) => {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const data = queueAction;
    if (data.action.customFields.promocode || data.action.customFields.promocodephone) {
        data.promo_code = ((_a = data.contact) === null || _a === void 0 ? void 0 : _a.phone)
            ? data.action.customFields.promocodephone.toString() || ""
            : data.action.customFields.promocode.toString() || "";
    }
    else if (((_d = (_c = (_b = config === null || config === void 0 ? void 0 : config.component) === null || _b === void 0 ? void 0 : _b.sync) === null || _c === void 0 ? void 0 : _c.promoCode) === null || _d === void 0 ? void 0 : _d.default) ||
        ((_g = (_f = (_e = config === null || config === void 0 ? void 0 : config.component) === null || _e === void 0 ? void 0 : _e.sync) === null || _f === void 0 ? void 0 : _f.promoCode) === null || _g === void 0 ? void 0 : _g.phone)) {
        data.promo_code = ((_h = data.contact) === null || _h === void 0 ? void 0 : _h.phone)
            ? config.component.sync.promoCode.phone || ""
            : config.component.sync.promoCode.default || "";
    }
    return data;
};
exports.formatAction = formatAction;
