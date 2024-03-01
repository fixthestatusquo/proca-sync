import type { ActionMessage } from "../../crm";

export type GPAction = ActionMessage & { promo_code?: string };

export const formatAction = (queueAction: ActionMessage, config: any ) => {
  const data: GPAction = queueAction;
  if (config?.component?.sync?.promoCode?.default.length > 0 || config?.component?.sync?.promoCode?.phone.length > 0) {
    data.promo_code = data.contact?.phone
      ? config.component.sync.promoCode.phone || ""
      : config.component.sync.promoCode.default || ""
  }
  return data;
};
