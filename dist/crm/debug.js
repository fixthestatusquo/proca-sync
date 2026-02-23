
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
/*
 * A debug CRM that displays the messages and events in the log
 *
 */
class DebugCRM extends crm_1.CRM {
    constructor() {
        super(...arguments);
        this.handleActionContact = (message) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            const camp = yield this.campaign(message.campaign);
            console.log("message", message.actionId, (_a = message.campaign) === null || _a === void 0 ? void 0 : _a.title);
            return false;
        });
        this.fetchCampaign = (campaign) => __awaiter(this, void 0, void 0, function* () {
            console.log("fake fetching campaign", campaign.name);
            return campaign;
        });
    }
}
exports.default = DebugCRM;
