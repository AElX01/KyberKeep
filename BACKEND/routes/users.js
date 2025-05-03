const express = require('express');
const usersController = require('../controllers/users_api_controllers');
const jwt = require('jsonwebtoken');
const routerUsers = express.Router();
require('dotenv').config();


function authenticateRequest(req, res, next) {
    try {
        const token = req.cookies.jwt;

        if (!token) {
            return res.status(401).send('Unauthorized: No token provided');
        }

            const privateKey = process.env.JWT_PRIVATE_KEY;
            const decoded = jwt.verify(token, privateKey);
            req.user = decoded;
            next();
    } catch(err) {
        return res.status(401).send('Unauthorized: Invalid token');
    }
}

routerUsers.post('/register', usersController.registerAccount);
routerUsers.post('/login', usersController.login);
routerUsers.post('/logout', (req, res) => {
    res.clearKookie('jwt');
    res.status(200).send('Logged out successfully');
})

routerUsers.get('/salt', usersController.getSalt);

module.exports = routerUsers;