import type { Message } from "../cleverreach";

type Attributes = Record<'created_at', string>

type Contact = {
  'email': string;
  'source': string;
  'attributes': Attributes
  "global_attributes": ContactInfo;
}

type ContactInfo = (
  Omit<
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
  > & Partial<Record<'quelle', string>>
) & { [key: string]: string };


export const formatAction = (message: Message, hasValues: any, customLabel: string): Contact => {

    // do not overwrite 'quelle'
    // do not delete first and lastname if they exist in the old record but not it the message
  const global: ContactInfo = {
    "quelle": hasValues?.quelle ? hasValues.quelle : message.campaign.title,
    "petition": message.campaign.title,
    "language": message.actionPage.locale,
    "phone": message.contact?.phone || "",
    "double_opt_in": "yes",
    "street": message.contact.street || "",
    "zip": message.contact.postcode || "",
    "lastname": hasValues?.lastname && !message.contact.lastName ? hasValues.lastname : message.contact.lastName || "",
    "firstname": message.contact.firstName,
    "country": message.contact.country || message.contact.area || "",
    "company": hasValues?.company && !message.contact.company ? hasValues.company : message.action.customFields?.organisation?.toString() || "",
    "city": message.contact.locality || "",
    "last_changed": message.privacy.emailStatusChanged || "",
    // each campaign should have custom field with the name date (6 figures) and campaign title
    [customLabel]: message.campaign.title
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
