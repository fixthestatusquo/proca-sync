import { syncQueue, ActionMessageV2, EventMessageV2, ConsumerOpts } from "@proca/queue";
import { Configuration } from "./config";
import { CRM } from "./crm";

//import * as crm from './crm.debug';
let crm: any = {};
// TODO: set type
//

// Main listen loop which waits on new messages and handles them
export const pause = (time: number | undefined): Promise<any> => {
  const min = !time || time >= 7 ? 7 : time / 2;
  const max = time || 42; // wait between min and max
  time = Math.floor(Math.random() * (max - min + 1) + min) * 1000;
  console.log("waiting", time / 1000);
  return new Promise((resolve) => setTimeout(() => resolve(time), time));
};

export const listen = (config: Configuration, crm: CRM) => {
  const opts : ConsumerOpts = {tag: process.env.npm_package_name +"."+process.env.CRM};

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
        if (typeof r === "object" && "processed" in r) {
          return !!r.processed;
        }

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
                console.log("pause email status...");
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
