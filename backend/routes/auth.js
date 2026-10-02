const express = require('express');
const { User, UserRole } = require('../models');
const { hashPassword, verifyPassword, signToken } = require('../utils/auth');
const { requireAuth } = require('../middleware/auth');
const { error } = require('../utils/respond');

const router = express.Router();

function publicUser(user) {
  return { id: user.id, role: user.role, full_name: user.full_name, email: user.email, phone_number: user.phone_number };
}

router.post('/register', async (req, res) => {
  const full_name = typeof req.body?.full_name === 'string' ? req.body.full_name.trim() : '';
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  const phone_number = typeof req.body?.phone_number === 'string' ? req.body.phone_number.trim() : null;
  const role = req.body?.role === UserRole.PROFESSIONAL ? UserRole.PROFESSIONAL : UserRole.CUSTOMER;

  if (!full_name || !/^\S+@\S+\.\S+$/.test(email) || password.length < 6) {
    return error(res, 422, 'Enter your full name, a valid email, and a password with at least 6 characters.');
  }
  try {
    const existing = await User.findOne({ where: { email } });
    if (existing) return error(res, 409, 'An account with this email already exists.');
    const user = await User.create({ role, full_name, email, phone_number, password_hash: await hashPassword(password) });
    res.status(201).json({ user: publicUser(user), token: signToken(user) });
  } catch (err) { error(res, 500, 'Unable to create the account.'); }
});

router.post('/login', async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!email || !password) return error(res, 422, 'Enter your email and password.');
  try {
    const user = await User.findOne({ where: { email } });
    if (!user || !(await verifyPassword(password, user.password_hash))) return error(res, 401, 'Invalid email or password.');
    if (!user.is_active) return error(res, 403, 'This account has been deactivated.');
    res.json({ user: publicUser(user), token: signToken(user) });
  } catch (err) { error(res, 500, 'Unable to log in.'); }
});

router.get('/me', requireAuth, (req, res) => res.json({ user: publicUser(req.user) }));

module.exports = router;
