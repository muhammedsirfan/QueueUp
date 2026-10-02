const { DataTypes } = require('sequelize');
const { sequelize } = require('../database');
const { BlockedDateReason } = require('./enums');

// One row per weekday (0=Sunday..6=Saturday) per professional. A missing row means closed that day.
const BusinessHours = sequelize.define('BusinessHours', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  professional_profile_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'professional_profiles', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' },
  weekday: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 0, max: 6 } },
  start_time: { type: DataTypes.STRING(5), allowNull: false, validate: { is: /^\d{2}:\d{2}$/ } }, // "09:00"
  end_time: { type: DataTypes.STRING(5), allowNull: false, validate: { is: /^\d{2}:\d{2}$/ } },   // "17:00"
  is_working_day: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
}, {
  tableName: 'business_hours', timestamps: false,
  indexes: [{ unique: true, fields: ['professional_profile_id', 'weekday'] }, { fields: ['professional_profile_id'] }]
});

// Holidays (recurring-style, single date) and manually blocked dates/date-ranges.
const BlockedDate = sequelize.define('BlockedDate', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  professional_profile_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'professional_profiles', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' },
  blocked_date: { type: DataTypes.TEXT, allowNull: false }, // "YYYY-MM-DD"
  reason_type: { type: DataTypes.STRING, allowNull: false, defaultValue: BlockedDateReason.MANUAL_BLOCK, validate: { isIn: [Object.values(BlockedDateReason)] } },
  note: { type: DataTypes.TEXT, allowNull: true },
  created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
}, {
  tableName: 'blocked_dates', timestamps: false,
  indexes: [{ unique: true, fields: ['professional_profile_id', 'blocked_date'] }, { fields: ['professional_profile_id'] }]
});

module.exports = { BusinessHours, BlockedDate };
