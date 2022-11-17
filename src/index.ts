// to parse options
import parseArg from "minimist";
import dotenv from "dotenv";

import { Configuration, DEFAULT_URL } from "./config";
import { listen, handler } from "./listener"
import {makeDumpHandler} from './dump'

function help() {
  console.error(`edit .env or set --env=path/to/.env:
  PROCA_USERNAME=
  PROCA_PASSWORD=
  PROCA_QUEUE= [eg: cus.123.deliver]
`);
}

// you can also use env vars, or any other config style
function configFromOptions(opt: any): Configuration {
  console.log(opt)
  if (!opt.q && !process.env.PROCA_QUEUE) throw Error("Provide queue name")
  if (!process.env.PROCA_USERNAME  && !process.env.PROCA_URL) throw Error("Provide queue user")
  if (!process.env.PROCA_PASSWORD && !process.env.PROCA_URL) throw Error("Provide queue password")

  // we allow opt.U to override the url
  return {
    url: opt.U || `amqps://${opt.u}:${opt.p}@queue.proca.app/proca_live`,
    queue: opt.q,
  }
}

export const main = (argv: string[]) => {
  const opt = parseArg(argv, {
    alias: { e: "env", v: "verbose" },
    default: { env: "" },
    boolean: ["verbose"],
  })
  let envConfig = undefined
  if (opt.env) {
    envConfig = 
    { path: opt.env }
  }
  dotenv.config(envConfig)

  const dumpHandler = opt.D ? makeDumpHandler(opt.D) : undefined;

  try {
    const config = configFromOptions(opt)

    console.log("listening for messages")
    listen(config, dumpHandler || handler)
  } catch (er) {
    console.error(`Problem: ${er}`)
    help()
  }
}

if (require.main === module) {
  main(process.argv.slice(2))
}

