import {
  CRM,
  CRMType,
  type ActionMessage,
  type handleResult,
  type ProcaCampaign,
  type ProcaWidget,
} from "../crm";
import { formatAction } from "./gpdedatahub/data";
import { postAction } from "./gpdedatahub/client";
import { deepMerge } from "../utils";
import {
  fetchCampaign as procaCampaign,
  fetchWidget as procaWidget,
} from "../proca";

class gpdedatahubCRM extends CRM {
  constructor(opt: object) {
    super(opt);
    this.crmType = CRMType.DoubleOptIn;
  }

  fetchCampaign = async (campaign: ProcaCampaign): Promise<any> => {
    const r = await procaCampaign(campaign.id);
    return r;
  };

  fetchWidget = async (widget: ProcaWidget): Promise<any> => {
    return procaWidget(widget.id);
  };
  // CRM will take double actions and respond with 200 status
  handleContact = async (
    message: ActionMessage,
  ): Promise<handleResult | boolean> => {
    const camp = await this.campaign(message.campaign);
    console.log(message.tracking);
    if (message.tracking.content && camp.config.import?.includes("ABTest")) {
      const widget = await this.widget(message.actionPage);

      const variant = widget.config.component?.test?.find(
        (d) => d.name === message.tracking.content,
      );
      if (variant)
        camp.config = deepMerge(camp.config, { component: variant.component });
      else
        console.error("utm_content isn't a variant in config.component.test");
      console.log(camp.config);
    }
    console.log(
      "Taken from the queue",
      message.action.id,
      "test:",
      message.action.testing,
    );
    const actionPayload = formatAction(message, camp.config);

    if (this.verbose) {
      console.log(actionPayload);
    }

    const status = await postAction(actionPayload);

    if (status === 200) {
      console.log(`Action ${message.actionId} sent`);
      return true;
    } else {
      console.log(`Action ${message.actionId} not sent`);
      return false;
    }
  };
}

export default gpdedatahubCRM;
