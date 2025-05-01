const express = require('express');
const routerUsers = express.Router();

routerUsers.post('/register', (req, res) => {
    const { username, email, password, confirm_password } = req.body;

    console.log('Username:', username);
    console.log('Password:', password);
    console.log('Email', email);
    console.log('Confirm Password', confirm_password);
})

//routerUsers.post('/login')

module.exports = routerUsers;