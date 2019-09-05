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