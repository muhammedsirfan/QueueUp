const express = require('express');
const { Category, Subcategory } = require('../models');
const { requireRole } = require('../middleware/auth');
const { error } = require('../utils/respond');
const { slugify } = require('../utils/slug');

const router = express.Router();

async function categoryPayload(category, includeSubcategories = true) {
  const subcategories = includeSubcategories
    ? await Subcategory.findAll({ where: { category_id: category.id }, order: [['display_order', 'ASC'], ['name', 'ASC']] })
    : [];
  return {
    id: category.id, name: category.name, slug: category.slug, icon: category.icon,
    display_order: category.display_order, is_active: category.is_active,
    subcategories: subcategories.map(sub => ({ id: sub.id, name: sub.name, slug: sub.slug, display_order: sub.display_order, is_active: sub.is_active }))
  };
}

// Public: list all active categories with their active subcategories.
router.get('/', async (req, res) => {
  try {
    const includeInactive = req.query.include_inactive === 'true' && req.user?.role === 'admin';
    const categories = await Category.findAll({ where: includeInactive ? {} : { is_active: true }, order: [['display_order', 'ASC'], ['name', 'ASC']] });
    res.json({ categories: await Promise.all(categories.map(c => categoryPayload(c))) });
  } catch (err) { error(res, 500, 'Unable to load categories.'); }
});

router.get('/:idOrSlug', async (req, res) => {
  try {
    const key = req.params.idOrSlug;
    const category = Number.isInteger(Number(key)) ? await Category.findByPk(Number(key)) : await Category.findOne({ where: { slug: key } });
    if (!category) return error(res, 404, 'Category not found.');
    res.json({ category: await categoryPayload(category) });
  } catch (err) { error(res, 500, 'Unable to load category.'); }
});

// Admin: create category
router.post('/', requireRole('admin'), async (req, res) => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  const icon = typeof req.body?.icon === 'string' ? req.body.icon.trim() : null;
  if (!name) return error(res, 422, 'Category name is required.');
  try {
    const slug = slugify(req.body?.slug || name);
    const existing = await Category.findOne({ where: { slug } });
    if (existing) return error(res, 409, 'A category with this slug already exists.');
    const category = await Category.create({ name, slug, icon, display_order: Number(req.body?.display_order) || 0 });
    res.status(201).json({ category: await categoryPayload(category) });
  } catch (err) { error(res, 500, 'Unable to create category.'); }
});

router.patch('/:id', requireRole('admin'), async (req, res) => {
  try {
    const category = await Category.findByPk(Number(req.params.id));
    if (!category) return error(res, 404, 'Category not found.');
    const updates = {};
    if (typeof req.body?.name === 'string' && req.body.name.trim()) updates.name = req.body.name.trim();
    if (typeof req.body?.icon === 'string') updates.icon = req.body.icon.trim() || null;
    if (Number.isFinite(Number(req.body?.display_order))) updates.display_order = Number(req.body.display_order);
    if (typeof req.body?.is_active === 'boolean') updates.is_active = req.body.is_active;
    await category.update(updates);
    res.json({ category: await categoryPayload(category) });
  } catch (err) { error(res, 500, 'Unable to update category.'); }
});

router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    const category = await Category.findByPk(Number(req.params.id));
    if (!category) return error(res, 404, 'Category not found.');
    await category.update({ is_active: false });
    res.json({ ok: true });
  } catch (err) { error(res, 500, 'Unable to delete category.'); }
});

// Admin: subcategory management
router.post('/:id/subcategories', requireRole('admin'), async (req, res) => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  if (!name) return error(res, 422, 'Subcategory name is required.');
  try {
    const category = await Category.findByPk(Number(req.params.id));
    if (!category) return error(res, 404, 'Category not found.');
    const slug = slugify(req.body?.slug || name);
    const existing = await Subcategory.findOne({ where: { category_id: category.id, slug } });
    if (existing) return error(res, 409, 'A subcategory with this slug already exists in this category.');
    const subcategory = await Subcategory.create({ category_id: category.id, name, slug, display_order: Number(req.body?.display_order) || 0 });
    res.status(201).json({ subcategory: { id: subcategory.id, name: subcategory.name, slug: subcategory.slug, display_order: subcategory.display_order, is_active: subcategory.is_active } });
  } catch (err) { error(res, 500, 'Unable to create subcategory.'); }
});

router.patch('/subcategories/:id', requireRole('admin'), async (req, res) => {
  try {
    const subcategory = await Subcategory.findByPk(Number(req.params.id));
    if (!subcategory) return error(res, 404, 'Subcategory not found.');
    const updates = {};
    if (typeof req.body?.name === 'string' && req.body.name.trim()) updates.name = req.body.name.trim();
    if (Number.isFinite(Number(req.body?.display_order))) updates.display_order = Number(req.body.display_order);
    if (typeof req.body?.is_active === 'boolean') updates.is_active = req.body.is_active;
    await subcategory.update(updates);
    res.json({ subcategory: { id: subcategory.id, name: subcategory.name, slug: subcategory.slug, display_order: subcategory.display_order, is_active: subcategory.is_active } });
  } catch (err) { error(res, 500, 'Unable to update subcategory.'); }
});

router.delete('/subcategories/:id', requireRole('admin'), async (req, res) => {
  try {
    const subcategory = await Subcategory.findByPk(Number(req.params.id));
    if (!subcategory) return error(res, 404, 'Subcategory not found.');
    await subcategory.update({ is_active: false });
    res.json({ ok: true });
  } catch (err) { error(res, 500, 'Unable to delete subcategory.'); }
});

module.exports = router;
