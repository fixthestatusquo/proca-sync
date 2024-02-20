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
console.log("token", tokenEncoded);

const headers = {
      "Authorization": `Basic ${tokenEncoded}`,
      "Content-type": "application/json"
  }

export const postAction = async (action: GPAction) => {
  // console.log("headers:", headers, action)
  const body = JSON.stringify(action)
  // console.log("body", body);

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

