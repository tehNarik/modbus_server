import ModbusRTU from "modbus-serial";


export const connectAndWriteArray = async function (floatValue, sensorID, flag) {
    const modbusWriteIP = "127.0.0.1";
    const modbusWritePort = 502;
    let attempt = 0;
    const maxAttempts = 3; // Максимальна кількість спроб підключення
    const delay = 2000; // Затримка між спробами (2 секунди)
    const clientModbus = new ModbusRTU();
    while (attempt < maxAttempts) {
        try {
            // Спроба підключення до сервера
            console.log(`Спроба підключення... (${attempt + 1}/${maxAttempts})`);
            await clientModbus.connectTCP(modbusWriteIP, { port: modbusWritePort });
            clientModbus.setID(1);

            const registers = floatToRegisters(floatValue);

            const sensorAddress = flag ? sensorID  : parseInt(sensorID, 10)  + 10;

            await clientModbus.writeRegisters(sensorAddress, registers);
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



function floatToRegisters(value) {
    const buffer = Buffer.alloc(4);
    buffer.writeFloatBE(value, 0); // Записуємо float у буфер (Big Endian)
    return [buffer.readUInt16BE(0), buffer.readUInt16BE(2)];
}

