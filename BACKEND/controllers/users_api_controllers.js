require('dotenv').config();
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const privateKey = process.env.JWT_PRIVATE_KEY;


function generateJWT(user) {
    const payload = {
        sub: user.email,
        name: user.username,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 15 * 60
    };

    const token = jwt.sign(payload, privateKey);
    return token;
}

exports.getSalt = async (req, res) => {
    const { email } = req.query;

    if (!email) {
        return res.status(400).send('Email is required');
    }

    try {
        const user = await User.findOne({ email });
        res.status(200).send(user.salt);
    } catch(err) {
        return res.sendStatus(500);
    }
}

exports.registerAccount = async (req, res) => {
    const { username, email, auth_hash, salt, iterations } = req.body;

    try {
        const user = new User({ username, email, auth_hash, salt, iterations });
        await user.save();
        return res.sendStatus(201);
    } catch (err) {
        return res.status(400).send('could not create user account');
    }
}

exports.login = async (req, res) => {
    const { email, auth_hash: authHashHex } = req.body;

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
                const token = generateJWT(user);

                res.cookie('jwt', token, { // HTTP-Only Cookie
                    httpOnly: true,
                    secure: false, // TESTING PURPOSES, SERVE THE COOKIE VIA HTTPS
                    sameSite: 'Strict',
                    maxAge: 15 * 60 * 1000
                });
                return res.status(200).send('Login successful');
            } else {
                return res.status(400).send('Username or password is incorrect. Try again');
            }
        }
    } catch (err) {
        return res.sendStatus(500);
    }
}