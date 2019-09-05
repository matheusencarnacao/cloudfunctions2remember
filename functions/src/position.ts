export class PositionRequest {
    constructor(
        public lat: number,
        public lng: number,
        public macaddress: string
    ){}
}

export class PositionResponse {
    constructor(
        public uuid: string,
        public lat: number,
        public lng: number,
        public date: string,
        public deviceId: string
    ){}
}