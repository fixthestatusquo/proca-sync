import {
  syncQueue,
  type ActionMessageV2,
  type EventMessageV2,
  type ConsumerOpts,
  count,
  type CampaignUpdatedEventMessage,
} from "@proca/queue";
import type { Configuration } from "./config";
import type { CRM } from "./crm";
import { pause } from "./utils";
const crm: any = {};

export const listen = (config: Configuration, crm: CRM) => {
  const tag = "proca-sync." + process.env.CRM + "." + process.env.PROCA_ENV;
  const opts: ConsumerOpts = { tag: tag };
  if (config.concurrency) {
    opts.concurrency = config.concurrency;
  }

  crm.count = count;

  return syncQueue(
    config.url,
    config.queue,
    async (actionOrEvent) => {
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

        case "proca:event:2": {
          // Some other event
          const event: EventMessageV2 | CampaignUpdatedEventMessage =
            actionOrEvent;

          // we are processing two types of events "email_status" and "campaign_updated"
          // We are interested in email status changes
          // other types mosly need to be processed to be removed from the queue
          if (
            event.eventType === "email_status" ||
            event.eventType === "campaign_updated"
          ) {
            if (crm.pause) {
              await pause(3);
            }
            const r = await crm.handleEmailStatusChange(event);
            if (typeof r === "object" && "processed" in r) return !!r.processed;

            if (typeof r === "boolean") return r;
            return true;
          } else {
            if (crm.pause) {
              console.log("pause event...");
              await pause(3);
            }
            throw new Error("Unknown event type: " + event.eventType);
          }
        }
        default: {
          if (crm.pause) {
            console.log("pause...");
            await pause(10);
          }
          throw new Error("Unknown message type: " + actionOrEvent.schema);
        }
      }
    },
    opts,
  );
};
