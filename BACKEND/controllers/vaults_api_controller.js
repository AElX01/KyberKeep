const VaultController = {};
const VaultModel = require('../models/vault');

VaultController.getVault = async (req, res) => {
  try {
    const vault = await VaultModel.findOne({ user_id: req.user.sub });
    if (!vault) return res.status(404).json({ error: 'Vault no encontrado' });
    res.json({ encrypted_vault: vault.encrypted_vault });
  } catch { res.status(500).json({ error: 'Error interno' }); }
};

VaultController.createVault = async (req, res) => {
  try {
    const { encrypted_vault } = req.body;
    if (!encrypted_vault) {
      return res.status(400).json({ error: 'Encrypted_vault es requerido' });
    }
    const vault = new VaultModel({ user_id: req.user.sub, encrypted_vault });
    await vault.save();
    res.status(201).json({ message: 'Vault creado', vault });
  } catch (err) {
    res.status(500).json({ error: 'Error interno al crear vault' });
  }
};

VaultController.updateVault = async (req, res) => {
  try {
    const vault = await VaultModel.findOneAndUpdate(
      { user_id: req.user.sub },
      { encrypted_vault: req.body.encrypted_vault, last_accessed: Date.now() },
      { new: true }
    );
    if (!vault) return res.status(404).json({ error: 'Vault no encontrado' });
    res.json({ message: 'Vault actualizado', vault });
  } catch { res.status(500).json({ error: 'Error interno' }); }
};

VaultController.deleteVault = async (req, res) => {
  try {
    const { encrypted_vault } = req.body;
    if (!encrypted_vault) {
      return res.status(400).json({ error: 'Encrypted_vault es requerido para eliminar' });
    }

    const vault = await VaultModel.findOneAndDelete({
      user_id: req.user.sub,
      encrypted_vault
    });

    if (!vault) {
      return res.status(404).json({ error: 'Vault no encontrado o mismatched encrypted_vault' });
    }

    res.json({ message: 'Vault eliminado' });
  } catch {
    res.status(500).json({ error: 'Error interno' });
  }
};

module.exports = VaultController;