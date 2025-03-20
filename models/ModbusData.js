import mongoose from "mongoose"

const modbusData = new mongoose.Schema({
    timestamp: { type: Date, default: Date.now },
    device_id: Number,
    data_type: String,
    value: mongoose.Schema.Types.Mixed // Може бути числом, масивом або іншим типом
});

export default mongoose.model('ModbusData', modbusData);