import ModbusRTU from "modbus-serial";






// Асинхронна функція для зчитування даних з Modbus та публікації їх у MQTT
export const readModbusData = async function (IPaddress, port, mqttClient) {
    const startRegister = 0;
    const registersCount = 40;
    const deviceID = 1;
    
    const client = new ModbusRTU();
    await client.connectTCP(IPaddress, { port: port });
    client.setID(deviceID);

    try {
        const groupRegisters = await client.readInputRegisters(startRegister, registersCount);
        const groupFloatRegisters = modbusRegistersToFloat(groupRegisters.data, true);
        publishMessage("HP1/output/all", JSON.stringify(groupFloatRegisters), mqttClient);
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


function publishMessage(topic, message, mqttClient) {
    console.log(`Sending Topic: ${topic}, Message: ${message}`);
    mqttClient.publish(topic, message, { qos: 0, retain: true });
}