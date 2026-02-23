
var __awaiter = (this && this.__awaiter) || ((thisArg, _arguments, P, generator) => {
    function adopt(value) { return value instanceof P ? value : new P((resolve) => { resolve(value); }); }
    return new (P || (P = Promise))((resolve, reject) => {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
});
Object.defineProperty(exports, "__esModule", { value: true });
const crm_1 = require("../crm");
const fs_1 = require("fs");
const writeJson = (data, name, folder) => {
    let path = "./data/";
    if (folder)
        path = path + folder + "/";
    (0, fs_1.writeFileSync)(path + name + ".json", JSON.stringify(data, null, 2));
};
class FileCRM extends crm_1.CRM {
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
            const camp = yield this.campaign(message.campaign);
            writeJson(message, message.action.actionType + "_" + message.actionId);
            return { processed: true };
        });
        this.fetchCampaign = (campaign) => __awaiter(this, void 0, void 0, function* () {
            writeJson(campaign, campaign.name, "campaign");
            return campaign;
        });
    }
}
exports.default = FileCRM;
