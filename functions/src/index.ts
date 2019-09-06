import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as express from 'express';
import * as bodyParser from "body-parser";
import { StringUtils, DateUtils } from './utils';
import { PositionRequest, PositionResponse, CurrentPositionRequest } from './position';
import { Device, UserDeviceResgiter } from './device';
// import { User } from './user';

const serviceAccount = require("../serviceAccountKey.json");

const devicesBD = "/devices"
const usersBD = "/users"
const positionsBD ="/positions"

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
/**
 * Cadastrar device
 */
app.post('/device', async (req, res) => {
    const device = req.body as Device

    if (!device.macaddress){
        res.status(400).send("invalid JSON")
    }

    const key = new StringUtils(device.macaddress).convertToBase64()

    db.ref(devicesBD)
        .child(key)
        .set(device)
        .then(snapshot => res.sendStatus(200))
        .catch(error => res.status(500).send(error))
})

/**
 * Salva posição
 */
app.post('/position', async (req, res) => {
    const position = req.body as PositionRequest

    if(!position.macaddress){
        res.status(400).send("DeviceId is missing!")
    }

    const key = new StringUtils(position.macaddress).convertToBase64()

    const now = new Date()

    const today = new DateUtils(now).getPartition()

    const partition = db.ref(positionsBD)
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

app.get('/position', async (req, res) => {
    const positionReq = req.body as CurrentPositionRequest
    if(!positionReq.macaddress){
        res.sendStatus(400)
    }
    const deviceId = new StringUtils(positionReq.macaddress).convertToBase64()

    db.ref(positionsBD)
        .child(deviceId)
        .orderByKey()
        .limitToLast(1)
        .once('value')
        .then(partition => partition.ref.limitToLast(1))
        .then(positionRef => positionRef.once('value'))
        .then(position => res.status(200).send(position.val()))
        .catch(error => res.status(500).send(error))
})

/**
 * retorna informações do device
 */
app.get('/device/', async (req, res) => {
    const deviceId = req.query.deviceId
    if (!deviceId) res.status(400)

    db.ref(devicesBD)
        .child(deviceId)
        .once('value')
        .then(snapshot => res.status(200).send(snapshot.val()))
        .catch(error => res.status(404).send("Device not found"))
})

/**
 * Registra vinculo entre usuario e device
 */
app.post('/register', async (req, res) => {
    const deviceRegister = req.body as UserDeviceResgiter
    if (!deviceRegister.macaddress || !deviceRegister.userId){
        res.sendStatus(400)
    }

    const userRef = db.ref(usersBD).child(deviceRegister.userId);
    
    userRef.once('value')
        .then(snapshot => snapshot.child("devices"))
        .then(devices => {
            devices.forEach(action => {
                if(action.val() === deviceRegister.macaddress){
                    res.sendStatus(409)
                }
            })
            devices.ref.push().set(deviceRegister.macaddress)
                .then(success => res.sendStatus(200))
                .catch(error => res.status(500).send(error))
        })
        .catch(error => res.status(500).send(error))
})