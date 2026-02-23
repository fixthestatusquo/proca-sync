
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
const client_1 = require("./magnews/client");
/*
 *

interface CRM {
  fetchCampaigns = () : Promise<void>
}
*/
class MagNewsCRM extends crm_1.CRM {
    constructor(opt) {
        super(opt);
        this.handleContact = (message) => __awaiter(this, void 0, void 0, function* () {
            const camp = yield this.campaign(message.campaign);
            const member = this.actionToContactRecord(message, camp);
            const r = yield (0, client_1.addContact)(this.clientToken, member);
            if (!r) {
                //not sure what to do
                return { processed: true };
            }
            console.log(`added ${member.values.EMAIL} to MagNews list`);
            return { processed: true };
        });
        this.actionToContactRecord = (action, camp) => {
            const cv = {
                EMAIL: action.contact.email,
                NAME: action.contact.firstName,
                SURNAME: action.contact.lastName,
                CELL: action.contact.phone,
                WBST_AUDIENCE: camp.audience,
                NOME_UTENTE: action.contact.email + "_" + camp.audience,
                UTM_SOURCE: action.tracking.source,
                UTM_MEDIUM: action.tracking.medium,
                UTM_CAMPAIGN: action.tracking.campaign,
                UTM_CONTENT: action.tracking.content,
            };
            const co = {
                iddatabase: this.iddatabase,
                sendemailonactions: "insert,restore,update",
                sendemail: false,
                usenewsletterastemplate: true,
                idnewsletter: camp.idnewsletter,
                denyupdatecontact: false,
                forceallowrestorecontactonupdate: true,
                denysubscribeunsubscribedcontact: false,
            };
            const r = {
                values: cv,
                options: co,
            };
            return r;
        };
        this.fetchCampaign = (campaign) => __awaiter(this, void 0, void 0, function* () {
            try {
                // todo: fetch the campaign/audience/newsletterid from the server - needed if more than one campaign
                return { audience: this.audience, idnewsletter: this.idnewsletter };
            }
            catch (e) {
                console.log(e);
            }
        });
        this.crmType = crm_1.CRMType.OptIn; // will only process opt-in contacts, the other events are filtered before the class
        this.clientToken = (0, client_1.setClientToken)();
        this.iddatabase = 6;
        this.idnewsletter = 1811;
        this.audience = "ecipel"; // single "campaign" mapping, TODO: implement fetchCampaign when more than one is needed
    }
}
exports.default = MagNewsCRM;
