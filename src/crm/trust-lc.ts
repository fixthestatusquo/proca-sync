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
    this.crmType = CRMType.DoubleOptIn;
  }

  handleContact = async (
    message: ActionMessage
  ): Promise<handleResult | boolean> => {
    console.log("Taken from queue", message.action.id)
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

      console.log("Verified", verified)

      return true;
    } else if (data.alreadyProcessed) {
      console.log("Already processed", "data:", data, "action:", message);
      return true;
    } else {
      console.log("no verification token", "data:", data, "action:", message)
      return false;
    }
  };

}

export default TrustCRM;
