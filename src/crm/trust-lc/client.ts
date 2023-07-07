import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

import { Signature, Verification } from "./data";

const makeHeaders = () => {
  const key = process.env['TRUST_KEY'];
  if (!key) throw Error("TRUST_KEY not set");
  const stamp = Math.floor(Math.floor(Date.now() / 1000) / 30).toString();
  const token = crypto.createHmac("sha256", key).update(stamp).digest().toString('hex');

  return {
   method: "POST",
    headers: {
      Accept: "application/json",
      'Authorization': `Token token="proca-test:${token}"`,
      'Content-Type': 'application/json;charset=UTF-8'
    }
  }
}

export const postAction = async (body: Signature) => {
  if ("string" !== process.env.POST_URL) {
    throw new Error ("POST_URL missing in env");
  }
  try {
    const response= await fetch(process.env.POST_URL,{...(makeHeaders()),body:JSON.stringify(body)});
    const data = await response.json();
    console.log('Post status: ', data);
    return data;
    } catch (error: any) {
      console.error('post error: ', error);
      throw(error);
    }
}

export const verification = async (verificationToken: string, body: Verification) => {
  if ("string" !== process.env.POST_URL) {
    throw new Error ("POST_URL missing in env");
  }
  const url = process.env.VERIFICATION_URL + verificationToken + '/verify';
  try {
    const response = await fetch(
      url,
      {body:JSON.stringify(body),
      ...(makeHeaders())}
    );
    const data= await response.json();
    console.log('data', data);
    return data;
    } catch (error: any) {
      console.error('post error: ', error);
      throw(error);
  }
}

export const lookup = async (email: string) => {
  if ("string" !== process.env.LOOKUP_URL) {
    throw new Error ("LOOKUP_URL missing in env");
  }
  const url = process.env.LOOKUP_URL + email;
  try {
    const response = await fetch (url, makeHeaders());
    const data = await response.json();
    return {success: true, data:data};
    } catch (error: any) {
      return {success:false, status:error.response?.status, data: error.response};
  }
}
