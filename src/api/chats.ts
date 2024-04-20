
import mAPI, { ErrorApiResp, PagedAPIResp } from ".";
import { Client } from "../"

export interface Chat {
    _id: string,
    allow_pinning: boolean,
    created: number,
    deleted: boolean,
    icon: string,
    icon_color: string,
    last_active: number,
    members: Array<string>,
    nickname: string,
    owner: string,
    type: number
}

function _checkIfChat(obj: any): obj is Chat {
    if (obj === null || typeof obj !== "object") return false;
    if (typeof obj._id !== "string") return false;
    if (typeof obj.allow_pinning !== "boolean") return false;
    if (typeof obj.created !== "number") return false;
    if (typeof obj.deleted !== "boolean") return false;
    if (typeof obj.icon !== "string") return false;
    if (typeof obj.icon_color !== "string") return false;
    if (typeof obj.last_active !== "number") return false;
    if (!Array.isArray(obj.members)) return false;
    if (typeof obj.nickname !== "string") return false;
    if (typeof obj.owner !== "string") return false;
    if (typeof obj.type !== "number") return false;

    return true;
}

type ChatResp = {
    body: PagedAPIResp<Chat> | ErrorApiResp;
    status: number;
};

export default class MChats {
    root: mAPI;
    client: Client;

    constructor(root: mAPI) {
        this.root = root;
        this.client = this.root.client;
    }

    async get(): Promise<ChatResp> {
        const resp = await fetch(`${this.root.apiUrl}/chats?autoget=1`, {
            headers: { token: this.client.user.token }
        })
        
        const data: PagedAPIResp<Chat> | ErrorApiResp = await resp.json()
        if (!data.error && !_checkIfChat(data.autoget[0])) {
            return {
                body: { error: true },
                status: 500
            }
        }
        return {
            body: data,
            status: resp.status
        }
    }
}