const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username:               { type: String, required: true, unique: true, trim: true },
  email:                  { type: String, required: true, unique: true, lowercase: true, trim: true },
  hashed_master_password: { type: String, required: true },
  salt:                   { type: String, required: true },
  public_key:             { type: String, required: true },
  encrypted_private_key:  { type: String, required: true },
  encrypted_vault_key:    { type: String, required: true },
  roles:                  { type: [String], default: ['user'] },
  refreshTokens:          { type: [String], default: [] }
}, {
  collection: 'Users',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Verificar contraseña maestra recibida desde el front (ya hasheada)
userSchema.methods.verifyMasterPassword = function(candidateHashed) {
  return candidateHashed === this.hashed_master_password;
};

module.exports = mongoose.model('User', userSchema);