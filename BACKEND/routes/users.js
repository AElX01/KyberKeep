require('dotenv').config();
const express = require('express');
const usersController = require('../controllers/users_api_controllers');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const routerUsers = express.Router();
const privateKey = process.env.JWT_PRIVATE_KEY;

routerUsers.use(cookieParser());

async function authenticateCriticalActionRequest(req, res, next) {
    const { auth_hash: authHashHex } = req.body;
    const email = req.user;
    
        try {
            const user = await User.findOne({ email });
    
            if (!user) {
                return res.status(400).send('Username or password is incorrect. Try again');
            } else {
                const recvHash = Buffer.from(authHashHex, 'hex');
                const storedHash = Buffer.from(user.auth_hash, 'hex');
    
                if (recvHash.length !== storedHash.length) {
                    return res.status(400).send('Username or password is incorrect. Try again');
                }
    
                if (crypto.timingSafeEqual(recvHash, storedHash)) {
                    next();
                } else {
                    return res.status(401).send('Incorrect master password');
                }
            }
        } catch (err) {
            return res.sendStatus(500);
        }
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

routerUsers.post('/register', usersController.registerAccount);
routerUsers.post('/login', usersController.login);
routerUsers.get('/logout', (req, res) => {
    res.clearCookie('jwt');
    res.redirect('/login');
})
routerUsers.get('/salt', usersController.getSalt);

routerUsers.patch('/update', authenticateRequest, usersController.updateUser);

module.exports = routerUsers;