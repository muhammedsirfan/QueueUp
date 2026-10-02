const { decodeToken } = require('../utils/auth');
const { User } = require('../models');

// Populates req.user when a valid Bearer token is present; never rejects by itself.
async function attachUser(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next();
  const payload = decodeToken(token);
  if (!payload) return next();
  try {
    const user = await User.findByPk(payload.sub);
    if (user && user.is_active) req.user = user;
  } catch (err) { /* ignore lookup failures, treat as unauthenticated */ }
  next();
}

function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Authentication required.' });
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'You do not have permission to perform this action.' });
    next();
  };
}

module.exports = { attachUser, requireAuth, requireRole };
