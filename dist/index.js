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
// to parse options
const minimist_1 = __importDefault(require("minimist"));
const dotenv_1 = __importDefault(require("dotenv"));
const fs_1 = require("fs");
const config_1 = require("./config");
const listener_1 = require("./listener");
const crm_1 = require("./crm");
const Sentry = __importStar(require("@sentry/node"));
const clihelp = () => {
    console.log([
        "options",
        "--help (this command)",
        "--env (either absolute path to a .env or .env.{env} in the folder)",
        "--dry-run (don't write)",
        "--dump (write the messages as file)",
        "--verbose (show the result)",
        "--pause (wait between each message)",
        //      "boolean inputs, no validatiton, everything but 'false' will be set to 'true'"
    ].join("\n"));
    process.exit(0);
};
const main = (argv) => __awaiter(void 0, void 0, void 0, function* () {
    const opt = (0, minimist_1.default)(argv, {
        alias: { e: "env", v: "verbose", p: "pause" },
        default: { env: "", verbose: false },
        boolean: ["verbose", "dump", "help", "pause"],
        unknown: (param) => {
            if (param[0] === "-") {
                console.error("invalid parameter", param);
                process.exit(1);
            }
            return true;
        },
    });
    let envConfig = undefined;
    if (opt.help) {
        clihelp();
        process.exit(0);
    }
    if (opt._[0]) {
        opt.env = opt._[0];
    }
    if (opt.env) {
        console.log("trying with", opt.env);
        if (!(0, fs_1.existsSync)(opt.env)) {
            const env = ".env." + opt.env;
            process.env.PROCA_ENV = opt.env;
            if ((0, fs_1.existsSync)(env))
                opt.env = env;
        }
        else {
            console.error("missing env", opt.env);
            process.exit(1);
        }
        envConfig = { path: opt.env };
    }
    else {
        if (process.env.NODE_ENV !== 'production') {
            console.error("missing -e or --env params");
            process.exit(1);
        }
    }
    const conf = dotenv_1.default.config(envConfig);
    if (process.env.SENTRY_URL) {
        Sentry.init({ dsn: process.env.SENTRY_URL });
    }
    try {
        const config = (0, config_1.configFromOptions)(conf, opt);
        if (opt.dump) {
            console.warn("saving into data folder instead of using " + process.env.CRM);
            process.env.CRM = "file";
        }
        const crm = yield (0, crm_1.init)(config);
        console.log("listening for messages");
        (0, listener_1.listen)(config, crm);
    }
    catch (er) {
        console.error(`Problem: ${er}`);
        Sentry.captureException(er);
        (0, config_1.help)();
    }
});
exports.main = main;
if (require.main === module) {
    (0, exports.main)(process.argv.slice(2));
}
