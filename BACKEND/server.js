require('dotenv').config();
const port = process.env.PORT || 3000;
const mongoURI = process.env.MONGO_URI;
const express = require('express');
const mongoose = require('mongoose');
const router = require('./routes/api.js');
const app = express();
const port_app = 3000;

let db = mongoose.connection;


app.use(express.static('FRONTEND'));
app.use('/controllers', express.static('../FRONTEND/controllers'));
app.use('/views', express.static('../FRONTEND/views'));
app.use('/assets', express.static('../FRONTEND/assets'));


app.use(express.json());
app.use(router);

db.on('connecting', () => {
    console.log('connecting...');
    console.log(mongoose.connection.readyState);
});
db.on('connected', () => {
    console.log('[!] CONNECTED');
    console.log(mongoose.connection.readyState);
})

mongoose.connect(mongoURI);

app.listen(port, () => {
    console.log(`practice no.3 running on port ${port_app}!`);
})