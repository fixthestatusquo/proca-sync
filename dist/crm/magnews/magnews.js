"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
class magnews {
    constructor() {
        this.bearerToken = "";
    }
    setConfig(conf) {
        this.bearerToken = conf.accessToken;
    }
    getToken() {
        return this.bearerToken;
    }
    addListMember(token, member) {
        return __awaiter(this, void 0, void 0, function* () {
            fetch("https://apiserver/ws/rest/api/v19/contacts/merge", {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                method: "POST",
                body: JSON.stringify(member)
            })
                .then(function (res) {
                return res;
            })
                .catch(function (res) {
                console.error("addListMember", res.toString());
                throw res;
            });
        });
    }
    ;
}
exports.default = new magnews();
