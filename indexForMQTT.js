import mqtt from "mqtt";
import ModbusRTU from "modbus-serial";

var mqttClient;

const mqttHost = "127.0.0.1";
const protocol = "mqtt";
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
        
        
        // Підключення до Modbus slave
        client.connectTCP("127.0.0.1", { port: 502 }) // Вкажіть адресу та порт Modbus slave
            .then(() => {
                client.setID(1); // ID вашого Modbus slave
                console.log("Connected to Modbus slave!");
        
                // Масив чисел, які потрібно записати
                const numbersToWrite = [1234, 5678, 9101, 1121];
                const startingAddress = 10; // Початкова адреса запису
        
                // Записуємо масив чисел у Holding Registers
                return client.writeRegisters(startingAddress, numbersToWrite);
            })
            .then(() => {
                console.log("Data successfully written to Modbus registers!");
                client.close();
            })
            .catch(err => {
                console.error("Error: ", err);
                //client.close();
            });
        

        publishMessage("modbus/data", JSON.stringify(groupFloatRegisters));
        //console.log("--- NEW RECORD ---");
        //console.log(groupFloatRegisters);
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
        mqttClient.subscribe("modbus/write", (err) => {
            if (!err) {
                console.log("Subscribed to topic: modbus/write");
            }
        });
    });

    mqttClient.on("message", async (topic, message) => {
        console.log("Received Message: " + message.toString() + "\nOn topic: " + topic);
        if (topic === "modbus/data") {
            const data = JSON.parse(message);
            const client = new ModbusRTU();
            try {
                await client.connectTCP(modbusWriteIP, { port: modbusWritePort });
                client.setID(1);
                await client.writeRegister(data.address, data.value);
                console.log("Data sent to local Modbus.");
            } catch (error) {
                console.error("Error writing to Modbus:", error);
            } finally {
                client.close();
            }
        }
    });
}

function floatToRegisters(value) {
    const buffer = Buffer.alloc(4);
    buffer.writeFloatBE(value, 0); // Записуємо float у буфер (Big Endian)
    return [buffer.readUInt16BE(0), buffer.readUInt16BE(2)];
}


async function connectAndWriteArray(arrayData) {
    try {
        const client = new ModbusRTU();
        console.log("Спроба підключення до Modbus...");
        await client.connectTCP("127.0.0.1", { port: 502 });
        console.log("Підключено!");

        client.setID(1);

        for(let i=0; i<arrayData.length; i++){
            const floatValue = arrayData[i];
            const registers = floatToRegisters(floatValue);
            await client.writeRegisters(i*2, registers);
            //console.log(`Float ${arrayData[i]} записано у регістри ${i}-${i+1}`)
        }

        // Запис одного float числа у регістр 10-11
        // const floatValue = 12.34;
        // const registers = floatToRegisters(floatValue);
        // await client.writeRegisters(10, registers);
        // console.log(`Float ${floatValue} записано у регістри 10-11:`, registers);

        

        client.close();
        console.log("З'єднання закрито");
    } catch (error) {
        console.error("Помилка підключення:", error);
    }
}

// Функція для публікації повідомлень у MQTT брокер
function publishMessage(topic, message) {
    console.log(`Sending Topic: ${topic}, Message: ${message}`);
    mqttClient.publish(topic, message, { qos: 0, retain: false });
}

const client = mqtt.connect('mqtt://127.0.0.1:1883'); // замініть на адресу вашого брокера

// Коли підключення буде успішним
client.on('connect', () => {
    console.log('Підключено до брокера');

    // Підписка на топік
    client.subscribe('modbus/data', (err) => {
        if (!err) {
            console.log('Успішно підписано на топік "my/topic"');
        } else {
            console.error('Помилка підписки', err);
        }
    });
});

// Обробка повідомлень, які приходять на топік
client.on('message', (topic, message) => {
    // Виводимо топік і повідомлення
    // можна зробити різні топіки для різних сенсорів та імена записувати в бд
    let numericArray = JSON.parse(message.toString());

    // Виконуємо подальші операції з масивом
    connectAndWriteArray(numericArray);
    //console.log(`Топік: ${topic}`);
    //console.log(`Повідомлення: ${message.toString()}`);
});

// Підключення до брокера
connectToBroker();

// Зчитування даних з віддаленого Modbus та публікація в MQTT
setInterval(() => readModbusData(modbusReadIP, modbusReadPort), 2000);
