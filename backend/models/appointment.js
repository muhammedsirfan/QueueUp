const { DataTypes } = require('sequelize');
const { sequelize } = require('../database');
const { AppointmentStatus } = require('./enums');

// A booked slot-based appointment (distinct from walk-in queue tokens, though a professional
// may use either or both systems).
const Appointment = sequelize.define('Appointment', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  professional_profile_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'professional_profiles', key: 'id' }, onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
  customer_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'RESTRICT', onUpdate: 'CASCADE' },

  appointment_date: { type: DataTypes.TEXT, allowNull: false }, // "YYYY-MM-DD"
  start_time: { type: DataTypes.STRING(5), allowNull: false },   // "09:15"
  end_time: { type: DataTypes.STRING(5), allowNull: false },     // "09:30"

  status: { type: DataTypes.STRING, allowNull: false, defaultValue: AppointmentStatus.BOOKED, validate: { isIn: [Object.values(AppointmentStatus)] } },
  fee_snapshot: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 0 } },
  customer_name_snapshot: { type: DataTypes.TEXT, allowNull: false },
  customer_phone_snapshot: { type: DataTypes.STRING(15), allowNull: false },
  notes: { type: DataTypes.TEXT, allowNull: true },

  rescheduled_from_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'appointments', key: 'id' }, onDelete: 'SET NULL', onUpdate: 'CASCADE' },
  cancelled_at: { type: DataTypes.DATE, allowNull: true },
  cancelled_by_role: { type: DataTypes.STRING, allowNull: true },
  completed_at: { type: DataTypes.DATE, allowNull: true },

  created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
}, {
  tableName: 'appointments', timestamps: false,
  indexes: [
    { fields: ['professional_profile_id', 'appointment_date'] },
    { fields: ['customer_id'] },
    { fields: ['status'] },
    { unique: true, fields: ['professional_profile_id', 'appointment_date', 'start_time'], where: { status: { [require('sequelize').Op.in]: [AppointmentStatus.BOOKED, AppointmentStatus.CONFIRMED] } } }
  ]
});

module.exports = Appointment;
