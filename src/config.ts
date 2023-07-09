/**
 * What info we need to read actions from Proca action queue?
 * */

export type Configuration = {
  url: string  // the URL of queue server
  queue: string // the queue name
  pause?: boolean
  concurrency?: number
  verbose: boolean
};

export function help() {
  console.error(`set --env=path/to/.env and at minima
  CRM
  PROCA_USERNAME=
  PROCA_PASSWORD=
  PROCA_QUEUE= [eg: cus.123.deliver]
`);
}

// you can also use env vars, or any other config style
export function configFromOptions(opt: any, argv: any): Configuration {

  if (!process.env.PROCA_QUEUE) throw Error("Provide queue name");
  if (!process.env.PROCA_USERNAME  && !process.env.PROCA_URL) throw Error("Provide queue user");
  if (!process.env.PROCA_PASSWORD && !process.env.PROCA_URL) throw Error("Provide queue password");

  // we allow opt.U to override the url
  return {
    url: process.env.PROCA_URL || `amqps://${process.env.PROCA_USERNAME}:${process.env.PROCA_PASSWORD}@api.proca.app/proca_live`,
    queue: process.env.PROCA_QUEUE,
    pause: argv.pause,
    verbose: argv.verbose,
    concurrency: parseInt(process.env.concurrency || "1") || 1
  };
}


// our default queue server
export const DEFAULT_URL = "amqps://api.proca.app";

