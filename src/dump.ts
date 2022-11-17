import fs from 'fs'
import {Callback} from './listener'


// Dump to file handler



export const makeDumpHandler = (filename : string) : Callback => {
  const fd = fs.openSync(filename, 'w')

  const handler : Callback = async (actionOrEvent) => {
    const line = JSON.stringify(actionOrEvent) + "\n"
    if (actionOrEvent.schema === 'proca:action:2') {
      console.log(`${actionOrEvent.actionId}. Action ${actionOrEvent.action.actionType} email ${actionOrEvent.contact.email}`)
    } else {
      console.log(`${actionOrEvent.eventType} event for ${actionOrEvent.supporter?.contact?.email}`)

    }
    fs.writeSync(fd, line)
  }

  return handler
}
