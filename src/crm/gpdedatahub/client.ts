import dotenv from "dotenv";
import { GPAction } from "./data";
dotenv.config();

const url = process.env.CRM_URL;
const username = process.env.CRM_USERNAME;
const password = process.env.CRM_PASSWORD;

const testUrl = process.env.CRM_TEST_URL;
const testUsername = process.env.CRM_TEST_USERNAME;
const testPassword = process.env.CRM_TEST_PASSWORD;

if (!url || !username || !password) {
  console.error("No credentials");
  process.exit(1);
}

const getEncodedToken = (
  username?: string,
  password?: string,
): string | null => {
  return username && password
    ? Buffer.from(`${username}:${password}`).toString("base64")
    : null;
};

const tokenEncoded = getEncodedToken(username, password);

// If there is no test environment, use production credentials
const testTokenEncoded =
  getEncodedToken(testUsername, testPassword) || tokenEncoded;

export const postAction = async (action: GPAction): Promise<number> => {
  const isTest = action.action.testing || false;

  const requestUrl = isTest ? testUrl || url : url;
  const headers = {
    Authorization: `Basic ${isTest ? testTokenEncoded : tokenEncoded}`,
    "Content-type": "application/json",
  };
  const body = JSON.stringify(action);

  try {
    const response = await fetch(requestUrl, {
      method: "POST",
      headers: headers,
      body: body,
    });

    // We only get status = 200 if everything is fine;
    console.log(action.actionId, requestUrl);
    return response.status;
  } catch (error: any) {
    console.error("Post error:", error);
    throw error;
  }
};
