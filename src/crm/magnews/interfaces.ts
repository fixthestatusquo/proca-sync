export interface Config {
    accessToken: string;
}

export interface AddMemberResponse {
    ok: boolean,
    pk: string,
    idcontact: number,
    action: string,
    errors: ErrorListItem[],
    sendemail: string | null,
    enterworkflow: string | null,
    idwebtracking: string | null
}

export interface ErrorListItem {
    type: string,
    field: string
}

export interface ContactValues {
    EMAIL         : string;
    NAME          : string;
    SURNAME       : string;
    CELL?         : string;
    WBST_AUDIENCE : string;
    NOME_UTENTE   : string;
    UTM_SOURCE?   : string;
    UTM_MEDIUM?   : string;
    UTM_CAMPAIGN? : string;
    UTM_CONTENT?  : string;
}

export interface ContactOptions {
    iddatabase                        : number;
    sendemailonactions                : string;
    sendemail                         : boolean;
    usenewsletterastemplate           : boolean;
    idnewsletter                      : number;
    denyupdatecontact                 : boolean;
    forceallowrestorecontactonupdate  : boolean;
    denysubscribeunsubscribedcontact  : boolean;
}

export interface Contact {
    values : ContactValues,
    options : ContactOptions
}
