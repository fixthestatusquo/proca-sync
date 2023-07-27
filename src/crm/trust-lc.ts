import {
  CRM,
  CRMType,
  ActionMessage,
  handleResult,
  ProcaCampaign,
} from "../crm";
import { writeFileSync } from "fs";
import { formatAction, handleConsent } from "./trust-lc/data";
import { postAction, verification } from "./trust-lc/client";

/*
 * A debug CRM that displays the messages and events in the log
 *
 */

class TrustCRM extends CRM {
  constructor(opt: {}) {
    super(opt);
    this.crmType = CRMType.OptIn;
  }

  handleContact = async (
    message: ActionMessage
  ): Promise<handleResult | boolean> => {
    const camp = await this.campaign(message.campaign);
    const actionPayload = formatAction(message);
    if (this.verbose) {
      console.log(actionPayload);
    }
    const verificationPayload = {
      petition_signature: {
        subscribe_newsletter:
          actionPayload.petition_signature.subscribe_newsletter,
        data_handling_consent: handleConsent(message),
      },
    };
    const data = await postAction(actionPayload);
    if (data.petition_signature?.verification_token) {
      const verified = await verification(
        data.petition_signature.verification_token,
        verificationPayload
      );
      return true;
    } else {
      console.error("error", data);
      return false;
    }

    return false;
  };

  fetchCampaign = async (campaign: ProcaCampaign): Promise<any> => {
    console.log("fake fetching campaign", campaign.name);
    return campaign;
  };
}

export default TrustCRM;
