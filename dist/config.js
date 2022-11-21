"use strict";
/**
 * What info we need to read actions from Proca action queue?
 * */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_URL = exports.configFromOptions = exports.help = void 0;
function help() {
    console.error(`edit .env or set --env=path/to/.env:
  PROCA_USERNAME=
  PROCA_PASSWORD=
  PROCA_QUEUE= [eg: cus.123.deliver]
`);
}
exports.help = help;
// you can also use env vars, or any other config style
function configFromOptions(opt) {
    if (!process.env.PROCA_QUEUE)
        throw Error("Provide queue name");
    if (!process.env.PROCA_USERNAME && !process.env.PROCA_URL)
        throw Error("Provide queue user");
    if (!process.env.PROCA_PASSWORD && !process.env.PROCA_URL)
        throw Error("Provide queue password");
    // we allow opt.U to override the url
    return {
        url: process.env.PROCA_URL || `amqps://${process.env.PROCA_USERNAME}:${process.env.PROCA_PASSWORD}@api.proca.app/proca_live`,
        queue: process.env.PROCA_QUEUE,
    };
}
exports.configFromOptions = configFromOptions;
// our default queue server
exports.DEFAULT_URL = "amqps://api.proca.app";
