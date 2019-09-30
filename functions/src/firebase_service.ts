import admin = require("firebase-admin")
import * as functions from 'firebase-functions';

export class FirebaseMeessageService {

    private tokens = "/tokens";
    private bounds = "/bounds";

    constructor(
        private db: admin.database.Database,
        private messaging: admin.messaging.Messaging
    ){}

    public send(deviceId: string, data:any, res: functions.Response){
        this.db.ref(this.bounds)
            .child(deviceId)
            .once('value')
            .then(snapshot => {
                snapshot.forEach(user => { 
                    const userId = user.val()
                    this.db.ref(this.tokens)
                        .child(userId)
                        .orderByKey()
                        .limitToLast(1)
                        .once('value')
                        .then(value => {
                            value.forEach(token => {
                                const message = {
                                    data:   data,
                                    token: token.val().token
                                }
                                console.log(message)
                                this.messaging.send(message)
                                    .then(() => console.log("Message sended with success!"))
                                    .catch(error => console.log(error))
                                res.sendStatus(200)
                            })
                        })
                        .catch(error => console.log(error))
                 })
                 //res.sendStatus(200)
            })
            .catch(err => res.status(500).send(err))
    }
}