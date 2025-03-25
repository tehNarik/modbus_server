import mqtt from "mqtt";
import ModbusRTU from "modbus-serial";
const clientModbus = new ModbusRTU();
var mqttClient;

//const mqttHost = "127.0.0.1";
const protocol = "mqtt";
const mqttHost = "3.79.235.175"
const port = "1883";
const modbusReadIP = "91.225.166.71";
const modbusReadPort = 850;
const modbusWriteIP = "127.0.0.1";
const modbusWritePort = 502;

// Асинхронна функція для зчитування даних з Modbus та публікації їх у MQTT
async function readModbusData(IPaddress, port) {
    const startRegister = 0;
    const registersCount = 40;
    const deviceID = 1;

    const client = new ModbusRTU();
    await client.connectTCP(IPaddress, { port: port });
    client.setID(deviceID);

    try {
        const groupRegisters = await client.readInputRegisters(startRegister, registersCount);
        const groupFloatRegisters = modbusRegistersToFloat(groupRegisters.data, true);
        publishMessage("HP1/output/all", JSON.stringify(groupFloatRegisters));
    } catch (error) {
        console.error("Error:", error);
    } finally {
        client.close();
    }
}

// Функція для перетворення регістрів Modbus у значення з плаваючою комою
function modbusRegistersToFloat(groupRegisters, swapWords = false) {
    let floats = [];
    for (let i = 0; i < groupRegisters.length; i += 2) {
        let buffer = new ArrayBuffer(4);
        let view = new DataView(buffer);
        if (swapWords) {
            view.setUint16(0, groupRegisters[i + 1], false);
            view.setUint16(2, groupRegisters[i], false);
        } else {
            view.setUint16(0, groupRegisters[i], false);
            view.setUint16(2, groupRegisters[i + 1], false);
        }
        let floatValue = view.getFloat32(0, false);
        floats.push(parseFloat(floatValue.toFixed(4)));
    }
    return floats;
}

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
        mqttClient.subscribe("HP1/input/3", (err) => {
            if (!err) {
                console.log("Subscribed to topic: HP1/input/3");
            }
        });
    });


    mqttClient.on('message', (topic, message) => {
        // const parts = topic.split("/"); // Розбиваємо топік на частини
        // const sensorID = parts[2];
        // HP1/input/3,      де HP1 це унікальна малінка, input прапорець на запис даних, 3 - номер датчика, який необхідно записати
        if (topic.includes("input")) {
            const parts = topic.split("/"); // Розбиваємо топік на частини
            const sensorID = parts[2]; // Отримуємо третій елемент (індекс 2)
            console.log(`Записано в HP1 датчик ${sensorID}: ${message}`)

            let number = JSON.parse(message.toString());
            connectAndWriteArray(number, sensorID);
        }
});
}

function floatToRegisters(value) {
    const buffer = Buffer.alloc(4);
    buffer.writeFloatBE(value, 0); // Записуємо float у буфер (Big Endian)
    return [buffer.readUInt16BE(0), buffer.readUInt16BE(2)];
}

async function connectAndWriteArray(floatValue, sensorID) {
    let attempt = 0;
    const maxAttempts = 3; // Максимальна кількість спроб підключення
    const delay = 2000; // Затримка між спробами (2 секунди)

    while (attempt < maxAttempts) {
        try {
            // Спроба підключення до сервера
            console.log(`Спроба підключення... (${attempt + 1}/${maxAttempts})`);
            await clientModbus.connectTCP(modbusWriteIP, { port: modbusWritePort });
            clientModbus.setID(1);

            const registers = floatToRegisters(floatValue);
            await clientModbus.writeRegisters(sensorID * 2, registers);
            clientModbus.close();
            console.log(`Число ${floatValue} в датчик ${sensorID} записано!`);
            return; // Виходимо з функції після успішного виконання
        } catch (error) {
            attempt++;
            console.error(`Помилка підключення: ${error.message}`);
            if (attempt < maxAttempts) {
                console.log(`Чекаємо ${delay / 1000} секунд перед наступною спробою...`);
                await new Promise(resolve => setTimeout(resolve, delay)); // Затримка перед повтором
            } else {
                console.log("Не вдалося підключитися після кількох спроб.");
                console.log(`Число ${floatValue} в датчик ${sensorID} НЕ записано!`);
            }
        }
    }
}


function publishMessage(topic, message) {
    //console.log(`Sending Topic: ${topic}, Message: ${message}`);
    mqttClient.publish(topic, message, { qos: 0, retain: true });
}

connectToBroker();

setInterval(() => readModbusData(modbusReadIP, modbusReadPort), 2000);
