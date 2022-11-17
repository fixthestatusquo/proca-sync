import _ from 'lodash'
/*
 * A fake in-memory CRM
 *
 *
 * Holds a basic Contacts, who have ids of campaigns they signed
 * Holds basic Campaign with a name
 */


type Contact = {
  id: number
  email: string
  firstName: string
  lastName: string
  subscribed: boolean
  bounced: boolean
  campaigns: number[]
}

type Campaign = {
  id: number
  name: string
  externalId: number
}

type FakeCRM = {
  contacts: Contact[]
  campaigns: Campaign[]
}

// global CRM in memory here
export const CRM : FakeCRM = {
  contacts: [],
  campaigns: []
}

// APIs to call the CRM
// I make them async as if they are networked api calls


export const getContactByEmail = async (email : string) : Promise<Contact | undefined> => {
  return _.find(CRM.contacts, (c) => c.email === email)
}


export const addContact = async (email:string, firstName:string, lastName:string) => {
  const id = CRM.contacts.length

  CRM.contacts.push({
    id,
    firstName: firstName,
    lastName: lastName || '', // in some widgets not collected
    email,
    subscribed: false,
    bounced: false,
    campaigns: []
  })

  return id
}

export const setSubscribed = async (id : number, subscribed:boolean) => {
  CRM.contacts[id].subscribed = subscribed
}

export const setBounced = async (id : number, bounced:boolean) => {
  CRM.contacts[id].subscribed = bounced
}

export const addSignature = async (contactId:number, campaignId:number) => {
  const cs = CRM.contacts[contactId].campaigns

  if (cs.indexOf(campaignId) < 0) {
    cs.push(campaignId)
  }
}

export const getCampaignByName = async (name : string) : Promise<Campaign | undefined> => {
  return _.find(CRM.campaigns, (c) => c.name === name)
}

export const getCampaignByExternalId = async (externalId : number) : Promise<Campaign | undefined> => {
  return _.find(CRM.campaigns, (c) => c.externalId === externalId)
}

export const addCampaign = async(name:string, externalId:number) => {
  const id = CRM.campaigns.length

  CRM.campaigns.push({
    name, id, externalId
  })

  return id
}

export const showContacts = () => {
  let s = ''
  for (const c of CRM.contacts) {
    s = `${c.firstName} ${c.lastName} <${c.email}> subscribed: ${c.subscribed} blocked: ${c.bounced} signatures:`

    for (const cid of c.campaigns) {
      s += ` ${CRM.campaigns[cid].name};`
    }

    console.log(s)
  }
}
