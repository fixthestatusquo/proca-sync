import dotenv from 'dotenv';
dotenv.config();

const authUrl = process.env.CRM_URL;
const tokenUrl = process.env.CRM_TOKEN_URL;
const ID = process.env.CRM_ID //letters
const secret = process.env.CRM_SECRET;
const apiUrl = process.env.CRM_URL;

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

export const getContact = async (email: string, token: string): Promise<any> => {
    try {
        const response = await fetch(apiUrl + `/v3/receivers.json/${email}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error(`Get receiver failed: ${response.statusText}`);
        }

        const data = await response.json();

        // if there is a value for quelle, we will skip that field when sending the message
        if (data?.global_attributes?.quelle.length > 0) {
            return true;
        }
        return false;
    } catch (error) {
        console.error('Get groups contact error:', error.message);
    }
    return false;
}

export const getGroups = async (token: string, listId: number) => {
    try {
        const response = await fetch(apiUrl + '/v3/groups/' + listId + '/receivers', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
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

export const upsertContact = async (token: string, postData: any, listId: number) => {
    try {
        const response = await fetch(apiUrl + '/v3/groups/' + listId + '/receivers/upsert', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,//,
                'name':'Proca CR Import Export'
            },
            body: JSON.stringify(postData)
        });

        if (response.ok) return true;
        return false
    } catch (error) {
        console.error('Post contact errooor:', error.message);
    }
}

