"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.string2map = void 0;
const string2map = (string) => {
    const urlSearchParams = new URLSearchParams(string);
    const params = Object.fromEntries(urlSearchParams.entries());
    return params;
};
exports.string2map = string2map;
