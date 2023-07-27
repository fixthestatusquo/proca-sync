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
exports.listen = exports.pause = void 0;
const queue_1 = require("@proca/queue");
//import * as crm from './crm.debug';
let crm = {};
// TODO: set type
//
// Main listen loop which waits on new messages and handles them
const pause = (time) => {
    const min = !time || time >= 7 ? 7 : time / 2;
    const max = time || 42; // wait between min and max
    time = Math.floor(Math.random() * (max - min + 1) + min) * 1000;
    console.log("waiting", time / 1000);
    return new Promise((resolve) => setTimeout(() => resolve(time), time));
};
exports.pause = pause;
const listen = (config, crm) => {
    const opts = { tag: process.env.npm_package_name + "." + process.env.CRM };
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
                    yield (0, exports.pause)(10);
                }
                if (typeof r === "object" && "processed" in r) {
                    return !!r.processed;
                }
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
                                console.log("pause email status...");
                                yield (0, exports.pause)(3);
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
                        yield (0, exports.pause)(3);
                    }
                    return false;
                }
                throw new Error("unknown type " + actionOrEvent.schema);
            // ignore other message types
        }
        if (crm.pause) {
            console.log("pause...");
            yield (0, exports.pause)(10);
        }
        return false;
    }), opts);
};
exports.listen = listen;
