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
      "--dry-run (keep the message in the queue)",
      "--dump (write the messages as file)",
      "--verbose (show the result)",
      "--interactive(overwrite the output and spinner)",
      "--pause (wait between each message)",
      "[env] alternate way to configure the env to avoid the '-- --env'",
      //      "boolean inputs, no validatiton, everything but 'false' will be set to 'true'"
    ].join("\n"),
  );
  process.exit(0);
};

export const main = async (argv: string[]) => {
  const opt = parseArg(argv, {
    alias: { e: "env", v: "verbose", i: "interactive", p: "pause" },
    default: { env: "", interactive: false, verbose: false, "dry-run": false },
    boolean: ["verbose", "dump", "help", "pause", "dry-run"],
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
    console.log("trying with", opt.env);
    if (!existsSync(opt.env)) {
      const env = ".env." + opt.env;
      process.env.PROCA_ENV = opt.env;
      if (existsSync(env)) opt.env = env;
    } else {
      console.error("missing env", opt.env);
      process.exit(1);
    }
    envConfig = { path: opt.env };
  } else {
    if (process.env.NODE_ENV !== "production") {
      console.error("missing -e or --env params");
      process.exit(1);
    }
  }
  const conf = dotenv.config(envConfig);
  if (process.env.SENTRY_URL) {
    Sentry.init({ dsn: process.env.SENTRY_URL });
  }

  try {
    const config = configFromOptions(conf, opt);
    if (opt.dump) {
      console.warn(
        "saving into data folder instead of using " + process.env.CRM,
      );
      process.env.CRM = "file";
    }
    const crm = await init(config);
    console.log("listening for messages");
    const queue = listen(config, crm);

    process.on("SIGINT", async () => {
      console.log("Caught interrupt signal");
      if (queue) {
        // a close method is not documented, but it's a good practice to have one
        // @ts-ignore
        await queue.close();
      }
      if (crm.close) {
        await crm.close();
      }
      process.exit(0);
    });
  } catch (er) {
    console.error(`Problem: ${er}`);
    Sentry.captureException(er);
    help();
  }
};

if (require.main === module) {
  main(process.argv.slice(2));
}
