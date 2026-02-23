import type { ActionMessageV2, EventMessageV2 } from "@proca/queue";

//                                              allow custom fields vvv
export interface ContactAttributes
  extends Record<string, string | boolean | undefined> {
  Email: string;
  FirstName: string;
  LastName?: string;
  Phone?: string;
  MailingCountry?: string;
  MailingPostalCode?: string;
  EmailBouncedReason?: string;
  EmailBouncedDate?: string;
}

export interface LeadAttributes
  extends Record<string, string | boolean | undefined> {
  Email: string;
  FirstName: string;
  LastName?: string;
  Phone?: string;
  CountryCode: string;
  PostalCode?: string;
  Company: string;
  EmailBouncedReason?: string;
  EmailBouncedDate?: string;
}

export const isActionSyncable = (action: ActionMessageV2) => {
  return action.privacy.withConsent && action.privacy.optIn;
};

export type RecordOpts = {
  language?: string;
  doubleOptIn?: boolean;
  optInField?: string;
  defaultLastName?: string;
};


export const actionToContactRecord = (
  action: ActionMessageV2,
  opts: RecordOpts,
): ContactAttributes => {
  const c: ContactAttributes = {
    FirstName: action.contact.firstName,
    LastName: action.contact.lastName || opts.defaultLastName,
    Email: action.contact.email,
    Phone: action.contact.phone,
    MailingCountryCode: action.contact.country,
    MailingPostalCode: action.contact.postcode,
  };

  determineOptIn(c, action.privacy, opts);

  if (opts.language) {
    c[opts.language] = action.actionPage.locale;
  }

  return c;
};

export const actionToLeadRecord = (
  action: ActionMessageV2,
  opts: RecordOpts,
): LeadAttributes => {
  const c: LeadAttributes = {
    FirstName: action.contact.firstName,
    LastName: action.contact.lastName || opts.defaultLastName,
    Email: action.contact.email,
    Phone: action.contact.phone,
    //Country: countryName(action.contact.country),
    CountryCode: action.contact.country,
    PostalCode: action.contact.postcode,
    Company: "[not provided]",
    LeadSource: action.campaign.title,
  };

  determineOptIn(c, action.privacy, opts);
  if (opts.language) {
    c[opts.language] = action.actionPage.locale;
  }

  return c;
};

export const determineOptIn = (
  r: LeadAttributes | ContactAttributes,
  privacy: ActionMessageV2["privacy"],
  opts: RecordOpts,
) => {
  let optIn = false;
  if (opts.optInField) {
    // it's always optin, the optout have been filtered out already
    r[opts.optInField] = true;
    return;
  }
  // consents
  // explicit DOI = must be subscribe
  if (privacy.emailStatus === "double_opt_in") { //deadling with doi
    optIn = true;
    // bouncing - cleaned / banned
  } else if (privacy.emailStatus !== null) {
    r.EmailBouncedReason = privacy.emailStatus;
    if (privacy.emailStatusChanged)
      r.EmailBouncedDate = privacy.emailStatusChanged;
  }
  if (privacy.optIn && !opts.doubleOptIn) {//regular optin
    optIn = true;
  }

  console.log("optin", optIn, opts.optInField);
  if (!opts.optInField) {
    console.error("you need an optInField");
    //   return;
  }
  if (opts.optInField) {
    r[opts.optInField] = optIn;
  }
  process.exit(1);
};

export interface EmailStatusAttributes {
  Email: string;
  EmailBouncedReason?: string;
  EmailBouncedDate?: string;
}

export const emailChangedToContactRecord = (
  event: EventMessageV2,
  optInField: string,
): (EmailStatusAttributes & Record<string, string | boolean>) | null => {
  const emailStatus = event.supporter.privacy.emailStatus;
  const emailStatusChanged = event.supporter.privacy.emailStatusChanged;
  if (emailStatus === "double_opt_in" && emailStatusChanged) {
    const r: EmailStatusAttributes & Record<string, string | boolean> = {
      Email: event.supporter.contact.email,
    };
    r[optInField] = true;
    return r;
  } else if (
    emailStatusChanged &&
    (emailStatus === "bounce" ||
      emailStatus === "blocked" ||
      emailStatus === "unsub" ||
      emailStatus === "spam")
  ) {
    const r = {
      Email: event.supporter.contact.email,
      EmailBouncedReason: emailStatus,
      EmailBouncedDate: emailStatusChanged,
    };
    return r;
  }

  return null;
};
