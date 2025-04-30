const expressVaults = require('express');
const routerVaults  = expressVaults.Router();
const vaultsController = require('../controllers/vaults_api_controller');
const authenticateVault = require('../middlewares/authenticate');

routerVaults.use(authenticateVault);
routerVaults.get('/',    vaultsController.getVault);
routerVaults.post('/',   vaultsController.createVault);
routerVaults.patch('/',  vaultsController.updateVault);
routerVaults.delete('/', vaultsController.deleteVault);

module.exports = routerVaults;