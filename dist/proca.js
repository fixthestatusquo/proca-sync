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
exports.fetchCampaign = exports.graphQL = void 0;
//export const graphQL: Promise<ProcaResponse> = async (operation, query, options) => {
function graphQL(operation, query, options) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!options)
            options = {};
        if (!options.apiUrl)
            options.apiUrl =
                process.env.REACT_APP_API_URL || "https://api.proca.app/api";
        let data = {};
        let headers = {
            "Content-Type": "application/json",
            Accept: "application/json",
        };
        if (options.authorization) {
            //    var auth = 'Basic ' + Buffer.from(options.authorization.username + ':' + options.authorization.username.password).toString('base64');
            headers.Authorization = "Basic " + options.authorization;
        }
        // console.debug("graphql: ", query, options.variables)
        try {
            const res = yield fetch(options.apiUrl, {
                method: "POST",
                referrerPolicy: "no-referrer-when-downgrade",
                headers: headers,
                body: JSON.stringify({
                    query: query,
                    variables: options.variables,
                    operationName: operation || "",
                    extensions: options.extensions,
                }),
            });
            if (!res.ok) {
                return {
                    errors: [{ message: "network error #" + res.status }],
                };
            }
            const response = (yield res.json());
            if (response.errors) {
                const toCamel = (s) => s.replace(/([_][a-z])/gi, ($1) => $1.toUpperCase().replace("_", ""));
                response.errors.fields = [];
                response.errors.forEach((error) => {
                    const field = error.path && error.path.slice(-1)[0];
                    if (!field)
                        return;
                    let msg = error.message.split(":");
                    if (msg.length === 2) {
                        msg = msg[1];
                    }
                    else {
                        msg = error.message;
                    }
                    response.errors.fields.push({
                        name: toCamel(field),
                        message: msg, // error.message,
                    });
                });
                data = response;
                return data;
            }
            data = response.data;
        }
        catch (error) {
            console.error(error);
            return { errors: [{ message: error.toString() }] };
        }
        return data;
    });
}
exports.graphQL = graphQL;
;
const fetchCampaign = (id) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    let variables = {};
    let query = `query campaign ($id: Int! ) {
  campaign (id:$id) {
    id, name, title, config, externalId
  }
}`;
    const data = yield graphQL("campaign", query, { variables: { id: id } });
    if (!(data === null || data === void 0 ? void 0 : data.campaign))
        throw new Error(data);
    if ((_a = data === null || data === void 0 ? void 0 : data.campaign) === null || _a === void 0 ? void 0 : _a.config)
        data.campaign.config = JSON.parse(data.campaign.config);
    return data === null || data === void 0 ? void 0 : data.campaign;
});
exports.fetchCampaign = fetchCampaign;
