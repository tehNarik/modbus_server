import mqtt from 'mqtt'

// Підключення до брокера Mosquitto
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
    console.log(`Топік: ${topic}`);
    console.log(`Повідомлення: ${message.toString()}`);
});
