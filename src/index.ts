// to parse options

import { existsSync } from "node:fs";
import * as Sentry from "@sentry/node";
import parseArg from "minimist";

import { configFromOptions, help } from "./config";
import { init } from "./crm";
import { loadEnv } from "./env";
import { listen } from "./listener";

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

  let envFile = ".env";
  if (opt.help) {
    clihelp();
    process.exit(0);
  }

  if (opt._.length && !opt.env) {
    opt.env = opt._.shift();
  }
  if (opt.env) {
    if (!existsSync(opt.env)) {
      const env = `.env.${opt.env}`;
      if (existsSync(env)) {
        process.env.PROCA_ENV = opt.env;
        opt.env = env;
      } else {
        console.error("missing env", opt.env);
        process.exit(1);
      }
    }
    envFile = opt.env;
  } else {
    if (process.env.NODE_ENV !== "production") {
      console.error("missing -e or --env params");
      process.exit(1);
    }
  }
  const conf = loadEnv(envFile);
  if (process.env.SENTRY_URL) {
    Sentry.init({ dsn: process.env.SENTRY_URL });
  }

  let step = "configuration";
  try {
    const config = configFromOptions(conf, opt);
    if (opt.dump) {
      console.warn(
        `saving into data folder instead of using ${process.env.CRM}`,
      );
      process.env.CRM = "file";
    }
    step = `CRM (${process.env.CRM}) init`;
    const crm = await init(config);

    step = `queue connection (${config.queue})`;
    const queue = await listen(config, crm);
    console.log("listening for messages");

    process.on("SIGINT", async () => {
      console.log("Caught interrupt signal");
      await queue.close();

      if (crm.close) {
        await crm.close();
      }
      process.exit(0);
    });
  } catch (er) {
    console.error(`${step} failed: ${er}`);
    Sentry.captureException(er);
    if (step === "configuration") help();
    process.exit(1);
  }
};

if (require.main === module) {
  main(process.argv.slice(2));
}
