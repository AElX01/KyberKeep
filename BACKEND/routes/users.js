require('dotenv').config();
const express = require('express');
const usersController = require('../controllers/users_api_controllers');
const VaultsController = require('../controllers/vaults_api_controllers');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const routerUsers = express.Router();
const privateKey = process.env.JWT_PRIVATE_KEY;

routerUsers.use(cookieParser());


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

routerUsers.post('/register', usersController.registerAccount, VaultsController.createVault);
routerUsers.post('/login', usersController.login);
routerUsers.get('/logout', (req, res) => {
    res.clearCookie('jwt');
    res.redirect('/login');
})
routerUsers.get('/salt', usersController.getSalt);

routerUsers.patch('/update', authenticateRequest, usersController.updateUser);

routerUsers.delete('/delete', authenticateRequest, usersController.deleteUser);

module.exports = routerUsers;