import express from 'express';
import dotenv from 'dotenv';
import mongoose from "mongoose"
import ModbusRTU from 'modbus-serial';
import Device from './models/Device.js';

dotenv.config();

mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('DB ok'))
    .catch(err => console.log('DB connection error:', err));


const app = express()
app.set('view engine', 'ejs');
app.set('views', './views');

app.get('/device',
    async (req, res) => {
        try {
            const devices = await Device.find();
            res.render('index', { devices });
        } catch (error) {
            console.error(error);
            res.status(500).send('Помилка сервера');
        }
    }
)


// Запит для отримання датчиків конкретного пристрою
// app.get("/device/:deviceId/sensors", async (req, res) => {
//     try {
//         const { deviceId } = req.params;

//         // Знайдемо пристрій за device_id
//         const device = await Device.findOne({ device_id: deviceId });

//         if (!device) {
//             return res.status(404).json({ error: "Device not found" });
//         }

//         // Відповідаємо з датчиками цього пристрою
//         res.json(device.sensor);
//     } catch (error) {
//         console.error("Error fetching sensors:", error);
//         res.status(500).json({ error: "Server error" });
//     }
// });


// app.get('/sensor/:sensorId/data', async (req, res) => {
//     try {
//         const sensorId = req.params.sensorId;
//         const device = await Device.findOne({ 'sensor.id': sensorId });

//         if (!device) {
//             return res.status(404).json({ message: 'Device not found' });
//         }

//         const sensorData = device.sensor.find(sensor => sensor.id === parseInt(sensorId));

//         if (!sensorData) {
//             return res.status(404).json({ message: 'Sensor not found' });
//         }

//         // Перевірка, чи є sensorData.value масивом
//         if (Array.isArray(sensorData.value)) {
//             const data = sensorData.value.map(val => ({
//                 timestamp: val.timestamp,
//                 value: val.value
//             }));
//             res.json(data);
//         } else {
//             // Якщо sensorData.value не є масивом
//             res.status(500).json({ message: 'Sensor value is not an array' });
//         }
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ message: 'Server error' });
//     }
// });



// // Запит для отримання даних для декількох датчиків
// app.get('/sensors/data', async (req, res) => {
//     try {
//         const sensorIds = req.query.sensorIds.split(',');
//         console.log("Запит на отримання даних для сенсорів:", sensorIds);

//         const dataPromises = sensorIds.map(async (sensorId) => {
//             const device = await Device.findOne({ 'sensor.id': sensorId });

//             if (!device) {
//                 console.error(`Пристрій для сенсора ${sensorId} не знайдений`);
//                 return { sensorId, data: [] }; // Повертаємо порожній масив, якщо пристрій не знайдений
//             }

//             const sensorData = device.sensor.filter(sensor => sensor.id === parseInt(sensorId));

//             if (sensorData.length === 0) {
//                 console.error(`Дані для сенсора ${sensorId} не знайдені`);
//                 return { sensorId, data: [] }; // Повертаємо порожній масив, якщо дані не знайдені
//             }

//             return {
//                 sensorId,
//                 data: sensorData[0].value.map(val => ({
//                     timestamp: val.timestamp,
//                     value: val.value
//                 }))
//             };
//         });

//         const data = await Promise.all(dataPromises);

//         if (data.length === 0) {
//             return res.json([]); // Повертаємо порожній масив, якщо немає даних
//         }

//         console.log("Дані для сенсорів:", data);
//         res.json(data);
//     } catch (error) {
//         console.error("Помилка на сервері:", error);
//         res.status(500).json({ message: 'Server error' });
//     }
// });

// app.get('/devices', async (req, res) => {
//     try {
//         const devices = await Device.find();
//         console.log("devices" + devices)
//         res.render('devices', { devices });
//     } catch (error) {
//         console.error(error);
//         res.status(500).send('Помилка сервера');
//     }
// });

// app.get('/devices/:id', async (req, res) => {
//     try {
//         const device = await Device.findById(req.params.id);
//         if (!device) {
//             return res.status(404).send('Пристрій не знайдено');
//         }
//         res.render('device-details', { device });
//     } catch (error) {
//         console.error(error);
//         res.status(500).send('Помилка сервера');
//     }
// });

// app.get('/devices/:id/latest-sensors', async (req, res) => {
//     try {
//         const device = await Device.findById(req.params.id);
//         if (!device) {
//             return res.status(404).json({ error: 'Пристрій не знайдено' });
//         }

//         let latestSensors = {};
//         device.sensor.forEach(sensor => {
//             latestSensors[sensor.nameId] = sensor;
//         });

//         res.json({ device, latestSensors: Object.values(latestSensors) });
//     } catch (error) {
//         res.status(500).json({ error: 'Помилка сервера' });
//     }
// });

// app.get('/devices/:deviceId/historical-sensors', async (req, res) => {
//     const { deviceId } = req.params;
//     const { start, end } = req.query;

//     try {
//         const device = await Device.findById(deviceId);

//         if (!device) {
//             return res.status(404).json({ message: 'Пристрій не знайдено' });
//         }

//         const historicalSensors = device.sensor.filter(sensor =>
//             new Date(sensor.timestamp) >= new Date(start) && new Date(sensor.timestamp) <= new Date(end)
//         );

//         res.json({ historicalSensors });
//     } catch (error) {
//         console.error('Помилка при отриманні історичних даних:', error);
//         res.status(500).json({ message: 'Помилка сервера' });
//     }
// });


async function readModbusData(IPadress, port) {
    const startRegister = 0;
    const registersCount = 40;
    const deviceID = 1;

    const client = new ModbusRTU();
    await client.connectTCP(IPadress, { port: port });
    client.setID(deviceID);

    try {
        // const coolingOut = await client.readInputRegisters(50, 2);
        // const DHWOut = await client.readInputRegisters(48, 2);
        // const heatingOut = await client.readInputRegisters(46, 2);

        const groupRegisters = await client.readInputRegisters(startRegister, registersCount);

        // const floatCoolingOut = modbusRegistersToFloat(coolingOut.data, true);
        // const floatDHWOut = modbusRegistersToFloat(DHWOut.data, true);
        // const floatHeatingOut = modbusRegistersToFloat(heatingOut.data, true);

        const groupFloatRegisters = modbusRegistersToFloat(groupRegisters.data, true);

        // console.log("CoolingOut:", floatCoolingOut);
        // console.log("DHWOut:", floatDHWOut);
        // console.log("HeatingOut:", floatHeatingOut);

        //saveToMongoDB(IPadress, port, deviceID, groupFloatRegisters)
        console.log("--- NEW RECORD ---")
        console.log(groupFloatRegisters);
    } catch (error) {
        console.error("Error:", error);
    } finally {
        client.close();
    }
}

function modbusRegistersToFloat(groupRegisters, swapWords = false) {
    let floats = [];

    for (let i = 0; i < groupRegisters.length; i += 2) {
        let buffer = new ArrayBuffer(4);
        let view = new DataView(buffer);

        if (swapWords) {
            view.setUint16(0, groupRegisters[i + 1], false); // Старший регістр
            view.setUint16(2, groupRegisters[i], false); // Молодший регістр
        } else {
            view.setUint16(0, groupRegisters[i], false);
            view.setUint16(2, groupRegisters[i + 1], false);
        }

        floats.push(view.getFloat32(0, false));
    }

    return floats;
}


// async function saveToMongoDB(ip, port, device_id, data) {
//     try {
//         const sensors = data.map((value, index) => ({
//             id: index + 1,
//             nameId: index + 1,
//             value: value
//         }));



//         const device = await Device.findOneAndUpdate(
//             { ip_adress: ip, port: port, device_id: device_id },
//             { $setOnInsert: { ip_adress: ip, port: port, device_id: device_id, sensor: [] } },
//             { upsert: true, returnDocument: 'after' }
//         );

        
//         await Device.updateOne(
//             { _id: device._id },
//             { $push: { sensor: { $each: sensors } } }
//         );

         

//         console.log("Дані успішно збережені!");
//     } catch (error) {
//         console.error("Помилка при збереженні в MongoDB:", error);
//     }
// }

 
setInterval(() => readModbusData("91.225.166.71", 850), 5000);





const PORT = process.env.PORT || 4445;
app.listen(PORT, (err)=>{
    if(err){
        return console.log(err);
    }
    console.log('Server OK');
})