import type { ActionMessage } from "../../crm";

export type GPAction = ActionMessage & { promo_code?: string };

export const formatAction = (queueAction: ActionMessage, config: any ) => {
  const data: GPAction = queueAction;
  if (data.action.customFields.promocode || data.action.customFields.promocodephone) {
    data.promo_code = data.contact?.phone
      ? data.action.customFields.promocodephone.toString() || ""
      : data.action.customFields.promocode.toString() || "";
  }
  else if (config?.component?.sync?.promoCode?.default ||
          config?.component?.sync?.promoCode?.phone) {
      data.promo_code = data.contact?.phone
      ? config.component.sync.promoCode.phone || ""
      : config.component.sync.promoCode.default || ""
  }
  return data;
};
