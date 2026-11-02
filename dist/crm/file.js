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
const node_fs_1 = require("node:fs");
const crm_ts_1 = require("../crm.js");
/*
 * A debug CRM that saves the data into the data folder
 *
 */
// TODO export from proca/queue
const writeJson = (data, name, folder) => {
    let path = "./data/";
    if (folder)
        path = `${path + folder}/`;
    (0, node_fs_1.writeFileSync)(`${path + name}.json`, JSON.stringify(data, null, 2));
};
class FileCRM extends crm_ts_1.CRM {
    constructor(opt) {
        super(opt);
        /*
      getContactByEmail = async (email : string) : Promise<Contact | undefined> => {
        return undefined;
      }
      
      
      addContact = async (contact: Contact ) => {
        writeJson(contact,contact.email,"contact");
        console.log(contact);
        return 0;
      }
      
      setSubscribed = async (id : number, subscribed:boolean) => {
        console.log(id,subscribed);
      }
      
      setBounced = async (id : number, bounced:boolean) => {
        console.log(id,bounced);
      }
      */
        this.handleActionContact = (message) => __awaiter(this, void 0, void 0, function* () {
            yield this.campaign(message.campaign);
            writeJson(message, `${message.action.actionType}_${message.actionId}`);
            return { processed: true };
        });
        this.fetchCampaign = (campaign) => __awaiter(this, void 0, void 0, function* () {
            writeJson(campaign, campaign.name, "campaign");
            return campaign;
        });
    }
}
exports.default = FileCRM;
