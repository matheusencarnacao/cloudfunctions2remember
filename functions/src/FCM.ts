import admin = require("firebase-admin")
import * as functions from 'firebase-functions';

export class FirebaseMeessageService {

    private tokens = "/tokens";

    constructor(
        private db: admin.database.Database,
        private messaging: admin.messaging.Messaging
    ){}

    public send(deviceId: string, data:any, res: functions.Response){
        this.db.ref(this.tokens)
        .child(deviceId)
        .once('value')
        .then(snapshots => {
            snapshots.forEach(token => {
                const message = {
                    data: data,
                    token: token.val()
                }
                this.messaging.send(message)
                    .then(() => console.log("Message sended with success!"))
                    .catch(error => console.log(error))
            })
            res.sendStatus(200)
        })
        .catch(error => res.status(500).send(error))
    }
}