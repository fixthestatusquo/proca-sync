import type { ActionMessage } from "../../crm";

export type GPAction = ActionMessage & { promo_code?: number };

export const formatAction = (queueAction: ActionMessage ) => {
  const data: GPAction = queueAction;
  data.promo_code = data.contact?.phone ? 406750 : 406749;
  return data;
};
