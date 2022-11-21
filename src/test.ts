import { readFileSync } from "fs";
import parseArg from "minimist";
import dotenv from "dotenv";
import { Configuration, help, configFromOptions } from "./config";

export const main = (argv: string[]) => {
  const opt = parseArg(argv, {
    default: { env: "" },
  });
  let envConfig = undefined;

  if (!opt._[0]) {
    console.error(
      "missing file(s) to process, eg. yarn test data/petition_optin.json [data/share_twitter.json ...]"
    );
    process.exit(1);
  }

  if (opt.env) {
    envConfig = { path: opt.env };
  }
  const conf = dotenv.config(envConfig);

  const config = configFromOptions(conf);

  for (const file of opt._) {
    try {
      const message = JSON.parse(readFileSync(file, "utf8"));
      console.log(message);
    } catch (er) {
      console.error(`Problem: ${er}`);
      help();
    }
  }
};

if (require.main === module) {
  main(process.argv.slice(2));
}
