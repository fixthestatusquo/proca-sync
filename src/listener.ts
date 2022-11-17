
import {syncQueue, ActionMessageV2, EventMessageV2} from '@proca/queue'
import {Configuration} from './config'

//import * as crm from './crm.debug';
let crm : any = {};
// TODO: set type
//
// Main listen loop which waits on new messages and handles them
export function listen(config : Configuration)  {
  return syncQueue(config.url, config.queue, async (actionOrEvent) => {
  crm = await import("./crm/"+process.env.CRM);
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
          await handleNewAction(action)

          break
        }

        case 'proca:event:2': {
          // Some other event
          const event : EventMessageV2 = actionOrEvent

          // We are interested most in email status changes
          switch (event.eventType) {
              case 'email_status': {
                // An email status update such as Double opt in or bounce
                await handleEmailStatusChange(event)
                break
              }
              // ignore other events
          }

          break
        }
        // ignore other message types
    }

    // show what we have now
  });
}

// Ok lets add a new signature!
export async function handleNewAction({action, contact, campaignId, campaign, privacy} : ActionMessageV2) {
//crm.showContacts()

  console.log(action,contact,campaign, privacy);
  console.log(`Action type ${action.actionType} from ${contact.email}`)
  // we only want register action type, and not share and so on
  if (action.actionType !== 'register') return

  let campId = await crm.getCampaign(campaign);
  // this is campaign id in our CRM

  if (!!campId) {
    // Campaign does not exist, we need to create it
    // In proca campaign has short name (alphanumeric) and longer title (human friendly)
    // our CRM only stores one name, we decide to use the human readable
    campId = await crm.addCampaign(campaign)
  }

  // we know the campaign id now, lets also upsert the contact

  const cont = await crm.getContactByEmail(contact.email)
  let contactId : number

  if (cont) {
    // found contact, get id
    contactId = cont.id
  } else {
    contactId = await crm.addContact(contact)
  }

  // Lets manage the subscription if we are honoring opt in under form
  if (privacy.optIn) {
    await crm.setSubscribed(contactId, privacy.optIn)
  }

  // Lets now add a signature
  await crm.addAction(contactId, campId)

  // and we are done
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
