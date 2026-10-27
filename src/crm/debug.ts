import { writeFileSync } from "fs";
import _ from "lodash";
import {
  type ActionMessage,
  CRM,
  CRMType,
  type handleResult,
  type ProcaCampaign,
} from "../crm";

/*
 * A debug CRM that displays the messages and events in the log
 *
 */

class DebugCRM extends CRM {
  handleActionContact = async (
    message: ActionMessage,
  ): Promise<handleResult | boolean> => {
    const camp = await this.campaign(message.campaign);
    console.log("message", message.actionId, message.campaign?.title);
    return false;
  };

  fetchCampaign = async (campaign: ProcaCampaign): Promise<any> => {
    console.log("fake fetching campaign", campaign.name);
    return campaign;
  };
}

export default DebugCRM;
