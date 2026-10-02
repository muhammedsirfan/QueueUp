const { DataTypes } = require('sequelize');
const { sequelize } = require('../database');

const Category = sequelize.define('Category', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.TEXT, allowNull: false, validate: { notEmpty: true } },
  slug: { type: DataTypes.TEXT, allowNull: false, unique: true },
  icon: { type: DataTypes.TEXT, allowNull: true },
  display_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
}, { tableName: 'categories', timestamps: false, indexes: [{ unique: true, fields: ['slug'] }] });

const Subcategory = sequelize.define('Subcategory', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  category_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'categories', key: 'id' }, onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
  name: { type: DataTypes.TEXT, allowNull: false, validate: { notEmpty: true } },
  slug: { type: DataTypes.TEXT, allowNull: false },
  display_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
}, { tableName: 'subcategories', timestamps: false, indexes: [{ unique: true, fields: ['category_id', 'slug'] }, { fields: ['category_id'] }] });

Category.hasMany(Subcategory, { foreignKey: 'category_id' });
Subcategory.belongsTo(Category, { foreignKey: 'category_id' });

module.exports = { Category, Subcategory };
