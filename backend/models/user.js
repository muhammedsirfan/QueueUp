const { DataTypes } = require('sequelize');
const { sequelize } = require('../database');
const { UserRole } = require('./enums');

const User = sequelize.define('User', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  role: { type: DataTypes.STRING, allowNull: false, validate: { isIn: [Object.values(UserRole)] } },
  full_name: { type: DataTypes.TEXT, allowNull: false, validate: { notEmpty: true } },
  email: { type: DataTypes.TEXT, allowNull: false, unique: true, validate: { isEmail: true } },
  password_hash: { type: DataTypes.TEXT, allowNull: false },
  phone_number: { type: DataTypes.STRING(15), allowNull: true },
  is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
}, { tableName: 'users', timestamps: false, indexes: [{ unique: true, fields: ['email'] }, { fields: ['role'] }] });

module.exports = User;
