const express = require('express');
const generatorController = require('../controllers/generator_api_controllers');
const routerGenerators = express.Router();
const privateKey = process.env.JWT_PRIVATE_KEY;
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

routerGenerators.use(cookieParser());

function verifyOptions(req, res, next) {
    next();
}

function authenticateRequest(req, res, next) {
    try {
        const token = req.cookies.jwt;

        if (!token) {
            return res.redirect('/login');
        }
            const decoded = jwt.verify(token, privateKey);
            req.user = decoded;
            next();
    } catch(err) {
        return res.status(401).send('Unauthorized: Invalid token');
    }
}

routerGenerators.post('/password', authenticateRequest, verifyOptions, generatorController.generatePassword);
routerGenerators.post('/username', authenticateRequest, generatorController.generateUsername);

module.exports = routerGenerators