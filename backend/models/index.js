const { sequelize } = require('../database');

const User = require('./user');
const { Category, Subcategory } = require('./category');
const ProfessionalProfile = require('./professionalProfile');
const { BusinessHours, BlockedDate } = require('./availability');
const Appointment = require('./appointment');
const { DailyQueue, Token } = require('./queue');
const PaymentRecord = require('./payment');
const Review = require('./review');
const Notification = require('./notification');
const Enums = require('./enums');

// ---- Associations ----

User.hasOne(ProfessionalProfile, { foreignKey: 'user_id' });
ProfessionalProfile.belongsTo(User, { foreignKey: 'user_id' });

Category.hasMany(ProfessionalProfile, { foreignKey: 'category_id' });
ProfessionalProfile.belongsTo(Category, { foreignKey: 'category_id' });
Subcategory.hasMany(ProfessionalProfile, { foreignKey: 'subcategory_id' });
ProfessionalProfile.belongsTo(Subcategory, { foreignKey: 'subcategory_id' });

ProfessionalProfile.hasMany(BusinessHours, { foreignKey: 'professional_profile_id' });
BusinessHours.belongsTo(ProfessionalProfile, { foreignKey: 'professional_profile_id' });

ProfessionalProfile.hasMany(BlockedDate, { foreignKey: 'professional_profile_id' });
BlockedDate.belongsTo(ProfessionalProfile, { foreignKey: 'professional_profile_id' });

ProfessionalProfile.hasMany(Appointment, { foreignKey: 'professional_profile_id' });
Appointment.belongsTo(ProfessionalProfile, { foreignKey: 'professional_profile_id' });
User.hasMany(Appointment, { foreignKey: 'customer_id' });
Appointment.belongsTo(User, { foreignKey: 'customer_id', as: 'Customer' });

ProfessionalProfile.hasMany(DailyQueue, { foreignKey: 'professional_profile_id' });
DailyQueue.belongsTo(ProfessionalProfile, { foreignKey: 'professional_profile_id' });

ProfessionalProfile.hasMany(Review, { foreignKey: 'professional_profile_id' });
Review.belongsTo(ProfessionalProfile, { foreignKey: 'professional_profile_id' });
User.hasMany(Review, { foreignKey: 'customer_id' });
Review.belongsTo(User, { foreignKey: 'customer_id', as: 'Customer' });
Appointment.hasOne(Review, { foreignKey: 'appointment_id' });
Review.belongsTo(Appointment, { foreignKey: 'appointment_id' });

User.hasMany(Notification, { foreignKey: 'user_id' });
Notification.belongsTo(User, { foreignKey: 'user_id' });

module.exports = {
  sequelize,
  User, Category, Subcategory, ProfessionalProfile, BusinessHours, BlockedDate,
  Appointment, DailyQueue, Token, PaymentRecord, Review, Notification,
  ...Enums
};
