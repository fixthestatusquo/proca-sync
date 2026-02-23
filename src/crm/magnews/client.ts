import crypto from "crypto";
import type { Contact } from "./interfaces";
import magnews from "./magnews";

export const memberHash = (email: string) => {
  const hash = crypto.createHash("md5").update(email).digest("hex");
  return hash;
};

export const setClientToken = () => {
  if (process.env.AUTH_TOKEN) {
    const tok = process.env.AUTH_TOKEN;
    if (!tok) throw Error("auth token is empty!");

    magnews.setConfig({
      accessToken: tok,
    });

    return magnews.getToken();
  }

  throw Error("Define AUTH_TOKEN");
};

export const addContact = async (token: string, member: Contact) => {
  const result = await magnews.addListMember(token, member);
  return result;
};
