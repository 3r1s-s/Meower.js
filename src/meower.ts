import WebSocket from "ws";
import EventEmitter from "node:events";

process.on('unhandledrejection', (event) => {
    throw new Error(event.reason)
})

export interface Packet extends Object {
    cmd: string;
    val: any | Object;
    listener?: string;
}



interface User extends Object {
    "account": {
        "_id": string,
        "active_dms": Array<any>
        "avatar": string,
        "avatar_color": string,
        "ban": {
            "expires": Number,
            "reason": string,
            "restrictions": Number,
            "state": "temp_restriction"
        },
        "banned": false,
        "bgm": false,
        "bgm_song": Number,
        "created": Number,
        "debug": false,
        "experiments": Number,
        "favorited_chats": Array<any>,
        "flags": Number,
        "hide_blocked_users": false,
        "last_seen": Number,
        "layout": string,
        "lower_username": string,
        "lvl": Number,
        "mode": false,
        "permissions": Number,
        "pfp_data": Number,
        "quote": string,
        "sfx": false,
        "theme": string,
        "unread_inbox": false,
        "uuid": string,
    },
    "relationships": Array<Object>
    "token": string,
    "username": string,
}

export let bridges = ["Discord"]

export default class Client extends EventEmitter {
    api!: string;
    ws!: WebSocket;
    user!: User;

    constructor() {
        super();
    };

    /**
    * Connects to the (specified) server, then logs in
    */
    login(username: string, password: string, server = "wss://server.meower.org/", api = "https://api.meower.org") {
        this.api = api;
        this.ws = new WebSocket(server);

        this.ws.on("open", async () => {
            this.send({
                "cmd": "direct",
                "val": {
                    "cmd": "type",
                    "val": "js"
                }
            });

            this.send({
                "cmd": "direct",
                "val": {
                    "cmd": "authpswd",
                    "val": {
                        "username": username,
                        "pswd": password
                    }
                },
                "listener": "mb.js-login"
            });

            setInterval(() => {
                if (this.ws.readyState == 1) {
                    this.send({
                        "cmd": "ping",
                        "val": ""
                    });
                }
            }, 10000);

            this.on('listener-mb.js-login', (packet: Packet) => {
                if (packet.val.mode === undefined && packet.val !== "I:100 | OK") {
                    console.error(`[Meower] Failed to login: ${packet.val}`)
                    throw new Error(`Failed to login: ${packet.val}`)
                } else if (packet.val.mode === undefined) return;

                this.user = packet.val.payload;

                this.emit("login");
            });

            this.ws.on("close", () => {
                this.emit("close");
            });

            this.ws.on("packet", (data: string) => {
                this.emit("packet", data);
            });

            this.on('command-direct', (command: Packet) => {
                command = JSON.parse(JSON.stringify(command))
                if (!command.val.hasOwnProperty("type")) {
                    return;
                }

                command.val.bridged = null;
                if (bridges.includes(command.val.u)) {
                    command.val.bridged = JSON.parse(JSON.stringify(command));
                    const data: Array<string> = (command.val.p as string).split(":");
                    
                    if (command.val.u === 'Webhooks') {
                        data.splice(0, 1);
                    }

                    command.val.u = data[0];
                    command.val.p = data[1]?.trimStart().concat(data.slice(2, data.length).join(":"));
                    command.val.bridged = true;
                }


                this.emit("post",
                    command.val.u,
                    command.val.p,
                    command.val.post_origin,
                    {bridged: command.val.bridged}
                );
            })

            this.ws.on("message", (data: string) => {
                let packetData: Packet = JSON.parse(data);
                if (packetData.listener !== "mb.js-login") {
                    console.debug(`> ${data}`)
                }
                try {
                    if (packetData.listener !== undefined) {
                        this.emit(`listener-${packetData.listener}`, packetData)
                    }

                    this.emit(`command-${packetData.cmd}`, packetData)
                } catch (e) {
                    console.error(e);
                    this.emit('.error', e);
                    
                }
            });
        });
    }

    /**
    * Post to home, or a group chat, if specified
    */
    async post(content: string, id: string | null = null)  {
        let url;

        if (id === "home" || !id) {
            url = "/home/";
        } else {
            url = "/posts/" + id;
        }

        let headers = {
            'Content-Type': 'application/json',
            'token': this.user.token
        };

        let response = await fetch(`${this.api}${url}`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                'content': content
            })
        });

        if (!response.ok) {
            console.error(`[Meower] Failed to send post: ${await response.text()} @ ${response.status}`)
            return null;
        }

        return await response.json();
    }

    /**
    * Executes the callback when a new post is sent

    */
    onPost(callback: (username: string, content: string, origin: string, {bridged}: {bridged: boolean}) => void | Promise<void>) {
        this.on("post", async (username: string, content: string, origin: string, bridged: {bridged: boolean}) => {
            await callback(username, content, origin, bridged);
        });
    }

    /**
    * Executes the callback when the connection is closed
    */
    onClose(callback: () => void | Promise<void>) {
        this.on("close", async () => {
            await callback();
        });
    }


    /**
    * Executes the callback when a new packet from the server is sent
    */
    onPacket(callback: (data: Packet) => void | Promise<void>) {
        this.on("packet", async (data: Packet) => {
            await callback(data);
        });
    }


    /**
    * Executes the callback when successfully logged in
    */
    onLogin(callback: () => void | Promise<void>) {
        this.on("login", async () => {
            await callback();
        });
    }

    
    /**
    * Sends a packet to the server
    */
    async send(packet: Packet) {
        if (packet.listener !== "mb.js-login") {
            console.debug(`< ${JSON.stringify(packet)}`)
        }
        this.ws.send(JSON.stringify(packet));
    }

    /**
    * Closes the connection to the currently connected server
    */
    close() {
        this.off("close", () => {
            this.ws.close();
        });
    }

};
