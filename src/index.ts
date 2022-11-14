// to parse options
import parseArg from "minimist";
import dotenv from "dotenv";

import { Configuration, DEFAULT_URL } from "./config";
import { listen } from "./listener";

function help() {
  console.error(`edit .env or set --env=path/to/.env:
  PROCA_USERNAME=
  PROCA_PASSWORD=
  PROCA_QUEUE= [eg: cus.123.deliver]
`);
}

// you can also use env vars, or any other config style
function configFromOptions(opt: any): Configuration {
  if (!process.env.PROCA_QUEUE) throw Error("Provide queue name");
  if (!process.env.PROCA_USERNAME  && !process.env.PROCA_URL) throw Error("Provide user");
  if (!process.env.PROCA_PASSWORD && !process.env.PROCA_URL) throw Error("Provide password");

  // we allow opt.U to override the url
  return {
    url: opt.U || `amqps://${opt.u}:${opt.p}@api.proca.app/proca_live`,
    queue: opt.q,
  };
}

export const main = (argv: string[]) => {
  const opt = parseArg(argv, {
    alias: { e: "env", v: "verbose" },
    default: { env: "" },
    boolean: ["verbose"],
  });
  let envConfig = undefined;
  if (opt.env) {
    envConfig = 
    { path: opt.env }
  }
  const conf = dotenv.config(envConfig);

  try {
    const config = configFromOptions(conf);

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

