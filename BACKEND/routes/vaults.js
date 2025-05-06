require('dotenv').config();
const express = require('express');
const VaultsController = require('../controllers/vaults_api_controllers');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const routerVaults = express.Router();
const privateKey = process.env.JWT_PRIVATE_KEY;

routerVaults.use(cookieParser());

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

routerVaults.post('/new', authenticateRequest, VaultsController.createVault);
routerVaults.post('/add', authenticateRequest, VaultsController.addEntry);
routerVaults.post('/clone/:entry', authenticateRequest, VaultsController.cloneEntry);

routerVaults.get('/getvault/:toGet', authenticateRequest, VaultsController.getLoginInfo);

module.exports = routerVaults;