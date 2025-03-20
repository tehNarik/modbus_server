import mongoose from 'mongoose';

const sensorSchema = new mongoose.Schema({
    nameId: Number,
    value: mongoose.Schema.Types.Mixed ,
    timestamp: { type: Date, default: Date.now },
});

const deviceDataSchema = new mongoose.Schema({
    device_id: Number,
    ip_adress: String,
    port: Number,
    sensor: [sensorSchema]
});


export default mongoose.model('DeviceData', deviceDataSchema);
