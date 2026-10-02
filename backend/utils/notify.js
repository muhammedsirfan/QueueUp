const { Notification, NotificationChannel, NotificationStatus } = require('../models');

// Records an in-app notification and simulates a WhatsApp send (sandbox: no real external
// dispatch, just a second logged record) so the platform's notification history reflects
// multi-channel delivery without needing real WhatsApp Business API credentials.
async function notify(userId, type, title, body, extra = {}) {
  try {
    await Notification.create({ user_id: userId, type, channel: NotificationChannel.IN_APP, title, body, status: NotificationStatus.SENT, ...extra });
    await Notification.create({ user_id: userId, type, channel: NotificationChannel.WHATSAPP, title, body, status: NotificationStatus.SENT, ...extra });
  } catch (err) { /* notifications are best-effort; never block the primary action */ }
}

module.exports = { notify };
