"use strict";
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
exports.listen = void 0;
const queue_1 = require("@proca/queue");
const utils_1 = require("./utils");
//import * as crm from './crm.debug';
let crm = {};
// TODO: set type
//
const listen = (config, crm) => {
    let tag = "proca-sync." + process.env.CRM + "." + process.env.PROCA_ENV;
    const opts = { tag: tag };
    if (config.concurrency) {
        opts.concurrency = config.concurrency;
    }
    crm.count = queue_1.count;
    return (0, queue_1.syncQueue)(config.url, config.queue, (actionOrEvent) => __awaiter(void 0, void 0, void 0, function* () {
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
                const action = actionOrEvent;
                const r = yield crm.handleActionContact(action);
                if (crm.pause) {
                    console.log("pause action...");
                    yield (0, utils_1.pause)(10);
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
                    const event = actionOrEvent;
                    // We are interested most in email status changes
                    switch (event.eventType) {
                        case "email_status": {
                            // An email status update such as Double opt in or bounce
                            if (crm.pause) {
                                //                console.log("pause email status...");
                                yield (0, utils_1.pause)(3);
                            }
                            const r = yield crm.handleEmailStatusChange(event);
                            if (typeof r === "object" && "processed" in r)
                                return !!r.processed;
                            if (typeof r === "boolean")
                                return r;
                            return true;
                            // ignore other eventsa
                        }
                    }
                    if (crm.pause) {
                        console.log("pause event...");
                        yield (0, utils_1.pause)(3);
                    }
                    return false;
                }
                throw new Error("unknown type " + actionOrEvent.schema);
            // ignore other message types
        }
        if (crm.pause) {
            console.log("pause...");
            yield (0, utils_1.pause)(10);
        }
        return false;
    }), opts);
};
exports.listen = listen;
