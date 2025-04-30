require('dotenv').config();
const User = require('../models/user');
const Vault = require('../models/vault');
const jwt = require('jsonwebtoken');
const argon2 = require('argon2');
const { v4: uuidv4 } = require('uuid');

const ACCESS_EXPIRY  = process.env.ACCESS_EXPIRY;
const REFRESH_EXPIRY = process.env.REFRESH_EXPIRY;
const VAULT_VERSION  = process.env.VAULT_VERSION;

if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
  console.error('ERROR: Definir JWT_SECRET y JWT_REFRESH_SECRET en .env');
  process.exit(1);
}

const JWT_SECRET = Buffer.from(process.env.JWT_SECRET, 'base64');
const JWT_REFRESH_SECRET = Buffer.from(process.env.JWT_REFRESH_SECRET, 'base64');

function generateTokens(user) {
  const jti = uuidv4();
  const payload = { sub: user._id, username: user.username, email: user.email, roles: user.roles, jti, vault_version: VAULT_VERSION };
  const accessToken  = jwt.sign(payload, JWT_SECRET,  { expiresIn: ACCESS_EXPIRY  });
  const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: REFRESH_EXPIRY });
  return { accessToken, refreshToken };
}

exports.registerUser = async (req, res) => {
  try {
    const { username, email, hashed_master_password, salt, public_key, encrypted_private_key, encrypted_vault_key, encrypted_vault } = req.body;
    const user = new User({ username, email, hashed_master_password, salt, public_key, encrypted_private_key, encrypted_vault_key });
    await user.save();
    await Vault.create({ user_id: user._id, encrypted_vault });
    const { accessToken, refreshToken } = generateTokens(user);
    user.refreshTokens.push(await argon2.hash(refreshToken, { type: argon2.argon2id }));
    await user.save();
    res.json({ accessToken, refreshToken });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.loginUser = async (req, res) => {
  try {
    const { username, hashed_master_password } = req.body;
    const user = await User.findOne({ username });
    if (!user || !user.verifyMasterPassword(hashed_master_password)) return res.status(401).json({ error: 'Credenciales inválidas' });
    const { accessToken, refreshToken } = generateTokens(user);
    user.refreshTokens.push(await argon2.hash(refreshToken, { type: argon2.argon2id }));
    await user.save();
    await Vault.findOneAndUpdate({ user_id: user._id }, { last_accessed: Date.now() });
    res.json({ accessToken, refreshToken });
  } catch { res.status(500).json({ error: 'Error interno' }); }
};

exports.refreshToken = async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(401).json({ error: 'Refresh token requerido' });
  try { jwt.verify(token, JWT_REFRESH_SECRET); } catch { return res.status(401).json({ error: 'Refresh token inválido' }); }
  const payload = jwt.decode(token);
  const user = await User.findById(payload.sub);
  if (!user) return res.status(403).json({ error: 'No autorizado' });
  let valid = false;
  for (const h of user.refreshTokens) if (await argon2.verify(h, token)) { valid = true; break; }
  if (!valid) return res.status(403).json({ error: 'No autorizado' });
  res.json({ accessToken: generateTokens(user).accessToken });
};

exports.logoutUser = async (req, res) => {
  const { token } = req.body;
  if (token) {
    try {
      jwt.verify(token, JWT_REFRESH_SECRET);
      const { sub } = jwt.decode(token);
      const user = await User.findById(sub);
      if (user) { user.refreshTokens = []; await user.save(); }
    } catch {}
  }
  res.json({ message: 'Sesión cerrada' });
};

exports.getUserInfo = async (req, res) => {
  try {
    const user = await User.findById(req.user.sub).select('-hashed_master_password -refreshTokens -__v');
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(user);
  } catch { res.status(500).json({ error: 'Error interno' }); }
};

exports.updateUserInfo = async (req, res) => {
  try {
    const updates = {};
    if (req.body.email) updates.email = req.body.email;
    if (req.body.username) updates.username = req.body.username;
    const user = await User.findByIdAndUpdate(req.user.sub, updates, { new: true }).select('-hashed_master_password -refreshTokens -__v');
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ message: 'Usuario actualizado', user });
  } catch { res.status(500).json({ error: 'Error interno' }); }
};

exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.user.sub);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    await Vault.deleteOne({ user_id: req.user.sub });
    res.json({ message: 'Cuenta eliminada exitosamente' });
  } catch { res.status(500).json({ error: 'Error interno' }); }
};