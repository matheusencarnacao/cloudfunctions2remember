import admin = require("firebase-admin")
import * as functions from 'firebase-functions';

export class FirebaseMeessageService {

    private tokens = "/tokens";
    private bounds = "/bounds";

    constructor(
        private db: admin.database.Database,
        private messaging: admin.messaging.Messaging
    ){}

    public async send(deviceId: string, data:any, res: functions.Response){
        const userIds = await this.db.ref(this.bounds)
            .child(deviceId)
            .once('value')
            .then(snapshot => {
                const users:string[]  = []
                snapshot.forEach(user => { users.push(user.val())})
                return users;
            })
            .catch(err => [])
        console.log(userIds)
        for (const userId of userIds){
            const tokens = await this.db.ref(this.tokens)
                .child(userId)
                .orderByKey()
                .limitToLast(1)
                .once('value')
                .then(snapshot => {
                    const tokenList: string[] = [] 
                    snapshot.forEach(token => { tokenList.push(token.val().token) })
                    return tokenList;
                })
                .catch(error => [])
            console.log(tokens);
            for (const token of tokens){
                const message = {
                    data:   data,
                    token: token
                }
                console.log(message)
                const status = await this.messaging.send(message)
                    .then(() => 200)
                    .catch(error => 500)
                console.log(status);
            }
        }
        res.sendStatus(200)
    }
}