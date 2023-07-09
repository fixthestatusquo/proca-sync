// to parse options
import parseArg from "minimist";
import dotenv from "dotenv";
import { existsSync } from "fs";

import { Configuration, DEFAULT_URL, help, configFromOptions } from "./config";
import { listen } from "./listener";
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

  let envConfig = undefined;
  if (opt.help) {
    clihelp();
    process.exit(0);
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
    console.log("listening for messages");
    const crm = await init (config);
    listen(config, crm);
  } catch (er) {
    console.error(`Problem: ${er}`);
    Sentry.captureException(er);
    help();
  }
};

if (require.main === module) {
  main(process.argv.slice(2));
}
