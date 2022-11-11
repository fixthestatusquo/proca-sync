
// to parse options
import parseArg from 'minimist'

import {Configuration, DEFAULT_URL} from './config'
import {listen} from './listener'


function help () {
  console.error(`Call me with arguments:
  -u username
  -p password
  -q queue-name [eg: cus.123.deliver]
`)
}

// you can also use env vars, or any other config style
function configFromOptions (opt : any) : Configuration {
  if (!opt.u && !opt.U) throw Error("Provide user")
  if (!opt.p && !opt.U) throw Error("Provide password")
  if (!opt.q) throw Error("Provide queue name")

  // we allow opt.U to override the url
  return {
    url: opt.U || `amqps://${opt.u}:${opt.p}@api.proca.app/proca_live`,
    queue: opt.q
  }
}


export const main = (argv : string[]) => {
  const opt = parseArg(argv)

  try {
  const config = configFromOptions(opt)

  console.log('listening for messages')
  listen(config)

  } catch(er) {
    console.error(`Problem: ${er}`)
    help()
  }

}
