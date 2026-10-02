const { DataTypes } = require('sequelize');
const { sequelize } = require('../database');
const { ProfileStatus } = require('./enums');

// Core profile for any professional/business. Latitude/longitude are nullable today but
// present from day one so location-based discovery (nearby search, radius filter, map view,
// city ranking) can be enabled later without a schema migration.
const ProfessionalProfile = sequelize.define('ProfessionalProfile', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.INTEGER, allowNull: false, unique: true, references: { model: 'users', key: 'id' }, onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
  category_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'categories', key: 'id' }, onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
  subcategory_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'subcategories', key: 'id' }, onDelete: 'RESTRICT', onUpdate: 'CASCADE' },

  profile_photo_url: { type: DataTypes.TEXT, allowNull: true },
  business_name: { type: DataTypes.TEXT, allowNull: false, validate: { notEmpty: true } },
  professional_title: { type: DataTypes.TEXT, allowNull: true },
  qualifications: { type: DataTypes.TEXT, allowNull: true },
  years_of_experience: { type: DataTypes.INTEGER, allowNull: true, validate: { min: 0 } },
  about: { type: DataTypes.TEXT, allowNull: true },

  contact_number: { type: DataTypes.STRING(20), allowNull: true },
  contact_email: { type: DataTypes.TEXT, allowNull: true, validate: { isEmailOrEmpty(value) { if (value && !/^\S+@\S+\.\S+$/.test(value)) throw new Error('Invalid email.'); } } },

  address_line: { type: DataTypes.TEXT, allowNull: true },
  city: { type: DataTypes.TEXT, allowNull: true },
  state: { type: DataTypes.TEXT, allowNull: true },
  postal_code: { type: DataTypes.STRING(20), allowNull: true },
  country: { type: DataTypes.TEXT, allowNull: true, defaultValue: 'India' },
  google_maps_url: { type: DataTypes.TEXT, allowNull: true },
  // Future-ready geo coordinates for nearby/radius/city-ranked discovery.
  latitude: { type: DataTypes.FLOAT, allowNull: true, validate: { min: -90, max: 90 } },
  longitude: { type: DataTypes.FLOAT, allowNull: true, validate: { min: -180, max: 180 } },

  consultation_fee: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, validate: { min: 0 } },
  languages_spoken: { type: DataTypes.TEXT, allowNull: true }, // comma-separated, e.g. "English,Hindi"
  website_url: { type: DataTypes.TEXT, allowNull: true },
  social_links: { type: DataTypes.TEXT, allowNull: true }, // JSON string: { instagram, facebook, linkedin, twitter }

  slot_duration_minutes: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 15, validate: { min: 1 } },
  booking_paused: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  status: { type: DataTypes.STRING, allowNull: false, defaultValue: ProfileStatus.ACTIVE, validate: { isIn: [Object.values(ProfileStatus)] } },
  is_featured: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },

  average_rating: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
  reviews_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  completed_appointments_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 }, // trending signal

  created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
}, {
  tableName: 'professional_profiles',
  timestamps: false,
  indexes: [
    { unique: true, fields: ['user_id'] },
    { fields: ['category_id'] },
    { fields: ['subcategory_id'] },
    { fields: ['city'] },
    { fields: ['is_featured'] },
    { fields: ['average_rating'] },
    { fields: ['latitude', 'longitude'] }
  ]
});

module.exports = ProfessionalProfile;
