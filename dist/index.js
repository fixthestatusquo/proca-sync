"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = void 0;
// to parse options
const minimist_1 = __importDefault(require("minimist"));
const dotenv_1 = __importDefault(require("dotenv"));
const listener_1 = require("./listener");
const dump_1 = require("./dump");
function help() {
    console.error(`edit .env or set --env=path/to/.env:
  PROCA_USERNAME=
  PROCA_PASSWORD=
  PROCA_QUEUE= [eg: cus.123.deliver]
`);
}
// you can also use env vars, or any other config style
function configFromOptions(opt) {
    console.log(opt);
    if (!opt.q && !process.env.PROCA_QUEUE)
        throw Error("Provide queue name");
    if (!process.env.PROCA_USERNAME && !process.env.PROCA_URL)
        throw Error("Provide queue user");
    if (!process.env.PROCA_PASSWORD && !process.env.PROCA_URL)
        throw Error("Provide queue password");
    // we allow opt.U to override the url
    return {
        url: opt.U || `amqps://${opt.u}:${opt.p}@queue.proca.app/proca_live`,
        queue: opt.q,
    };
}
const main = (argv) => {
    const opt = (0, minimist_1.default)(argv, {
        alias: { e: "env", v: "verbose" },
        default: { env: "" },
        boolean: ["verbose"],
    });
    let envConfig = undefined;
    if (opt.env) {
        envConfig =
            { path: opt.env };
    }
    dotenv_1.default.config(envConfig);
    const dumpHandler = opt.D ? (0, dump_1.makeDumpHandler)(opt.D) : undefined;
    try {
        const config = configFromOptions(opt);
        console.log("listening for messages");
        (0, listener_1.listen)(config, dumpHandler || listener_1.handler);
    }
    catch (er) {
        console.error(`Problem: ${er}`);
        help();
    }
};
exports.main = main;
if (require.main === module) {
    (0, exports.main)(process.argv.slice(2));
}
