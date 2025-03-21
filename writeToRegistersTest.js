import ModbusRTU from "modbus-serial";
import mqtt from 'mqtt'

// Створюємо новий клієнт
const client = new ModbusRTU();

// Функція для перетворення float у два 16-бітові значення
function floatToRegisters(value) {
    const buffer = Buffer.alloc(4);
    buffer.writeFloatBE(value, 0); // Записуємо float у буфер (Big Endian)
    return [buffer.readUInt16BE(0), buffer.readUInt16BE(2)];
}

// Підключення та запис
async function connectAndWrite() {
    try {
        console.log("Спроба підключення до Modbus...");
        await client.connectTCP("127.0.0.1", { port: 502 });
        console.log("Підключено!");

        client.setID(1);

        // Запис одного float числа у регістр 10-11
        const floatValue = 12.34;
        const registers = floatToRegisters(floatValue);
        await client.writeRegisters(10, registers);
        console.log(`Float ${floatValue} записано у регістри 10-11:`, registers);

        // Запис іншого float у регістр 20-21
        const anotherFloat = -45.67;
        await client.writeRegisters(20, floatToRegisters(anotherFloat));
        console.log(`Float ${anotherFloat} записано у регістри 20-21`);

        client.close();
        console.log("З'єднання закрито");
    } catch (error) {
        console.error("Помилка підключення:", error);
    }
}

// Виконуємо функцію
connectAndWrite();
