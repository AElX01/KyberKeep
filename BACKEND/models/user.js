const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
   username: { type: String, required: true },
   email: { type: String, required: true, unique: true },
   auth_hash: { type: String, required: true, unique: true },
   salt: { type: String, required: true, unique: true },
   iterations: { type: String, required: true }
});

module.exports = mongoose.model('User', UserSchema);

