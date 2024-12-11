import type { Message } from "../cleverreach";

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

export const formatAction = (message: Message, hasValues: any): Contact => {

   // do not overwrite 'quelle', first and lastname if there is a value
  const global: ContactInfo = {
    "quelle": hasValues?.quelle ? hasValues.quelle : message.campaign.title,
    "petition": message.campaign.title,
    "language": message.actionPage.locale,
    "phone": message.contact?.phone || "",
    "double_opt_in": "yes",
    "street": message.contact.street || "",
    "zip": message.contact.postcode || "",
    "lastname": hasValues?.lastname ? hasValues.lastname : message.contact.lastName || "",
    "firstname": hasValues?.firstname ? hasValues.firstname : message.contact.firstName,
    "country": message.contact.country || message.contact.area || "",
    "company": hasValues?.company ? hasValues?.company : message.action.customFields?.organisation?.toString() || "",
    "city": message.contact.locality || "",
    "last_changed": message.privacy.emailStatusChanged || ""
  }

  const attributes = {
    created_at: message.action.createdAt
  }

  return (
    {
      "email": message.contact.email,
      "source": message.tracking.location || "",
      "attributes": attributes,
      "global_attributes": global
    }
  )
};
