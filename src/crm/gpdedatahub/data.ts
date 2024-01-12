import type { ActionMessage } from "../../crm";

export interface GPAction {
  id: number;
  form_type: string;
  "Datum": string;
  "Vorname": string;
  "Nachname": string | null;
  "Geburtsjahr": string | null;
  "Strasse+Nr": string | null;
  "PLZ": string | null;
  "Ort": string | null;
  "Telefonnummer(Vorwahl+Durchwahl)"?: string | null;
  "E-Mail-Adresse*": string;
  "Werbecode": number;
  "NewsletterDOI": string;
  "Submit_timestamp": string | null;
  iso?: string;
  origin?: string;
}


export const formatAction = (queueAction: ActionMessage) => {
  const data = queueAction;
  const action: GPAction = {
    id: data.actionId,
    form_type: data.actionPage.name,
    "Datum": data.action.createdAt,
    "Vorname": data.contact.firstName,
    "Nachname": data.contact.lastName || null,
    "Geburtsjahr": data.contact.birth_date || null, //where's this recorded??
    "Strasse+Nr": data.contact.address?.street || null,
    "PLZ": data.contact?.postcode || null,
    "Ort": data.contact.address?.locality || null,
    "E-Mail-Adresse*": data.contact.email,
    "Werbecode": 123456,
    "NewsletterDOI": data.privacy.emailStatus === "double_opt_in" ? "Yes" : "No", // CHECK!!!
    "Submit_timestamp": data.privacy.givenAt || null,
    origin: data.tracking?.location
  };

  //where's phone number recorded??
  // phone needs formating
  if (data.contact.phone) action["Telefonnummer(Vorwahl+Durchwahl)"] = data.contact.phone;
  if (data.contact.country) action.iso = data.contact.country
  return action;
};
