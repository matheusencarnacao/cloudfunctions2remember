export class Device {
    constructor(
        public macaddress: string,
        public name: string
    ){}
}

export class UserDeviceResgiter{
    constructor(
        public userId: string,
        public macaddress: string
    ){}
}