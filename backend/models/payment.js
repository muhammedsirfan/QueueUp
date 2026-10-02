const { DataTypes } = require('sequelize');
const { sequelize } = require('../database');
const { PaymentType, PaymentStatus, PaymentEntityType } = require('./enums');

// Generic payment record that can attach to either an appointment or a walk-in token.
// UPI-only sandbox flow today; structured so a real UPI gateway callback can populate the
// same fields later (upi_reference, payer_vpa) without a schema change.
const PaymentRecord = sequelize.define('PaymentRecord', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  entity_type: { type: DataTypes.STRING, allowNull: false, validate: { isIn: [Object.values(PaymentEntityType)] } },
  entity_id: { type: DataTypes.INTEGER, allowNull: false },
  payment_type: { type: DataTypes.STRING, allowNull: false, defaultValue: PaymentType.UPI, validate: { isIn: [Object.values(PaymentType)] } },
  status: { type: DataTypes.STRING, allowNull: false, defaultValue: PaymentStatus.PAID, validate: { isIn: [Object.values(PaymentStatus)] } },
  amount: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 0 } },
  upi_reference: { type: DataTypes.TEXT, allowNull: true },
  payer_vpa: { type: DataTypes.TEXT, allowNull: true },
  created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
}, {
  tableName: 'payment_records', timestamps: false,
  indexes: [{ name: 'payment_records_entity_unique', unique: true, fields: ['entity_type', 'entity_id'] }]
});

module.exports = PaymentRecord;
