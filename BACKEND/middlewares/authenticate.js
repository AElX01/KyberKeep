// BACKEND/middlewares/authenticate.js
const jwt = require('jsonwebtoken');

// Asegurarse de que el secreto JWT esté definido en el .env
if (!process.env.JWT_SECRET) {
  console.error('ERROR: JWT_SECRET no definido en .env');
  process.exit(1);
}

// Decodificar secreto Base64 a buffer
const JWT_SECRET = Buffer.from(process.env.JWT_SECRET, 'base64');

/**
 * Middleware para proteger rutas leyendo el token directamente desde el header 'x-auth'.
 * Ya no usamos 'Authorization: Bearer', solo 'x-auth: <token>'.
 */
function authenticateToken(req, res, next) {
  // Leer token desde header 'x-auth'
  const token = req.headers['x-auth'];
  if (!token) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  try {
    // Verificar y decodificar JWT
    const payload = jwt.verify(token, JWT_SECRET);
    // Guardar la carga útil en req.user (sub, username, roles, etc.)
    req.user = payload;
    next();
  } catch (err) {
    // Si falla la verificación o está expirado
    return res.status(403).json({ error: 'Token inválido o expirado' });
  }
}

module.exports = authenticateToken;
