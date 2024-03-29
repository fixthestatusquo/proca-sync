import dotenv from 'dotenv';
import { GPAction } from './data';
dotenv.config();

const url = process.env.CRM_URL;
const username = process.env.CRM_USERNAME;
const password = process.env.CRM_PASSWORD;

if (!url || !username || !password) {
  console.error("no credentials");
  process.exit();
}

const authToken =`${username}:${password}`
const tokenEncoded = Buffer.from(authToken).toString('base64');

const headers = {
      "Authorization": `Basic ${tokenEncoded}`,
      "Content-type": "application/json"
  }

export const postAction = async (action: GPAction) => {
  const body = JSON.stringify(action)
      try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${tokenEncoded}`,

        "Content-type": "application/json"
    },
      body: body
    });

    //we only get status = 200 if everything is fine;
      return response.status;
    } catch (error: any) {
      console.error('post error: ', error);
      throw(error);
    }
}

