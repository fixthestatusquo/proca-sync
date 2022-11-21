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
 * A debug CRM that saves the data into the data folder
 *
 */

// TODO export from proca/queue
type ContactID = string | number | undefined;


class DebugCRM extends CRM {

  handleActionContact = async (
    message: ActionMessage
  ): Promise<handleResult | void> => {
    const camp = await this.campaign(message.campaign);
    console.log("message",message);
    return { processed: true };
  };

  fetchCampaign = async (campaign: ProcaCampaign): Promise<any> => {
    console.log("fetching campaign" + campaign.name);
    return campaign;
  };
}

export default new DebugCRM();
