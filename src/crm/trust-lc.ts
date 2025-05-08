import {
  CRM,
  CRMType,
  ActionMessage,
  handleResult,
  ProcaCampaign,
} from "../crm";
import { formatAction, handleConsent } from "./trust-lc/data";
import { postAction, verification } from "./trust-lc/client";
import { fetchCampaign as procaCampaign }  from '../proca';


class TrustCRM extends CRM {
  constructor(opt: {}) {
    super(opt);
    this.crmType = CRMType.DoubleOptIn;
  }

  fetchCampaign = async (campaign: ProcaCampaign): Promise<any> => {
    const r = await procaCampaign (campaign.id);
    return r;
  }

  handleContact = async (
    message: ActionMessage
  ): Promise<handleResult | boolean> => {
    console.log("Taken from queue", message.action.id)
    const campaign = await this.fetchCampaign(message.campaign);
    const actionPayload = formatAction(message, campaign?.config?.component?.sync?.moveCode);
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
      console.log("Verified", "data:", "actionId:", message.actionId, "moveCode:",actionPayload.petition_signature.move_code || "no moveCode");
      return true;
    } else if (data.alreadyProcessed) {
      console.log("Already processed", "data:", data, "action:", message);
      return true;
    } else {
      console.log("no verification token", "data:", data, "action:", message)
      return false;
    }
  };
};

export default TrustCRM;
