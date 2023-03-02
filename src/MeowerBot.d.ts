declare class Bot {
    constructor(username: string, password: string, server?: string, prefix?: string);
    post(content: string, origin?: string): void;
    onPost(callback: Function): void;
    onClose(callback: Function): void;
    onMessage(callback: Function): void;
    onLogin(callback: Function): void;
    onCommand(command: string, callback: Function): void;
    send(message: object): void;
}

export = Bot;
