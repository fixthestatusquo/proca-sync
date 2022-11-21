"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = void 0;
const fs_1 = require("fs");
const minimist_1 = __importDefault(require("minimist"));
const dotenv_1 = __importDefault(require("dotenv"));
const config_1 = require("./config");
const main = (argv) => {
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
    for (const file of opt._) {
        try {
            const message = JSON.parse((0, fs_1.readFileSync)(file, "utf8"));
            console.log(message);
        }
        catch (er) {
            console.error(`Problem: ${er}`);
            (0, config_1.help)();
        }
    }
};
exports.main = main;
if (require.main === module) {
    (0, exports.main)(process.argv.slice(2));
}
