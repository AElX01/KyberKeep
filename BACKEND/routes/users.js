const express = require('express');
const routerUsers = express.Router();
const usersController = require('../controllers/users_api_controller');
const authenticate = require('../middlewares/authenticate');

// Públicas
routerUsers.post('/register', usersController.registerUser);
routerUsers.post('/login',    usersController.loginUser);
routerUsers.post('/token',    usersController.refreshToken);
routerUsers.post('/logout',   usersController.logoutUser);

// Protegidas para CRUD perfil
routerUsers.get('/me',    authenticate, usersController.getUserInfo);
routerUsers.patch('/me',  authenticate, usersController.updateUserInfo);
routerUsers.delete('/me', authenticate, usersController.deleteUser);

module.exports = routerUsers;