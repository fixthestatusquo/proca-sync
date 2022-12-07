import {Config, Contact, AddMemberResponse} from './interfaces'

class magnews {

    protected bearerToken:string = "";

    setConfig(conf: Config) {
        this.bearerToken = conf.accessToken
    }

    getToken() {
        return this.bearerToken
    }

    async addListMember(token: string, member: Contact) {

        fetch("https://apiserver/ws/rest/api/v19/contacts/merge",
        {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            method: "POST",
            body: JSON.stringify(member)
        })
        .then(function(res){
            return res
        })
        .catch(function(res){
           console.error("addListMember",res.toString());
           throw res;
        })

    };

}

export default new magnews()
