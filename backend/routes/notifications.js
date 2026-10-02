const express = require('express');
const { Notification } = require('../models');
const { requireAuth } = require('../middleware/auth');
const { error } = require('../utils/respond');

const router = express.Router();

router.get('/me', requireAuth, async (req, res) => {
  try {
    const notifications = await Notification.findAll({ where: { user_id: req.user.id, channel: 'in_app' }, order: [['created_at', 'DESC']], limit: 50 });
    res.json({ notifications: notifications.map(n => ({ id: n.id, type: n.type, title: n.title, body: n.body, read_at: n.read_at, created_at: n.created_at })) });
  } catch (err) { error(res, 500, 'Unable to load notifications.'); }
});

router.post('/:id/read', requireAuth, async (req, res) => {
  try {
    const notification = await Notification.findByPk(Number(req.params.id));
    if (!notification || notification.user_id !== req.user.id) return error(res, 404, 'Notification not found.');
    await notification.update({ read_at: new Date() });
    res.json({ ok: true });
  } catch (err) { error(res, 500, 'Unable to update notification.'); }
});

module.exports = router;
