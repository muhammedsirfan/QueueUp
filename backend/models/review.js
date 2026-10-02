const { DataTypes } = require('sequelize');
const { sequelize } = require('../database');
const { ReviewStatus } = require('./enums');

// Reviews can only be created against a completed appointment (enforced in route layer),
// guaranteeing only real customers who were served can leave feedback.
const Review = sequelize.define('Review', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  professional_profile_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'professional_profiles', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' },
  customer_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
  appointment_id: { type: DataTypes.INTEGER, allowNull: false, unique: true, references: { model: 'appointments', key: 'id' }, onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
  rating: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1, max: 5 } },
  comment: { type: DataTypes.TEXT, allowNull: true },
  status: { type: DataTypes.STRING, allowNull: false, defaultValue: ReviewStatus.PUBLISHED, validate: { isIn: [Object.values(ReviewStatus)] } },
  moderation_note: { type: DataTypes.TEXT, allowNull: true },
  created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
}, {
  tableName: 'reviews', timestamps: false,
  indexes: [{ unique: true, fields: ['appointment_id'] }, { fields: ['professional_profile_id'] }, { fields: ['status'] }]
});

module.exports = Review;
