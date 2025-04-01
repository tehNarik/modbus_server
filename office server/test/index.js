const mysql = require('mysql');

const db = mysql.createConnection({
    host: "modbusdatadb.c5gw02suiar0.eu-central-1.rds.amazonaws.com",
    port: "3306",
    user: "admin",
    password: "passwordforModbusDataDB",
    database: "modbusdatadb"
})


db.connect(err=>{
    if(err){
        console.log(err.message);
        return;
    }
    console.log("Database connected.")
})