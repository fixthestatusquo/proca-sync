
import {syncQueue, ActionMessageV2, EventMessageV2} from '@proca/queue'
import {Configuration} from './config'

//import * as crm from './crm.debug';
let crm : any = {};
// TODO: set type
//
// Main listen loop which waits on new messages and handles them
export const pause = (time : number | undefined): Promise <any>=> {
      const min = (!time || time >= 7) ? 7: time /2; 
      const max = time || 42; // wait between min and max
      time = Math.floor(Math.random() * (max - min + 1) + min) *1000;
      console.log("waiting",time/1000);
    return new Promise(resolve => setTimeout(() => resolve(time), time));
}

export function listen(config : Configuration)  {
  return syncQueue(config.url, config.queue, async (actionOrEvent) => {
    if (!process.env.CRM) {
      console.error("you need to set CRM= in your .env to match a class in src/crm/{CRM}.ts")
      throw new Error ("missing process.env.CRM");
    }
    crm = await import("./crm/"+process.env.CRM);
    if (crm.default) {
      crm = crm.default;
    } else {
      throw new Error (process.env.CRM +" missing export default new YourCRM()");
    }
    // Handle a new message
    //
    // Throw an error if you want to NACK the message and make it re-deliver again.
    // Return nothing to have the message ACKed (removed from queue)
    //
    // What is this?
    switch (actionOrEvent.schema) {
        case 'proca:action:2': {
          // An action done by Supporter
          const action : ActionMessageV2 = actionOrEvent
          const r= await crm.handleActionContact (action)
          console.log("r",r);
          return r;
        }

        case 'proca:event:2': {
          // Some other event
          const event : EventMessageV2 = actionOrEvent

          // We are interested most in email status changes
          switch (event.eventType) {
              case 'email_status': {
                // An email status update such as Double opt in or bounce
                return crm.handleEmailStatusChange(event)
              }
              // ignore other eventsa
          }
          return false;
        }
        throw new Error ("unknown type " + actionOrEvent.schema);
        // ignore other message types
    }
    if (config.pause) {
      console.log("pause...");
      pause(6);
    }

  });
}

export async function handleEmailStatusChange(event : EventMessageV2) {
  // If we want to detect supporter clicking on opt in link in email, we can do this here
  // this happens after the action was done, timeline:
  //
  // 1. Supporter signs form
  // 2. Action message arrives, Signature is added
  // 3. Supporter receives an email (click button to subscribe)
  // 4. Supporter clicks this link
  // 5. Event message arrives, We set them as subscribed
  // OR:
  // 3. Supporter email bounces (invalid email)
  // 4. Event message arrives, We set Contact as bounced

  if (event.eventType === 'email_status') { // handle only email status updates
    // check if we have that contact in CRM
    const cont = await crm.getContactByEmail(event.supporter.contact.email)

    // if not, ignore the event about non-existing contact
    if (!cont) return;

    switch (event.supporter.privacy.emailStatus) {
        // do this if you want to change the subscription based on opt in in email
        // the timestamp of this opt in is in event.supporter.privacy.emailStatusChanged
        case 'double_opt_in': {
          console.log(`Double opt in from ${event.supporter.contact.email}`)

          await crm.setSubscribed(cont.id, true)
          break;
        }

        // Different kinds of problems with email delivery:
        case 'bounce':  // bounce
        case 'blocked': // pre-blocked by our transactional email provider (malformed etc)
        case 'spam':    // supporter clicked "this is spam" on our email
        case 'unsub': { // supporter clicked "unsubscribe" on our email (if provided by Gmail etc)
          console.log(`${event.supporter.privacy.emailStatus} from ${event.supporter.contact.email}`)

          await crm.setBounced(cont.id, true)
          break
        }

    }
  }
}
