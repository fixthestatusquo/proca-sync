import _ from "lodash";
import {
  CRM,
  CRMType,
  ActionMessage,
  handleResult,
  ProcaCampaign,
} from "../crm";
import { writeFileSync } from "fs";

/*
 * A debug CRM that displays the messages and events in the log
 *
 */

class DebugCRM extends CRM {


  handleActionContact = async (
    message: ActionMessage
  ): Promise<handleResult | boolean> => {
    const camp = await this.campaign(message.campaign);
    console.log("message",message.actionId, message.campaign?.title);
console.log("process X",r);
    return false;
  };

  fetchCampaign = async (campaign: ProcaCampaign): Promise<any> => {
    console.log("fake fetching campaign", campaign.name);
    return campaign;
  };
}

export default DebugCRM;
