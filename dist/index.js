"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = void 0;
// to parse options
const minimist_1 = __importDefault(require("minimist"));
const listener_1 = require("./listener");
function help() {
    console.error(`Call me with arguments:
  -u username
  -p password
  -q queue-name [eg: cus.123.deliver]
`);
}
// you can also use env vars, or any other config style
function configFromOptions(opt) {
    if (!opt.u && !opt.U)
        throw Error("Provide user");
    if (!opt.p && !opt.U)
        throw Error("Provide password");
    if (!opt.q)
        throw Error("Provide queue name");
    // we allow opt.U to override the url
    return {
        url: opt.U || `amqps://${opt.u}:${opt.p}@api.proca.app/proca_live`,
        queue: opt.q
    };
}
const main = (argv) => {
    const opt = (0, minimist_1.default)(argv);
    try {
        const config = configFromOptions(opt);
        console.log('listening for messages');
        (0, listener_1.listen)(config);
    }
    catch (er) {
        console.error(`Problem: ${er}`);
        help();
    }
};
exports.main = main;
