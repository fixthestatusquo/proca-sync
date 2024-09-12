// to parse options
import parseArg from "minimist";
import dotenv from "dotenv";
import { existsSync, readFileSync } from "fs";
import {pause} from "./utils";

import { Configuration, DEFAULT_URL, help, configFromOptions } from "./config";
import { init } from "./crm";
import * as Sentry from "@sentry/node";

const clihelp = () => {
  console.log(
    [
      "options",
      "--help (this command)",
      "--env (either absolute path to a .env or .env.{env} in the folder)",
      "--dry-run (don't write)",
      "--dump (write the messages as file)",
      "--verbose (show the result)",
      "--pause (wait between each message)",
      "[env] alternate way to configure the env to avoid the '-- --env'",
      "[data file.json] file containing the message to process'"
      //      "boolean inputs, no validatiton, everything but 'false' will be set to 'true'"
    ].join("\n")
  );
  process.exit(0);

}

export const main = async (argv: string[]) => {
  const opt = parseArg(argv, {
    alias: { e: "env", v: "verbose" },
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


  let envConfig: any = undefined;
  if (opt.help) {
    clihelp();
    process.exit(0);
  }

  if (opt._.length && !opt.env) {
    opt.env = opt._.shift();
  }
  if (opt.env) {
    if (!existsSync(opt.env)) {
      const env = ".env." + opt.env;
      if (existsSync(env)) opt.env = env;
    } else {
      console.error("missing env", opt.env);
      process.exit(1);
    }
    envConfig = { path: opt.env };
  }
  const conf = dotenv.config(envConfig);
  if (process.env.SENTRY_URL) {
    Sentry.init({ dsn: process.env.SENTRY_URL });
  }

  try {
    const config = configFromOptions(conf, opt);
    if (opt.dump) {
      console.warn(
        "saving into data folder instead of using " + process.env.CRM
      );
      process.env.CRM = "file";
    }
    const crm = await init (config);
    console.log("reading files", opt._);
    if (opt._.length ===0) {
      console.warn("missing file(s) to process, defaulting to data/petition_optin.json");
      opt._.push("data/petition_optin.json");
    }
  for (const file of opt._) {
      const message = JSON.parse(readFileSync(file, "utf8"));
      if(!message.campaign.id) { // update to the newer v2 format
      message.campaign.id=message.campaignId;
        message.action.id=message.actionId;
        message.org.id=message.orgId;
        message.actionPage.id=message.actionPageId;
}
      const r = await crm.handleActionContact(message);
      if (crm.pause) {
          console.log("pause action...");
          await pause(10);
        }
        if (typeof r === "object" && "processed" in r) {
//          spin (count.ack + count.nack, "processed");
          return !!r.processed;
        }

//        spin (count.ack + count.nack, "bool processed");
//      if (message?.contact?.email)
//        console.log(await crm.fetchContact(message.contact.email));
        return !!r;
  }
  } catch (er) {
    console.error("Problem",er);
    Sentry.captureException(er);
    help();
  }
};

if (require.main === module) {
  (async () => {await main(process.argv.slice(2));console.log("")})();
}
