import dotenv from 'dotenv';
dotenv.config();

const authUrl = process.env.CRM_URL;
const tokenUrl = process.env.CRM_TOKEN_URL;
const ID = process.env.CRM_ID //letters
const secret = process.env.CRM_SECRET;
const apiUrl = process.env.CRM_URL;
const listId = process.env.CRM_LIST_ID;

if (!authUrl || !tokenUrl || !ID || !tokenUrl || !apiUrl) {
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

export const getGroups = async (accessToken) => {
    try {
        const response = await fetch(apiUrl + '/groups', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (!response.ok) {
            throw new Error(`Get groups failed: ${response.statusText}`);
        }

        const data = await response.text();
        console.log('Get groups response status:', data);
        return data;
    } catch (error) {
        console.error('Get groups contact error:', error.message);
    }
}

export const postContact = async (accessToken, postData) => {
    try {
        const response = await fetch(apiUrl + '/groups/' + listId + '/receivers', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`//,
                //'name':'Proca CR Import Export'
            },
            body: JSON.stringify(postData)
        });

        if (!response.ok) {
            throw new Error(`Post contact failed: ${response.statusText}`);
        }

        const data = await response.text();
        console.log('Post contact response status:', data);
        return data;
    } catch (error) {
        console.error('Post contact error:', error.message);
    }
}

