import dotenv from 'dotenv';
dotenv.config();

const authUrl = process.env.CRM_URL;
const tokenUrl = process.env.CRM_TOKEN_URL;
const ID = process.env.CRM_ID //letters
// const username = process.env.CRM_USERNAME; //user_Id
const password = process.env.CRM_PASSWORD;
const secret = process.env.CRM_SECRET;
const apiUrl = process.env.CRM_URL;

if (!authUrl || !ID || !password || !tokenUrl || !apiUrl) {
    console.error("No credentials");
    process.exit(1);
}
export const getToken = async () => {
  const authHeader = 'Basic ' + Buffer.from(`${ID}:${secret}`).toString('base64');
  const bodyParams = new URLSearchParams({
      'grant_type': 'client_credentials'
  }).toString();

  try {
      const response = await fetch(tokenUrl, {
          method: 'POST',
          headers: {
              'Authorization': authHeader,
              'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: bodyParams
      });

      if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(`Error fetching token: ${response.statusText} - ${errorBody}`);
      }

      const data = await response.json();
      return data.access_token;
  } catch (error) {
      console.error('Error:', error.message);
  }
}

export const apiCall = async (accessToken, postData) => {
    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(postData)
        });

        if (!response.ok) {
            throw new Error(`API call failed: ${response.statusText}`);
        }

        const data = await response;
        console.log('API response status:', data.status);
        return data;
    } catch (error) {
        console.error('API Call Error:', error.message);
    }
}

