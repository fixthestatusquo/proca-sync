import type { ActionMessageV2 } from "@proca/queue";

interface AditionalAttributes {
  name: string;
  value: string;
}

export interface TrustAction {
  first_name: string;
  last_name?: string | null;
  address1?: any;
  zip_code?: string | null;
  location?: any;
  email: string;
  phone?: string | null;
  country?: string | null;
  message?: string | null;
  subscribe_newsletter: boolean;
  data_handling_consent: boolean;
  move_code: string;
  origin: string | null;
  created_at: string;
  confirmed_at: string;
  additional_attributes_attributes: AditionalAttributes[];
}

export interface Signature {
  petition_signature: TrustAction;
}

export interface Verification {
  petition_signature: VerificationParams;
}

interface VerificationParams {
  subscribe_newsletter: boolean;
  data_handling_consent: boolean;
}

export const handleConsent = (action: ActionMessageV2) => {
  return action.privacy.emailStatus !== "double_opt_in" &&
    !action.action.customFields.isSubscribed
    ? false
    : true;
};

export const formatAction = (
  queueAction: ActionMessageV2,
  moveCode: "string" | undefined,
) => {
  const postData = queueAction;
  if (!moveCode) moveCode = "AKT" + postData.campaign.externalId;
  const action: TrustAction = {
    first_name: postData.contact.firstName,
    last_name: postData.contact.lastName,
    zip_code: postData.contact.postcode,
    email: postData.contact.email,
    phone: postData.contact.phone,
    country: postData.contact.country,
    message: postData.contact.comment,
    subscribe_newsletter: postData.privacy.emailStatus === "double_opt_in",
    data_handling_consent: handleConsent(queueAction),
    move_code: moveCode,
    origin: postData.tracking?.location,
    created_at: postData.action.createdAt || "",
    confirmed_at: postData.privacy.givenAt || "",
    additional_attributes_attributes: [
      { name: "action_id", value: postData.actionId.toString() },
      { name: "petition_id", value: postData.actionPage.name },
      { name: "Aktion", value: moveCode },
    ],
  };

  if (postData.contact.address?.street)
    action.address1 = postData.contact.address.street;
  if (postData.contact.address?.locality)
    action.location = postData.contact.address.locality;

  for (const key in action) {
    const v = action[key as keyof TrustAction];
    if (v === undefined || v === null) {
      delete action[key as keyof TrustAction];
    }
  }
  const signature: Signature = { petition_signature: action };

  return signature;
};
