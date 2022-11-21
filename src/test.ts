import { readFileSync } from "fs";
import parseArg from "minimist";
import dotenv from "dotenv";
import { Configuration, help, configFromOptions } from "./config";

export const main = async (argv: string[]) => {
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
    if (!process.env.CRM) {
      console.error("you need to set CRM= in your .env to match a class in src/crm/{CRM}.ts")
      throw new Error ("missing process.env.CRM");
    }
    let crm = await import("./crm/"+process.env.CRM);
    if (crm.default) {
      crm = crm.default;
    } else {
      throw new Error (process.env.CRM +" missing export default new YourCRM()");
    }

  for (const file of opt._) {
    try {
      const message = JSON.parse(readFileSync(file, "utf8"));
      crm.handleActionContact(message);
    } catch (er) {
      console.error(`Problem: ${er}`);
      help();
    }
  }
};

if (require.main === module) {
  main(process.argv.slice(2));
}
