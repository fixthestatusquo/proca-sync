type Header = {
  "Content-Type": string;
  Accept: string;
  Authorization?: string;
};

interface ErrorItem {
  message: string;
}

type ProcaResponse = {
  data?: [key: string];
  errors?: ErrorItem[];
};

//export const graphQL: Promise<ProcaResponse> = async (operation, query, options) => {
export async function graphQL (operation, query, options): Promise<ProcaResponse> {
  if (!options) options = {};
  if (!options.apiUrl)
    options.apiUrl =
      process.env.REACT_APP_API_URL || "https://api.proca.app/api";

  let data: ProcaResponse = {};
  let headers: Header = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (options.authorization) {
    //    var auth = 'Basic ' + Buffer.from(options.authorization.username + ':' + options.authorization.username.password).toString('base64');
    headers.Authorization = "Basic " + options.authorization;
  }
  // console.debug("graphql: ", query, options.variables)
  try {
    const res = await fetch(options.apiUrl, {
      method: "POST",
      referrerPolicy: "no-referrer-when-downgrade",
      headers: headers,
      body: JSON.stringify({
        query: query,
        variables: options.variables,
        operationName: operation || "",
        extensions: options.extensions,
      }),
    });
    if (!res.ok) {
      return <ProcaResponse> {
        errors: [{ message: "network error #" + res.status }],
      };
    }
    const response = (await res.json()) as any;
    if (response.errors) {
      const toCamel = (s) =>
        s.replace(/([_][a-z])/gi, ($1) => $1.toUpperCase().replace("_", ""));

      response.errors.fields = [];
      response.errors.forEach((error) => {
        const field = error.path && error.path.slice(-1)[0];
        if (!field) return;
        let msg = error.message.split(":");
        if (msg.length === 2) {
          msg = msg[1];
        } else {
          msg = error.message;
        }
        response.errors.fields.push({
          name: toCamel(field),
          message: msg, // error.message,
        });
      });
      data = response;
      return data;
    }
    data = response.data;
  } catch (error) {
    console.error(error);
      return <ProcaResponse> 
    { errors: [{ message: error.toString() }] };
  }
  return data;
};

export const fetchCampaign = async (name) => {
  const query = `query campaign ($name: String! ) {
  campaign (name:$name) {
    id, name, title, config, externalId
  }
}`;

  const data : any = await graphQL("campaign", query, { variables: { name: name } });
  if (data?.campaign?.config)
    data.campaign.config = JSON.parse(data.campaign.config);
  return data?.campaign;
};
