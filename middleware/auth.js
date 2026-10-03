const jwt = require('jsonwebtoken');
const db = require('../db/database');

const JWT_SECRET = process.env.JWT_SECRET || 'ebafs-secret-key-super-luxury-2025';

function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = (authHeader && authHeader.startsWith('Bearer ')) 
    ? authHeader.split(' ')[1] 
    : (req.query.token || null);

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired session token' });
    }

    // Verify user is still active in database
    const user = db.prepare('SELECT id, name, email, phone, role, status FROM users WHERE id = ?').get(decoded.id);
    if (!user || user.status !== 'active') {
      return res.status(403).json({ error: 'User account is inactive or suspended' });
    }

    req.user = user;
    next();
  });
}

function optionalToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = (authHeader && authHeader.startsWith('Bearer ')) ? authHeader.split(' ')[1] : null;

  if (!token) {
    req.user = null;
    return next();
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (!err && decoded) {
      const user = db.prepare('SELECT id, name, email, phone, role, status FROM users WHERE id = ?').get(decoded.id);
      if (user && user.status === 'active') {
        req.user = user;
      }
    }
    next();
  });
}

function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Administrative authentication required' });
  }

  if (!['superadmin', 'admin', 'staff'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied: Administrative privileges required' });
  }

  next();
}

function requirePermission(perm) {
  return function (req, res, next) {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Super Admin has all permissions
    if (req.user.role === 'superadmin') {
      return next();
    }

    const hasPerm = db.prepare(`
      SELECT 1 FROM roles_permissions WHERE role = ? AND permission = ?
    `).get(req.user.role, perm);

    if (!hasPerm) {
      return res.status(403).json({
        error: `Forbidden: Missing required privilege '${perm}'`
      });
    }

    next();
  };
}

module.exports = {
  JWT_SECRET,
  generateToken,
  authenticateToken,
  optionalToken,
  requireAdmin,
  requirePermission
};
