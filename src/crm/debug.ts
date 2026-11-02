import {
  type ActionMessage,
  CRM,
  type handleResult,
  type ProcaCampaign,
} from "../crm.ts";

/*
 * A debug CRM that displays the messages and events in the log
 *
 */

class DebugCRM extends CRM {
  handleActionContact = async (
    message: ActionMessage,
  ): Promise<handleResult | boolean> => {
    const _camp = await this.campaign(message.campaign);
    console.log("message", message.actionId, message.campaign?.title);
    return false;
  };

  fetchCampaign = async (campaign: ProcaCampaign): Promise<any> => {
    console.log("fake fetching campaign", campaign.name);
    return campaign;
  };
}

export default DebugCRM;
