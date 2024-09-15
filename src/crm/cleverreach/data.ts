
import type { ActionMessage } from "../../crm";

type Contact = {
  'email': string;
  'source': string;
  "global_attributes": ContactInfo;
}

type Attributes = Record<'petition_URL' | 'created_at', string>

type ContactInfo = Record<
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
>;

export const formatAction = (message: ActionMessage): Contact => {
  const global: ContactInfo = {
    "petition": message.campaign.title,
    "quelle": message.actionPage.name,
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
    "city": message.contact.locallity || "",
    "last_changed": message.privacy.emailStatusChanged || ""
  }


  return (
    {
      "email": message.contact.email,
      "source": message.tracking.location || "",
      "global_attributes": global
    }
  )
};
