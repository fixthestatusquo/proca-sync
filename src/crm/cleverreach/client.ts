import dotenv from 'dotenv';
dotenv.config();

const authUrl = process.env.CRM_URL;
const tokenUrl = process.env.CRM_TOKEN_URL;
const ID = process.env.CRM_ID //letters
const secret = process.env.CRM_SECRET;
const apiUrl = process.env.CRM_URL;

if (!authUrl || !ID || !tokenUrl || !apiUrl) {
    console.error("No credentials");
    process.exit(1);
}

export const getToken = async () => {
  const authHeader = 'Basic ' + Buffer.from(`${ID}:${secret}`).toString('base64');

  try {
      const response = await fetch(tokenUrl, {
          method: 'POST',
          headers: {
              'Authorization': authHeader,
              'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            'grant_type': 'client_credentials'
        })
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
        const response = await fetch(apiUrl + '/groups', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`//,
                //'name':'Proca CR Import Export'
            }//,
            //body: JSON.stringify(postData)
        });

        if (!response.ok) {
            throw new Error(`API call failed: ${response.statusText}`);
        }

        const data = await response.text();
        console.log('API response status:', data);
        return data;
    } catch (error) {
        console.error('API Call Error:', error.message);
    }
}

