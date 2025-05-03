require('dotenv').config();
const privateKey = process.env.JWT_PRIVATE_KEY;
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const usersRouter = require('./users');
const jwt = require('jsonwebtoken');
const routerApi = express.Router();
const routerUsers = express.Router();



function authenticateRequest(req, res, next) {
    try {
        const token = req.cookies.jwt;

        if (!token) {
            return res.status(401).send('Unauthorized: No token provided');
        }
            const decoded = jwt.verify(token, privateKey);
            req.user = decoded;
            next();
    } catch(err) {
        return res.status(401).send('Unauthorized: Invalid token');
    }
}

routerApi.use(cookieParser());
routerApi.use('/cryptography', express.static(path.join(__dirname, '/../../FRONTEND/cryptography_rs/pkg')));
routerApi.use('/css', express.static(path.join(__dirname, '/../../FRONTEND/assets/css')));
routerApi.use('/js', express.static(path.join(__dirname, '/../../FRONTEND/controllers/js')));
routerApi.use('/icon', express.static(path.join(__dirname, '/../../FRONTEND/assets/icon')));
routerApi.use('/users', usersRouter);

routerApi.get('/', authenticateRequest,(req, res) => res.sendFile(path.resolve(__dirname+"/../../FRONTEND/views/vaults.html")));
routerApi.get('/settings', (req, res) => res.sendFile(path.resolve(__dirname+"/../../FRONTEND/views/settings.html")));
routerApi.get('/login', (req, res) => res.sendFile(path.resolve(__dirname+"/../../FRONTEND/views/login.html")));
routerApi.get('/register', (req, res) => res.sendFile(path.resolve(__dirname+"/../../FRONTEND/views/register.html")));
routerApi.get('/generator', (req, res) => res.sendFile(path.resolve(__dirname+"/../../FRONTEND/views/generator.html")));

module.exports = routerApi;
