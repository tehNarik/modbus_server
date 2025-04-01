import mqtt from "mqtt";
import DataModel from "../models/dataModel.js"
const protocol = "mqtt";
const mqttHost = "3.79.235.175"
const port = "1883";
var mqttClient;

// Функція для отримання останніх даних
export const getLatestData = async function (req, res) {
  try {
    const { device } = req.body;
    if (!device) {
      return res.status(400).json({ message: "Будь ласка, заповніть всі обов'язкові поля" });
    }

    //const clientId = "client" + Math.random().toString(36).substring(7);
    const hostURL = `${protocol}://${mqttHost}:${port}`;
    const options = {
        keepalive: 60,
        //clientId: clientId,
        protocolId: "MQTT",
        protocolVersion: 4,
        clean: true,
        reconnectPeriod: 1000,
        connectTimeout: 30 * 1000,
    };

    mqttClient = mqtt.connect(hostURL, options);

    mqttClient.subscribe(`${device}/output/all`, (err) => {
      if (!err) {
          console.log(`Subscribed to topic: ${device}/output/all`);
      }
    });
    let result;

    mqttClient.on("message", (topic, message) => {
      console.log(`Message received from ${topic}: ${message.toString()}`);
      result = message.toString();
  
      // Відправка даних клієнту
      if (!res.headersSent) {
          res.json({ topic, message: result });
      }
  
      // Закриття з'єднання після отримання даних
      mqttClient.end(() => {
          console.log("Connection to the broker closed.");
      });
    });
  

    
    // const latestData = await DataModel.findOne().sort({ timestamp: -1 }); // Знаходимо останній документ за часом
    // if (!latestData) {
    //   return res.status(404).json({ message: "Дані не знайдено" });
    // }
     // Повертаємо останні дані у форматі JSON
  } catch (err) {
    console.error("Помилка отримання даних:", err);
    res.status(500).json({ message: "Помилка сервера" });
  }
};



// writeDataController.js

export const writeData = async function(req, res)  {
    try {
      // Отримуємо дані з тіла запиту
      const { device, topic_type, sensor_index, data } = req.body;
  
      // Перевірка чи всі поля передані
      if (!device || !topic_type || !sensor_index) {
        return res.status(400).json({ message: "Будь ласка, заповніть всі обов'язкові поля" });
      }

      if(Number(sensor_index)>4) {
        return res.status(400).json({ message: "Індекс сенсора має бути від 0 до 4" });
      }
  
      const register_index = sensor_index*2;

      const topic = `${device}/${topic_type}/${register_index}`;
      console.log(`Формований топік: ${topic}`);



      const hostURL = `${protocol}://${mqttHost}:${port}`;
    const options = {
        keepalive: 60,
        //clientId: clientId,
        protocolId: "MQTT",
        protocolVersion: 4,
        clean: true,
        reconnectPeriod: 1000,
        connectTimeout: 30 * 1000,
    };

    mqttClient = mqtt.connect(hostURL, options);

    mqttClient.on("connect", () => {
      console.log("Connected to broker!");
  
  
      mqttClient.publish(topic, data, { qos: 0, retain: false }, (err) => {
          if (!err) {
              console.log(`Message "${data}" sent to topic: ${topic}`);
          } else {
              console.error("Error sending message:", err);
          }
  
          // Закриття з'єднання після надсилання повідомлення
          mqttClient.end(() => {
              console.log("Connection to broker closed.");
          });
      });
  });
  
      // Успішна відповідь
      res.status(200).json({ message: "Дані успішно оброблені", topic });
    } catch (err) {
      console.error("Помилка під час обробки запиту:", err);
      res.status(500).json({ message: "Внутрішня помилка сервера" });
    }
  };
  

