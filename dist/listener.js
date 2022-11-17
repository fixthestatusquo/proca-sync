"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleEmailStatusChange = exports.handleNewAction = exports.listen = void 0;
const queue_1 = require("@proca/queue");
//import * as crm from './crm.debug';
let crm = {};
// TODO: set type
//
// Main listen loop which waits on new messages and handles them
function listen(config) {
    return (0, queue_1.syncQueue)(config.url, config.queue, (actionOrEvent) => __awaiter(this, void 0, void 0, function* () {
        crm = yield Promise.resolve().then(() => __importStar(require("./crm.debug")));
        console.log("crm", crm);
        // Handle a new message
        //
        // Throw an error if you want to NACK the message and make it re-deliver again.
        // Return nothing to have the message ACKed (removed from queue)
        //
        // What is this?
        switch (actionOrEvent.schema) {
            case 'proca:action:2': {
                // An action done by Supporter
                const action = actionOrEvent;
                yield handleNewAction(action);
                break;
            }
            case 'proca:event:2': {
                // Some other event
                const event = actionOrEvent;
                // We are interested most in email status changes
                switch (event.eventType) {
                    case 'email_status': {
                        // An email status update such as Double opt in or bounce
                        yield handleEmailStatusChange(event);
                        break;
                    }
                    // ignore other events
                }
                break;
            }
            // ignore other message types
        }
        // show what we have now
    }));
}
exports.listen = listen;
// Ok lets add a new signature!
function handleNewAction({ action, contact, campaignId, campaign, privacy }) {
    return __awaiter(this, void 0, void 0, function* () {
        //crm.showContacts()
        console.log(`Action type ${action.actionType} from ${contact.email}`);
        // we only want register action type, and not share and so on
        if (action.actionType !== 'register')
            return;
        // first, lets see if the campaign is in the CRM
        // We fetch it by id because the title could be changed in Proca by a campaigner
        const camp = yield crm.getCampaignByExternalId(campaignId);
        // this is campaign id in our CRM
        let campId;
        if (camp) {
            campId = camp.id;
        }
        else {
            // Campaign does not exist, we need to create it
            // In proca campaign has short name (alphanumeric) and longer title (human friendly)
            // our CRM only stores one name, we decide to use the human readable
            campId = yield crm.addCampaign(campaign);
        }
        // we know the campaign id now, lets also upsert the contact
        const cont = yield crm.getContactByEmail(contact.email);
        let contactId;
        if (cont) {
            // found contact, get id
            contactId = cont.id;
        }
        else {
            // creating a new contact.
            // Our CRM only stores these PII
            // Depending on the widget and campaign, the contact can have following fields:
            //
            // contact.email
            // contact.firstName
            // contact.lastName
            // contact.postcode
            // contact.country
            // contact.address.street
            // contact.address.street_number
            // contact.address.locality
            // contact.address.region
            contactId = yield crm.addContact(contact);
        }
        // Lets manage the subscription if we are honoring opt in under form
        if (privacy.optIn) {
            yield crm.setSubscribed(contactId, privacy.optIn);
        }
        // Lets now add a signature
        yield crm.addAction(contactId, campId);
        // and we are done
    });
}
exports.handleNewAction = handleNewAction;
function handleEmailStatusChange(event) {
    return __awaiter(this, void 0, void 0, function* () {
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
            const cont = yield crm.getContactByEmail(event.supporter.contact.email);
            // if not, ignore the event about non-existing contact
            if (!cont)
                return;
            switch (event.supporter.privacy.emailStatus) {
                // do this if you want to change the subscription based on opt in in email
                // the timestamp of this opt in is in event.supporter.privacy.emailStatusChanged
                case 'double_opt_in': {
                    console.log(`Double opt in from ${event.supporter.contact.email}`);
                    yield crm.setSubscribed(cont.id, true);
                    break;
                }
                // Different kinds of problems with email delivery:
                case 'bounce': // bounce
                case 'blocked': // pre-blocked by our transactional email provider (malformed etc)
                case 'spam': // supporter clicked "this is spam" on our email
                case 'unsub': { // supporter clicked "unsubscribe" on our email (if provided by Gmail etc)
                    console.log(`${event.supporter.privacy.emailStatus} from ${event.supporter.contact.email}`);
                    yield crm.setBounced(cont.id, true);
                    break;
                }
            }
        }
    });
}
exports.handleEmailStatusChange = handleEmailStatusChange;
