import type { ActionMessageV2, EventMessageV2 } from "@proca/queue";

export const isActionSyncable = (
  action: ActionMessageV2,
  onlyOptIn: boolean,
) => {
  return action.privacy.withConsent && (action.privacy.optIn || !onlyOptIn);
};

export const listName = (action: ActionMessageV2, listPerLang = false) => {
  let c = action.campaign.name;
  if (listPerLang) c = c + ` ${action.actionPage.locale}`;
  if (action.privacy.optIn) {
    return `${c} (opt-in)`;
  } else {
    return `${c} (opt-out)`;
  }
};

export interface Contact {
  email_address: string;
  status_if_new?:
    | "pending"
    | "subscribed"
    | "unsubscribed"
    | "transactional"
    | "cleaned";
  status?:
    | "pending"
    | "subscribed"
    | "unsubscribed"
    | "transactional"
    | "cleaned";
  language: string;
  timestamp_signup: string;
  timestamp_opt?: string;
  merge_fields: {
    FNAME: string;
    LNAME?: string;
    ADDRESS?: {
      country: string;
      state: string;
      zip: string;
      city: string;
      addr1: string;
    };
    [propname: string]: any;
  };
  tags: string[];
  interests?: any;
}

export interface ContactSubscription {
  email_address: string;
  status:
    | "pending"
    | "subscribed"
    | "unsubscribed"
    | "transactional"
    | "cleaned";
  timestamp_opt?: string;
  interests?: any;
}

export const actionToContactRecord = (
  action: ActionMessageV2,
  mergeFields: any,
  doubleOptIn = false,
  optOutAsTransactional = false,
): Contact => {
  const r: Contact = {
    email_address: action.contact.email,
    language: action.actionPage.locale,
    timestamp_signup: action.action.createdAt,
    merge_fields: {
      FNAME: action.contact.firstName,
    },
    tags: ["proca"],
  };

  if (action.contact.lastName) r.merge_fields.LNAME = action.contact.lastName;

  // address fields
  if (action.contact.country) {
    r.merge_fields.ADDRESS = {
      country: action.contact.country || "",
      state: action.contact.address?.region || "",
      zip: action.contact.postcode || "",
      city: action.contact.locality || "",
      addr1: action.contact.street || "",
    };
  }

  if (mergeFields) {
    // custom naming of mergefields, so set in the environment MERGE_FIELDS=...
    for (const key in mergeFields) {
      if (action.contact[key])
        r.merge_fields[mergeFields[key]] = action.contact[key];
    }
  }
  if (action.campaign.externalId) {
    r.tags.push(action.campaign.externalId.toString());
    r.tags.push(action.actionPage.name);
    r.merge_fields.SOURCE = action.campaign.externalId;
  } else {
    r.tags.push(action.campaign.name);
    r.merge_fields.SOURCE = action.actionPage.name;
  }

  // consents
  // explicit DOI = must be subscribe
  if (action.privacy.emailStatus === "double_opt_in") {
    r.status_if_new = "subscribed";
    // bouncing - cleaned / banned
  } else if (action.privacy.emailStatus !== null) {
    r.status_if_new = "cleaned";
  } else {
    // else, lets infer:
    if (action.privacy.optIn) {
      // we have some opt in
      if (doubleOptIn) {
        // id DOI, wait
        r.status_if_new = "pending";
      } else {
        // otherwise it's ok
        r.status_if_new = "subscribed";
      }
    } else {
      // soft opt-out - 1 more mail to send
      if (optOutAsTransactional) {
        r.status_if_new = "transactional";
      } else {
        // no means no
        r.status_if_new = "unsubscribed";
      }
    }
  }
  return r;
};

export const emailChangedToContactRecord = (
  event: EventMessageV2,
): ContactSubscription | null => {
  const emailStatus = event.supporter.privacy.emailStatus;
  const emailStatusChanged = event.supporter.privacy.emailStatusChanged;
  if (emailStatus === "double_opt_in" && emailStatusChanged) {
    return {
      email_address: event.supporter.contact.email,
      status: "subscribed",
      timestamp_opt: emailStatusChanged,
    };
  } else if (
    emailStatus === "bounce" ||
    emailStatus === "blocked" ||
    emailStatus === "unsub" ||
    emailStatus === "spam"
  ) {
    return {
      email_address: event.supporter.contact.email,
      status: "cleaned",
    };
  }

  return null;
};
