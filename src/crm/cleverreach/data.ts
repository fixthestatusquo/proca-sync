import type { Message } from "../../crm";

type Attributes = Record<'created_at', string>

type Contact = {
  'email': string;
  'source': string;
  'attributes': Attributes
  "global_attributes": ContactInfo;
}

type ContactInfo = Omit<
  Record<
    | 'petition'
    | 'quelle'
    | 'language'
    | 'phone'
    | 'double_opt_in'
    | 'street'
    | 'company'
    | 'zip'
    | 'lastname'
    | 'firstname'
    | 'country'
    | 'city'
    | 'last_changed',
    string
  >,
  'quelle'
> & Partial<Record<'quelle', string>>;

export const formatAction = (message: Message, update: boolean = false): Contact => {
  const global: ContactInfo = {
    "petition": message.campaign.title,
    "language": message.actionPage.locale,
    "phone": message.contact?.phone || "",
    "double_opt_in": "yes",
    "street": message.contact.street || "",
    "zip": message.contact.postcode || "",
    "lastname": message.contact.lastName || "",
    "firstname": message.contact.firstName,
    "country": message.contact.country || message.contact.area || "",
    "company": message.action.customFields?.organisation
      ? message.action.customFields?.organisation.toString()
      : "",
    "city": message.contact.locality || "",
    "last_changed": message.privacy.emailStatusChanged || ""
  }

  const attributes = {
    created_at: message.action.createdAt
  }

  // do not overwrite 'quelle'
  if (!update) global.quelle = message.campaign.title;

  return (
    {
      "email": message.contact.email,
      "source": message.tracking.location || "",
      "attributes": attributes,
      "global_attributes": global
    }
  )
};
