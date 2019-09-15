export class User{

    public birthday?: Date;
    public photoUrl?: string;
    public devices: string[] = []

    constructor(
        public uuid: string,
        public email: string,
        public name?: string    
    ){}
}

export class UserTokenRegister {

    constructor(
        public userId: string,
        public token: string
    ){}
}