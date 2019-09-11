import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { StringUtils, DateUtils } from './utils';
import { PositionRequest, PositionResponse } from './position';
import { Device, UserDeviceResgiter } from './device';

const devicesBD = "/devices"
const usersBD = "/users"
const positionsBD ="/positions"
const serviceAccount = require("../serviceAccountKey.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://remember-4c39b.firebaseio.com"
}); 

// admin.initializeApp(functions.config().firebase);

const db = admin.database()

/**
 * Cadastrar device
 */
export const newDevice = functions.https.onRequest(async (req, res) => {
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
});

/**
 * Inserir nova posição
 */
export const newPosition = functions.https.onRequest(async (req, res) => {
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

    const positionResponse = new PositionResponse(uuid!, position.lat, position.lng, now.toISOString(), key)

    partition.child(uuid!)
        .set(positionResponse)
        .then(snapshot => res.sendStatus(200))
        .catch(error => res.status(500).send(error))
})

/**
 * Retorna ultima posição do device
 */
export const lastPosition = functions.https.onRequest(async (req, res) => {
    const macaddress: string = req.query.macaddress
    if(!macaddress){
        res.sendStatus(400)
    }
    const deviceId = new StringUtils(macaddress).convertToBase64()

    db.ref(positionsBD)
        .child(deviceId)
        .orderByKey()
        .limitToLast(1)
        .once('value')
        .then(partition => {
            partition.forEach(posRef => {
                const positions: PositionResponse[] = []
                posRef.forEach(info => { positions.push(info.val() as PositionResponse) })
                let response = {}
                if(positions.length > 0)
                    response = positions[positions.length-1]
                res.status(200).send(response)
            })
        })
        .catch(error => res.status(500).send(error))
})

/**
 * retorna informações do device
 */
export const infoDevice = functions.https.onRequest(async (req, res) => {
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
export const newRegister = functions.https.onRequest(async (req, res) => {
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

export const outOfRange = functions.https.onRequest(async (req, res) => {
    const position = req.body as PositionRequest
    if(!position.macaddress){
        res.status(400).send("Macaddress is missing!")
    }

    //TODO: serviço de notificação
})
