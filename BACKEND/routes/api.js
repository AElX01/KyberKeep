const express = require('express');
const path = require('path');
const routerApi = express.Router();

const usersRoutes = require('./users');
routerApi.use('/users', usersRoutes);

const vaultsRoutes = require('./vaults');
routerApi.use('/vaults', vaultsRoutes);


const authMiddleware = (req, res, next) => {
    const authHeader = req.headers['x-auth'];

    if (!authHeader) {
        return res.status(401).send('Unauthorized'); 
    }
    next();
};

routerApi.get('/', (req, res) => {
    const auth = req.headers["x-auth"];
    if (auth) {
        res.sendFile(path.resolve(__dirname + "/../../FRONTEND/views/home.html"));
    } else {
        res.sendFile(path.resolve(__dirname + "/../../FRONTEND/views/login.html"));
    }
});

routerApi.get('/login', (req, res) => {
    res.sendFile(path.resolve(__dirname + "/../../FRONTEND/views/login.html"));
});

routerApi.get('/register', (req, res) => {
    res.sendFile(path.resolve(__dirname + "/../../FRONTEND/views/register.html"));
});

routerApi.get('/status', authMiddleware, (req, res) => {
    res.sendFile(path.resolve(__dirname + "/../../FRONTEND/views/status.html"));
});

routerApi.get('/passwords', authMiddleware, (req, res) => {
    res.sendFile(path.resolve(__dirname + "/../../FRONTEND/views/passwords.html"));
});

routerApi.get('/settings', authMiddleware, (req, res) => {
    res.sendFile(path.resolve(__dirname + "/../../FRONTEND/views/settings.html"));
});

module.exports = routerApi;