const { DataTypes } = require('sequelize');
const { sequelize } = require('../database');
const { NotificationType, NotificationChannel, NotificationStatus } = require('./enums');

// In-app + simulated multi-channel notification log. WhatsApp/SMS/Email are recorded as
// "sent" in this sandbox (no real external dispatch) but the schema is ready for a real
// provider integration (webhook id, provider payload) later.
const Notification = sequelize.define('Notification', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' },
  type: { type: DataTypes.STRING, allowNull: false, validate: { isIn: [Object.values(NotificationType)] } },
  channel: { type: DataTypes.STRING, allowNull: false, defaultValue: NotificationChannel.IN_APP, validate: { isIn: [Object.values(NotificationChannel)] } },
  title: { type: DataTypes.TEXT, allowNull: false },
  body: { type: DataTypes.TEXT, allowNull: false },
  status: { type: DataTypes.STRING, allowNull: false, defaultValue: NotificationStatus.SENT, validate: { isIn: [Object.values(NotificationStatus)] } },
  read_at: { type: DataTypes.DATE, allowNull: true },
  related_entity_type: { type: DataTypes.TEXT, allowNull: true },
  related_entity_id: { type: DataTypes.INTEGER, allowNull: true },
  created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
}, {
  tableName: 'notifications', timestamps: false,
  indexes: [{ fields: ['user_id'] }, { fields: ['user_id', 'read_at'] }]
});

module.exports = Notification;
