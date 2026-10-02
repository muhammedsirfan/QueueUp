const express = require('express');
const { ProfessionalProfile, User, Category, Subcategory, UserRole, ProfileStatus } = require('../models');
const { requireRole } = require('../middleware/auth');
const { error } = require('../utils/respond');
const { ownerProfileDetail } = require('../utils/serializers');

const router = express.Router();

router.get('/professionals', requireRole(UserRole.ADMIN), async (req, res) => {
  try {
    const where = {};
    if (req.query.status) where.status = req.query.status;
    const profiles = await ProfessionalProfile.findAll({ where, include: [Category, Subcategory, User], order: [['created_at', 'DESC']] });
    res.json({ professionals: profiles.map(p => ({ ...ownerProfileDetail(p), owner_email: p.User?.email, owner_name: p.User?.full_name })) });
  } catch (err) { error(res, 500, 'Unable to load professionals.'); }
});

router.patch('/professionals/:id/status', requireRole(UserRole.ADMIN), async (req, res) => {
  const status = req.body?.status;
  if (![ProfileStatus.ACTIVE, ProfileStatus.INACTIVE].includes(status)) return error(res, 422, 'Invalid status.');
  try {
    const profile = await ProfessionalProfile.findByPk(Number(req.params.id));
    if (!profile) return error(res, 404, 'Professional not found.');
    await profile.update({ status });
    res.json({ professional: { id: profile.id, status: profile.status } });
  } catch (err) { error(res, 500, 'Unable to update status.'); }
});

router.patch('/professionals/:id/featured', requireRole(UserRole.ADMIN), async (req, res) => {
  try {
    const profile = await ProfessionalProfile.findByPk(Number(req.params.id));
    if (!profile) return error(res, 404, 'Professional not found.');
    await profile.update({ is_featured: req.body?.is_featured === true });
    res.json({ professional: { id: profile.id, is_featured: profile.is_featured } });
  } catch (err) { error(res, 500, 'Unable to update featured flag.'); }
});

router.get('/stats', requireRole(UserRole.ADMIN), async (req, res) => {
  try {
    const [totalProfessionals, activeProfessionals, totalCustomers, totalCategories] = await Promise.all([
      ProfessionalProfile.count(),
      ProfessionalProfile.count({ where: { status: ProfileStatus.ACTIVE } }),
      User.count({ where: { role: UserRole.CUSTOMER } }),
      Category.count({ where: { is_active: true } })
    ]);
    res.json({ total_professionals: totalProfessionals, active_professionals: activeProfessionals, total_customers: totalCustomers, total_categories: totalCategories });
  } catch (err) { error(res, 500, 'Unable to load stats.'); }
});

module.exports = router;
