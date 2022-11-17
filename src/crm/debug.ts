import _ from 'lodash';

import {writeFileSync}  from 'fs';
/*
 * A test CRM
 *
 *
 * Holds a basic Contacts, who have ids of campaigns they signed
 * Holds basic Campaign with a name
 */


type ContactID = string | number | undefined;

type Contact = {
  area: string,
  contactRef: string,
  country: string,
  dupeRank: number,
  email: string,
  firstName: string,
  lastName: string,
  postcode: string
}

type Privacy = {
//  emailStatus: null,
//  emailStatusChanged: null,
  givenAt: string,
  optIn: boolean,
  withConsent: boolean

};

type Action = {
  actionType: string,
  createdAt: string,
  customFields: object,
  testing: boolean
}

/*id: number
  email: string
  firstName: string
  lastName: string
  subscribed: boolean
  bounced: boolean
  campaigns: number[]
}*/

type Campaign = {
  id: number
  name: string
  externalId: number
}

const writeJson = (data: object, name: string | undefined ) => {
  writeFileSync('./data/' +name+'.json', JSON.stringify(data, null, 2));
}


export const getContactByEmail = async (email : string) : Promise<Contact | undefined> => {
  return undefined;
}


export const addContact = async (contact: Contact ) => {
  writeJson(contact,"contact_" + contact.email);
  console.log(contact);
  return 0;
}

export const setSubscribed = async (id : number, subscribed:boolean) => {
  console.log(id,subscribed);
}

export const setBounced = async (id : number, bounced:boolean) => {
  console.log(id,bounced);
}

export const addAction = async (action: Action, contactId:number, campaignId:number) => {
  console.log(contactId, campaignId);
  writeJson(action,"action_"+contactId +"_"+campaignId);
  return 0;
}

export const getCampaign = async (campaign: Campaign) : Promise<Campaign | undefined> => {
  return campaign;
}

export const getCampaignByExternalId = async (externalId : number) : Promise<Campaign | undefined> => {
  return;
}

export const addCampaign = async(campaign: Campaign) => {
  writeJson(campaign,"campaign_"+campaign.name);
  return 0;
}
