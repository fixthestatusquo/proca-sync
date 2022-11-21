// to parse options
import parseArg from "minimist";
import dotenv from "dotenv";

import { Configuration, DEFAULT_URL, help, configFromOptions } from "./config";
import { listen } from "./listener";

export const main = (argv: string[]) => {
  const opt = parseArg(argv, {
    alias: { e: "env", v: "verbose" },
    default: { env: "" },
    boolean: ["verbose", "dump"],
  });
  let envConfig = undefined;
  if (opt.env) {
    envConfig = 
    { path: opt.env }
  }
  const conf = dotenv.config(envConfig);

  try {
    const config = configFromOptions(conf);

    if (opt.dump) {
      console.warn ("saving into data folder instead of using "+process.env.CRM);
      process.env.CRM = "file";
    }
    console.log("listening for messages");
    listen(config);
  } catch (er) {
    console.error(`Problem: ${er}`);
    help();
  }
};

if (require.main === module) {
  main(process.argv.slice(2))
}

