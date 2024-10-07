import dotenv from 'dotenv';
dotenv.config();

const authUrl = process.env.CRM_URL;
const tokenUrl = process.env.CRM_TOKEN_URL;
const ID = process.env.CRM_ID //letters
const secret = process.env.CRM_SECRET;
const apiUrl = process.env.CRM_URL;
// const listId = process.env.CRM_LIST_ID;

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

export const getContact = async (email: string, token: string, listId: number): Promise<any> => {
    try {
        const response = await fetch(apiUrl + `/v3/receivers.json/${email}?group_id=${listId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error(`Get receiver failed: ${response.statusText}`);
        }

        const data = await response;
        if (response.status === 200) return true;
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

// '/receivers' returns Bad request, status 400 if contact already exists and not accepted
//  using '/receivers/upsert'

export const postContact = async (token: string, postData: any, listId: number, update: boolean = false) => {
    try {
        const response = await fetch(apiUrl + '/v3/groups/' + listId + update ? '/receivers/upsert' : '/receivers/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,//,
                'name':'Proca CR Import Export'
            },
            body: JSON.stringify(postData)
        });

        if (!response.ok) {
            console.error('Post contact errooor:', response)
            throw new Error(`Post contact failed: ${response.statusText}`);
        }

        const data = await response;
        return data.status;
    } catch (error) {
        console.error('Post contact errooor:', error.message);
    }
}

