const mongooseVault = require('mongoose');
const vaultSchema = new mongooseVault.Schema({
  user_id:         { type: mongooseVault.Schema.Types.ObjectId, ref: 'User', required: true },
  encrypted_vault: { type: String, required: true },
  last_accessed:   { type: Date, default: Date.now }
}, {
  collection: 'Vault',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

module.exports = mongooseVault.model('Vault', vaultSchema);
