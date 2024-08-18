"use strict";
/**
 * What info we need to read actions from Proca action queue?
 * */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_URL = exports.configFromOptions = exports.help = void 0;
function help() {
    console.error(`set --env=path/to/.env and at minima
  CRM
  PROCA_USERNAME=
  PROCA_PASSWORD=
  PROCA_QUEUE= [eg: cus.123.deliver]
`);
}
exports.help = help;
// you can also use env vars, or any other config style
function configFromOptions(opt, argv) {
    if (!process.env.PROCA_QUEUE)
        throw Error("Provide queue name");
    if (!process.env.PROCA_USERNAME && !process.env.PROCA_URL)
        throw Error("Provide queue user");
    if (!process.env.PROCA_PASSWORD && !process.env.PROCA_URL)
        throw Error("Provide queue password");
    if (process.env.PROCA_URL && !process.env.PROCA_URL.includes('://')) {
        process.env.PROCA_URL = `amqps://${process.env.PROCA_USERNAME}:${process.env.PROCA_PASSWORD}@${process.env.PROCA_URL}`;
    }
    // we allow opt.U to override the url
    return {
        url: process.env.PROCA_URL || `amqps://${process.env.PROCA_USERNAME}:${process.env.PROCA_PASSWORD}@api.proca.app/proca_live`,
        queue: process.env.PROCA_QUEUE,
        pause: argv.pause,
        verbose: argv.verbose,
        interactive: argv.interactive,
        dryRun: argv['dry-run'],
        concurrency: parseInt(process.env.concurrency || "1") || 1
    };
}
exports.configFromOptions = configFromOptions;
// our default queue server
exports.DEFAULT_URL = "amqps://api.proca.app";
