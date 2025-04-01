import express from "express";
import mqtt from "mqtt";
import mongoose from "mongoose";
import { getLatestData, writeData } from "./controllers/UserController.js";
import DataModel from "./models/dataModel.js";


const app = express();
app.use(express.json());
const PORT = 3000;

// MQTT налаштування
const protocol = "mqtt";
const mqttHost = "3.79.235.175";
const port = "1883";
const topic = "HP1/output/all"; // Вкажіть ваш топік для підписки

// MongoDB налаштування
const mongoURI = "mongodb+srv://symonenkomykhailo:Zy1mRjaWKQMVt5kb@cluster0.yqslo.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"; 



// Підключення до MongoDB
mongoose.connect(mongoURI).then(() => console.log("Підключено до MongoDB")).catch((err) => console.error("Помилка підключення до MongoDB:", err));


// Підключення до MQTT-брокера
const mqttClient = mqtt.connect(`${protocol}://${mqttHost}:${port}`);

mqttClient.on("connect", () => {
  console.log("Підключено до MQTT-брокера");
  mqttClient.subscribe(topic, (err) => {
    if (err) {
      console.error("Помилка підписки:", err);
    } else {
      console.log(`Підписано на топік: ${topic}`);
    }
  });
});

// Функція для перетворення даних у потрібний формат
function formatMessageToSensors(message) {

  const sensorKeys = ["sensor_1", "sensor_3", "sensor_5", "sensor_7", "sensor_9", "sensor_11", "sensor_13", "sensor_15", "sensor_17", "sensor_19", "sensor_21", "sensor_23", "sensor_25", "sensor_27", "sensor_29", "sensor_31", "sensor_33", "sensor_35", "sensor_37", "sensor_39"]; // Ключі сенсорів
  const values = message.replace(/\[|\]/g, "").split(",").map(Number);
  //console.log(values);

  const sensors = {};
  values.forEach((value, index) => {
    if (sensorKeys[index]) {
      sensors[sensorKeys[index]] = value; // Призначення значень сенсорам
    }
  });

  return sensors;
}

// Обробка отриманих MQTT-повідомлень
mqttClient.on("message", async (topic, message) => {
  //console.log(`Отримано повідомлення з топіка "${topic}": ${message.toString()}`);

  try {
    //console.log(message.toString())
    // Форматування повідомлення
    const sensors = formatMessageToSensors(message.toString());
    //console.log(sensors)
    // Збереження даних у MongoDB
    const data = new DataModel({ sensors });
    await data.save();
    //console.log("Дані збережено у базу даних у форматі сенсорів");
  } catch (err) {
    console.error("Помилка обробки або збереження повідомлення:", err);
  }
});




// Маршрут для отримання останніх даних
app.get("/latest-data", getLatestData);

app.post("/write-data", writeData);





// Запуск сервера Express
app.listen(PORT, () => {
  console.log(`Сервер працює на http://localhost:${PORT}`);
});
