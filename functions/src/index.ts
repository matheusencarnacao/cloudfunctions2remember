import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { StringUtils, DateUtils } from './utils';
import { PositionRequest, PositionResponse, CurrentPositionRequest } from './position';
import { Device, UserDeviceResgiter } from './device';
import { UserTokenRegister, User } from './user';

const devicesBD = "/devices"
const usersBD = "/users"
const positionsBD ="/positions"
const tokens = "/tokens"
const bounds = "/bounds"
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
    const currentPos = req.body as CurrentPositionRequest
    if(!currentPos.macaddress){
        res.sendStatus(400)
    }
    const deviceId = new StringUtils(currentPos.macaddress).convertToBase64()

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
        .then(snapshot => {
            const user = snapshot.val() as User
            if(user.uuid !== deviceRegister.userId){
                res.status(404)
            }
        })
        .then(() => {

            const deviceKey = new StringUtils(deviceRegister.macaddress).convertToBase64();

            db.ref(bounds)
                .child(deviceKey)
                .push()
                .set(deviceRegister.userId)
                .then(() => res.sendStatus(200))
                .catch(err => res.status(500).send(err))
        })
        .catch(error => res.status(500).send(error))
})

/**
 * Avisa ao app que o cel esta fora do raio seguro
 */
export const outOfRange = functions.https.onRequest(async (req, res) => {
    const position = req.body as PositionRequest
    if(!position.macaddress){
        res.status(400).send("Macaddress is missing!")
    }

    const deviceId = new StringUtils(position.macaddress).convertToBase64()
    
    db.ref(tokens)
        .child(deviceId)
        .once('value')
        .then(snapshots => {
            snapshots.forEach(token => {
                const message = {
                    data: { lat: position.lat.toString(), lng: position.lng.toString() },
                    token: token.val()
                }
                admin.messaging().send(message)
                    .then(() => console.log("Message sended with success!"))
                    .catch(error => console.log(error))
            })
            res.sendStatus(200)
        })
        .catch(error => res.status(500).send(error))
})

/**
 * Inserir novo Token.
 */
export const newToken = functions.https.onRequest(async (req, res) => {
    const tokenRegister = req.body as UserTokenRegister
    if(!tokenRegister.userId || !tokenRegister.token){
        res.sendStatus(400)
    }

    const userRef = db.ref(usersBD).child(tokenRegister.userId);
     
    userRef.once('value')
        .then(snapshot => snapshot.child("uuid"))
        .then(uuid => {
            if(uuid.val() === tokenRegister.userId){
                const token = {
                    token: tokenRegister.token,
                    date: new Date().toISOString()
                }
                db.ref(tokens)
                    .child(uuid.val())
                    .push(token)
                    .then(snapshot => res.sendStatus(200))
                    .catch(error => res.status(500).send(error))
            } else {
                res.sendStatus(404);
            }
        })
        .catch(error => res.status(500).send(error))
})

/**
 * Botão de panico
 */
export const panicButton = functions.https.onRequest(async (req, res) => {
    //TODO: enviar notificação para o app
    //macaddress
    //desativar pelo app
})

/**
 * fora do pulso
 */
export const disconnectedBand = functions.https.onRequest(async (req, res)=> {
    //TODO: enviar notificação para o app
    //macaddress
    //True:disconectado False:conectado 
})

/**
 * low battery
 */
export const lowBattery = functions.https.onRequest(async (req, res) => {
    //TODO: enviar notificação para o app
    //macaddress
    //True: bateria fraca False: bateria deboa
})