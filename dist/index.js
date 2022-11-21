"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = void 0;
// to parse options
const minimist_1 = __importDefault(require("minimist"));
const dotenv_1 = __importDefault(require("dotenv"));
const config_1 = require("./config");
const listener_1 = require("./listener");
const main = (argv) => {
    const opt = (0, minimist_1.default)(argv, {
        alias: { e: "env", v: "verbose" },
        default: { env: "" },
        boolean: ["verbose", "dump"],
    });
    let envConfig = undefined;
    if (opt.env) {
        envConfig =
            { path: opt.env };
    }
    const conf = dotenv_1.default.config(envConfig);
    try {
        const config = (0, config_1.configFromOptions)(conf);
        if (opt.dump) {
            console.warn("saving into data folder instead of using " + process.env.CRM);
            process.env.CRM = "file";
        }
        console.log("listening for messages");
        (0, listener_1.listen)(config);
    }
    catch (er) {
        console.error(`Problem: ${er}`);
        (0, config_1.help)();
    }
};
exports.main = main;
if (require.main === module) {
    (0, exports.main)(process.argv.slice(2));
}
