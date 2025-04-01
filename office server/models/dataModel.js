// dataModel.js

import mongoose from "mongoose"

// Визначення схеми для даних
export const DataSchema = new mongoose.Schema({
  sensors: Object, // Об'єкт, що представляє сенсори
  timestamp: { type: Date, default: Date.now }, // Час збереження запису
});


export default mongoose.model('Data', DataSchema);