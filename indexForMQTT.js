import mqtt from "mqtt";
import ModbusRTU from "modbus-serial";
const clientModbus = new ModbusRTU();
import { readModbusData } from './controllers/ReadController.js';
import { connectAndWriteArray } from './controllers/WriteController.js';




var mqttClient;

//const mqttHost = "127.0.0.1";
const protocol = "mqtt";
const mqttHost = "3.79.235.175"
const port = "1883";
const modbusReadIP = "91.225.166.71";
const modbusReadPort = 850;






// Функція для підключення до MQTT брокера
function connectToBroker() {
    const clientId = "client" + Math.random().toString(36).substring(7);
    const hostURL = `${protocol}://${mqttHost}:${port}`;
    const options = {
        keepalive: 60,
        clientId: clientId,
        protocolId: "MQTT",
        protocolVersion: 4,
        clean: true,
        reconnectPeriod: 1000,
        connectTimeout: 30 * 1000,
    };

    mqttClient = mqtt.connect(hostURL, options);

    mqttClient.on("error", (err) => {
        console.log("Error: ", err);
        mqttClient.end();
    });

    mqttClient.on("reconnect", () => {
        console.log("Reconnecting...");
    });

    mqttClient.on("connect", () => {
        //console.log("Client connected:" + clientId);
        mqttClient.subscribe("HP1/output/all", (err) => {
            if (!err) {
                console.log("Subscribed to topic: HP1/output/all");
            }
        });
        for(let i=0; i<5; i++){
            mqttClient.subscribe(`HP1/bits/${i*2}`, (err) => {
                if (!err) {
                    console.log(`Subscribed to topic: HP1/bits/${i*2}`);
                }
            });

            mqttClient.subscribe(`HP1/settings/${i*2}`, (err) => {
                if (!err) {
                    console.log(`Subscribed to topic: HP1/settings/${i*2}`);
                }
            });
        }
        
    });


    mqttClient.on('message', (topic, message) => {
        //console.log(topic)
        // const parts = topic.split("/"); // Розбиваємо топік на частини
        // const sensorID = parts[2];
        // HP1/input/3,      де HP1 це унікальна малінка, input прапорець на запис даних, 3 - номер 4-го датчика, який необхідно записати
        if (topic.includes("bits") || topic.includes("settings")) {
            console.log("спроба запису")
            const isForWrite = topic.includes("bits") ? true : false;
            const parts = topic.split("/"); // Розбиваємо топік на частини
            const sensorRegisterIndex = parts[2]; // Отримуємо третій елемент (індекс 2)
            console.log("index " + sensorRegisterIndex)
            if(sensorRegisterIndex>=10 || sensorRegisterIndex%2!=0){
                console.log("Для запису доступно лише перші 5 сенсорів і останній елемент топіку має бути парним(перший адрес)")
            } else{
                console.log("Для запису ")
                const number = JSON.parse(message.toString());
                connectAndWriteArray(number, sensorRegisterIndex, isForWrite);
            }
            
        }
});
}






connectToBroker();


async function readAndWriteDataToBroker() {
    readModbusData(modbusReadIP, modbusReadPort, mqttClient);
}

setInterval(() => readAndWriteDataToBroker(), 2000);
