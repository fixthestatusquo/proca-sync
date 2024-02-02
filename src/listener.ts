import { syncQueue, ActionMessageV2, EventMessageV2, ConsumerOpts, count } from "@proca/queue";
import { Configuration } from "./config";
import { CRM } from "./crm";
import {spin} from "./spinner";
import {pause} from "./utils";
//import * as crm from './crm.debug';
let crm: any = {};
// TODO: set type
//


export const listen = (config: Configuration, crm: CRM) => {
  let tag = "proca-sync."+process.env.CRM +"."+process.env.PROCA_ENV;
  const opts : ConsumerOpts = {tag: tag};
  if (config.concurrency) {
     opts.concurrency = config.concurrency;
  }

  crm.count = count;

  return syncQueue(config.url, config.queue, async (actionOrEvent) => {
    //export type SyncCallback = (action: ActionMessageV2 | EventMessageV2) => Promise<SyncResult | boolean>;
    //export type SyncResult = {processed: boolean;}
    //export type handleResult = { processed: boolean};

    // Handle a new message
    //
    // Throw an error if you want to NACK the message and make it re-deliver again.
    // Return nothing to have the message ACKed (removed from queue)
    //
    // What is this?
    switch (actionOrEvent.schema) {
      case "proca:action:2": {
        // An action done by Supporter
        const action: ActionMessageV2 = actionOrEvent;
        const r = await crm.handleActionContact(action);
        if (crm.pause) {
          console.log("pause action...");
          await pause(10);
        }

        if (config.dryRun) {
          return false;
        }
        if (typeof r === "object" && "processed" in r) {
//          spin (count.ack + count.nack, "processed");
          return !!r.processed;
        }

//        spin (count.ack + count.nack, "bool processed");
        return !!r;
      }

      case "proca:event:2":
        {
          // Some other event
          const event: EventMessageV2 = actionOrEvent;

          // We are interested most in email status changes
          switch (event.eventType) {
            case "email_status": {
              // An email status update such as Double opt in or bounce
              if (crm.pause) {
//                console.log("pause email status...");
                await pause(3);
              }
              const r = await crm.handleEmailStatusChange(event);
              if (typeof r === "object" && "processed" in r)
                return !!r.processed;

              if (typeof r === "boolean") return r;
              return true;
              // ignore other eventsa
            }
          }
          if (crm.pause) {
            console.log("pause event...");
            await pause(3);
          }
          return false;
        }
        throw new Error("unknown type " + actionOrEvent.schema);
      // ignore other message types
    }
    if (crm.pause) {
      console.log("pause...");
      await pause(10);
    }
    return false;
  }, opts);
};
