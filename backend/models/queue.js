const { DataTypes, Op } = require('sequelize');
const { sequelize } = require('../database');
const { QueueState, TokenState } = require('./enums');

// Walk-in queue for a single business day, generalized from the original clinic-only design
// so any professional (clinic, salon, consultant, etc.) can run a live token queue.
const DailyQueue = sequelize.define('DailyQueue', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  professional_profile_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'professional_profiles', key: 'id' }, onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
  queue_date: { type: DataTypes.TEXT, allowNull: false },
  queue_state: { type: DataTypes.STRING, allowNull: false, defaultValue: QueueState.OPEN, validate: { isIn: [Object.values(QueueState)] } },
  average_consultation_duration_minutes: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1 } },
  created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
}, {
  tableName: 'daily_queues', timestamps: false,
  indexes: [{ unique: true, fields: ['professional_profile_id', 'queue_date'] }, { fields: ['professional_profile_id'] }]
});

const Token = sequelize.define('Token', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  daily_queue_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'daily_queues', key: 'id' }, onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
  token_number: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1 } },
  customer_name: { type: DataTypes.TEXT, allowNull: false },
  phone_number: { type: DataTypes.STRING(10), allowNull: false },
  fee_snapshot: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 0 } },
  tracking_code: { type: DataTypes.TEXT, allowNull: false, unique: true },
  token_state: { type: DataTypes.STRING, allowNull: false, defaultValue: TokenState.BOOKED, validate: { isIn: [Object.values(TokenState)] } },
  created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
}, {
  tableName: 'tokens', timestamps: false,
  indexes: [
    { name: 'tokens_daily_queue_id_token_number_unique', unique: true, fields: ['daily_queue_id', 'token_number'] },
    { name: 'tokens_daily_queue_id_idx', fields: ['daily_queue_id'] },
    { name: 'tokens_daily_queue_id_serving_unique', unique: true, fields: ['daily_queue_id'], where: { token_state: TokenState.SERVING } },
    { name: 'tokens_daily_queue_id_phone_active_unique', unique: true, fields: ['daily_queue_id', 'phone_number'], where: { token_state: { [Op.in]: [TokenState.BOOKED, TokenState.SERVING, TokenState.SKIPPED] } } }
  ]
});

DailyQueue.hasMany(Token, { foreignKey: 'daily_queue_id' });
Token.belongsTo(DailyQueue, { foreignKey: 'daily_queue_id' });

module.exports = { DailyQueue, Token };
