const express = require('express');
const path = require('path');
const usersRouter = require('./users');
const routerApi = express.Router();


routerApi.use('/cryptography', express.static(path.join(__dirname, '/../../FRONTEND/cryptography_rs/pkg')));
routerApi.use('/css', express.static(path.join(__dirname, '/../../FRONTEND/assets/css')));
routerApi.use('/js', express.static(path.join(__dirname, '/../../FRONTEND/controllers/js')));
routerApi.use('/icon', express.static(path.join(__dirname, '/../../FRONTEND/assets/icon')));
routerApi.use('/users', usersRouter);

routerApi.get('/vaults', (req, res) => res.sendFile(path.resolve(__dirname+"/../../FRONTEND/views/vaults.html")));
routerApi.get('/settings', (req, res) => res.sendFile(path.resolve(__dirname+"/../../FRONTEND/views/settings.html")));
routerApi.get('/login', (req, res) => res.sendFile(path.resolve(__dirname+"/../../FRONTEND/views/login.html")));
routerApi.get('/register', (req, res) => res.sendFile(path.resolve(__dirname+"/../../FRONTEND/views/register.html")));
routerApi.get('/generator', (req, res) => res.sendFile(path.resolve(__dirname+"/../../FRONTEND/views/generator.html")));

module.exports = routerApi;
