import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as express from 'express';
import * as bodyParser from "body-parser";
import { StringUtils, DateUtils } from './utils';
import { PositionRequest, PositionResponse } from './position';
import { Device, UserDeviceResgiter } from './device';
import { User } from './user';

const serviceAccount = require("../serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://remember-4c39b.firebaseio.com"
});

const db = admin.database()

const app = express();
const main = express();

main.use('/api/v1', app)
main.use(bodyParser.json())
main.use(bodyParser.urlencoded({ extended: false }));

export const webAPI = functions.https.onRequest(main)

app.post('/device', async (req, res) => {
    const device = req.body as Device

    if (!device.macaddress){
        res.status(400).send("invalid JSON")
    }

    const key = new StringUtils(device.macaddress).convertToBase64()

    db.ref("/devices")
        .child(key)
        .set(device)
        .then(snapshot => res.sendStatus(200))
        .catch(error => res.status(500).send(error))
})

app.post('/position', async (req, res) => {
    const position = req.body as PositionRequest

    if(!position.macaddress){
        res.status(400).send("DeviceId is missing!")
    }

    const key = new StringUtils(position.macaddress).convertToBase64()

    const now = new Date()

    const today = new DateUtils(now).getPartition()

    const partition = db.ref("/positions")
        .child(key)
        .child(today)
    const uuid = partition.push().key

    if (!uuid) res.status(500).send("Error inserting in DB")

    const positionResponse = new PositionResponse(uuid!, position.lat, position.lng, now.toISOString(), key)

    partition.child(uuid!)
        .set(positionResponse)
        .then(snapshot => res.sendStatus(200))
        .catch(error => res.status(500).send(error))

})

app.get('/devices/', async (req, res) => {
    const deviceId = req.query.deviceId
    if (!deviceId) res.status(400)

    db.ref("/devices")
        .child(deviceId)
        .once('value')
        .then(snapshot => {
            console.log(snapshot.val())
        })
        .catch(error => res.status(404).send("Device not found"))
})

app.post('/register', async (req, res) => {
    const deviceRegister = req.body as UserDeviceResgiter
    if (!deviceRegister.macaddress || !deviceRegister.userId){
        res.sendStatus(400)
    }

    const userRef = db.ref("/users").child(deviceRegister.userId);
    
    userRef.once('value')
        .then(snapshot => snapshot.val() as User)
        .then(user => {
            user.devices.push(deviceRegister.macaddress)

            userRef.update(user)
                .then(sucess => res.status(200).send(sucess))
                .catch(error => res.status(500).send(error))
        })
        .catch(error => res.status(404).send("User not found"))
})