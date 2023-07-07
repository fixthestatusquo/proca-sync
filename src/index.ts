// to parse options
import parseArg from "minimist";
import dotenv from "dotenv";
import { existsSync } from "fs";

import { Configuration, DEFAULT_URL, help, configFromOptions } from "./config";
import { listen } from "./listener";
import * as Sentry from "@sentry/node";

export const main = (argv: string[]) => {
  const opt = parseArg(argv, {
    alias: { e: "env", v: "verbose" },
    default: { env: "" },
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
    //clihelp();
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
    const config = configFromOptions(conf);
    if (opt.dump) {
      console.warn(
        "saving into data folder instead of using " + process.env.CRM
      );
      process.env.CRM = "file";
    }
    console.log("listening for messages");
    listen(config);
  } catch (er) {
    console.error(`Problem: ${er}`);
    Sentry.captureException(er);
    help();
  }
};

if (require.main === module) {
  main(process.argv.slice(2));
}
