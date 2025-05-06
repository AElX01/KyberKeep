const mongoose = require('mongoose');

const EntrySchema = new mongoose.Schema({
  item_name:  { type: String, required: true },
  url:  { type: String, required: true },
  encrypted_data: { type: String, required: true },
});  

const VaultSchema = new mongoose.Schema({
  email:        { type: String, required: true, unique: true },
  encrypted_vault: [ EntrySchema ],
});

module.exports = mongoose.model('Vault', VaultSchema);
