require('dotenv').config();
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const privateKey = process.env.JWT_PRIVATE_KEY;
const Vault = require('../models/vaults');

function generateJWT(user) {
    const payload = {
        sub: user.email,
        id: user._id,
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
        return res.status(401).send('Email or password wrong');
    }
}

exports.registerAccount = async (req, res, next) => {
    const { username, email, auth_hash, salt, iterations } = req.body;

    try {
        const sample = await User.findOne({ email });
        if (sample) {
            return res.sendStatus(400).send('could not create your account');
        }

        const user = new User({ username, email, auth_hash, salt, iterations });
        await user.save();
        next();
    } catch (err) {
        return res.status(400).send('could not create user account');
    }
}

exports.login = async (req, res) => {
    const { email, auth_hash: authHashHex } = req.body;

    try {
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(401).send('Username or password is incorrect');
        } else {
            const recvHash = Buffer.from(authHashHex, 'hex');
            const storedHash = Buffer.from(user.auth_hash, 'hex');

            if (recvHash.length !== storedHash.length) {
                return res.status(401).send('Username or password is incorrect');
            }

            if (crypto.timingSafeEqual(recvHash, storedHash)) {
                const token = generateJWT(user);

                res.cookie('jwt', token, { // HTTP-Only Cookie
                    httpOnly: true,
                    secure: false, // TESTING PURPOSES, SERVE THE COOKIE VIA HTTPS
                    sameSite: 'Strict',
                    maxAge: 15 * 60 * 1000
                });
                return res.status(200).json({
                    username: user.username,
                    email: user.email,
                    salt: user.salt
                });
            } else {
                return res.status(400).send('Username or password is incorrect');
            }
        }
    } catch (err) {
        return res.sendStatus(500);
    }
}

exports.updateUser = async (req, res) => {
    const { id: id, sub: email } = req.user;

    try {

        if (req.headers['auth_hash']) {
            const authHashHex = req.headers['auth_hash'];

                const newEmail = req.body.email;
                let user = await User.findById(id);
        
                if (!user) {
                    return res.status(400).send('Username or password is incorrect');
                } else {
                    const recvHash = Buffer.from(authHashHex, 'hex');
                    const storedHash = Buffer.from(user.auth_hash, 'hex');
        
                    if (recvHash.length !== storedHash.length) {
                        return res.status(400).send('Master password is not correct');
                    }
        
                    if (crypto.timingSafeEqual(recvHash, storedHash)) {
                        if (req.body.username === undefined && req.body.email === undefined) {
                            user = await User.findOneAndUpdate(
                                { email },
                                { 
                                    auth_hash: req.body.auth_hash,
                                    salt: req.body.salt

                                },
                                { new: true }
                            )

                            const token = generateJWT(user);

                            res.cookie('jwt', token, { // HTTP-Only Cookie
                                httpOnly: true,
                                secure: false, // TESTING PURPOSES, SERVE THE COOKIE VIA HTTPS
                                sameSite: 'Strict',
                                maxAge: 15 * 60 * 1000
                            });
                            res.status(200).json({
                                email: user.email,
                                username: user.username,
                                salt: user.salt
                            });

                            return;
                        }

                        if (req.body.username.length && req.body.email.length) {
                            let repeated = await User.findOne({ newEmail });
                            if (repeated) {
                                return res.status(400).send('cannot update with this email');
                            }

                            user = await User.findOneAndUpdate(
                                { _id: id },
                                { 
                                    email: req.body.email,
                                    username: req.body.username

                                },
                                { new: true }
                            )

                            let vault = await Vault.findOneAndUpdate(
                                { email },
                                {
                                    email: req.body.email,
                                },
                                { new: true }
                            );

                            const token = generateJWT(user);

                            res.cookie('jwt', token, { // HTTP-Only Cookie
                                httpOnly: true,
                                secure: false, // TESTING PURPOSES, SERVE THE COOKIE VIA HTTPS
                                sameSite: 'Strict',
                                maxAge: 15 * 60 * 1000
                            });
                            res.status(200).json({
                                email: user.email,
                                username: user.username,
                                salt: user.salt
                            });

                            return;
                        } else if (req.body.email.length) {
                            let repeated = await User.findOne({ newEmail });
                            if (repeated) {
                                return res.status(400).send('cannot update with this email');
                            }

                            user = await User.findOneAndUpdate(
                                { _id: id },
                                { 
                                    email: req.body.email,

                                },
                                { new: true }
                            );

                            let vault = await Vault.findOneAndUpdate(
                                { email },
                                {
                                    email: req.body.email,
                                },
                                { new: true }
                            );

                            const token = generateJWT(user);

                            res.cookie('jwt', token, { // HTTP-Only Cookie
                                httpOnly: true,
                                secure: false, // TESTING PURPOSES, SERVE THE COOKIE VIA HTTPS
                                sameSite: 'Strict',
                                maxAge: 15 * 60 * 1000
                            });
                            return res.status(200).json({
                                email: user.email,
                                username: user.username,
                                salt: user.salt
                            });
                        } 
                    } else {
                        return res.status(401).send('master password is not correct');
                    }
                }
        
        } else {
            user = await User.findOneAndUpdate(
                { _id: id },
                { 
                    username: req.body.username

                },
                { new: true }
            )
            return res.status(200).json({
                email: user.email,
                username: user.username,
                salt: user.salt
            });
        }
    } catch (err) {
        res.sendStatus(500);
    }
}

exports.deleteUser = async (req, res) => {
    const { sub: email } = req.user;

    try {
        let user = await User.findOne({ email });
        if (!req.headers['auth_hash']) {
            return res.sendStatus(401);
        }

        const authHashHex = req.headers['auth_hash'];
        const recvHash = Buffer.from(authHashHex, 'hex');
        const storedHash = Buffer.from(user.auth_hash, 'hex');
        
        if (recvHash.length !== storedHash.length) {
            return res.status(401).send('Master password is not correct');
        }

        if (crypto.timingSafeEqual(recvHash, storedHash)) {
            const deleted_user = await User.deleteOne({ email: email });
            const deleted_vault = await Vault.deleteOne({ email: email });
            return res.sendStatus(200);
        } else {
            res.status(401).send('Master password is not correct');
        }
    } catch(err) {
        console.log(err);
        return res.sendStatus(500);
    }
}