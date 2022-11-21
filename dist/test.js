"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = void 0;
const fs_1 = require("fs");
const minimist_1 = __importDefault(require("minimist"));
const dotenv_1 = __importDefault(require("dotenv"));
const config_1 = require("./config");
const main = (argv) => __awaiter(void 0, void 0, void 0, function* () {
    const opt = (0, minimist_1.default)(argv, {
        default: { env: "" },
    });
    let envConfig = undefined;
    if (!opt._[0]) {
        console.error("missing file(s) to process, eg. yarn test data/petition_optin.json [data/share_twitter.json ...]");
        process.exit(1);
    }
    if (opt.env) {
        envConfig = { path: opt.env };
    }
    const conf = dotenv_1.default.config(envConfig);
    const config = (0, config_1.configFromOptions)(conf);
    if (!process.env.CRM) {
        console.error("you need to set CRM= in your .env to match a class in src/crm/{CRM}.ts");
        throw new Error("missing process.env.CRM");
    }
    let crm = yield Promise.resolve().then(() => __importStar(require("./crm/" + process.env.CRM)));
    if (crm.default) {
        crm = crm.default;
    }
    else {
        throw new Error(process.env.CRM + " missing export default new YourCRM()");
    }
    for (const file of opt._) {
        try {
            const message = JSON.parse((0, fs_1.readFileSync)(file, "utf8"));
            crm.handleActionContact(message);
        }
        catch (er) {
            console.error(`Problem: ${er}`);
            (0, config_1.help)();
        }
    }
});
exports.main = main;
if (require.main === module) {
    (0, exports.main)(process.argv.slice(2));
}
