const express = require('express');
const { Op } = require('sequelize');
const {
  ProfessionalProfile, Category, Subcategory, User, BusinessHours, BlockedDate,
  UserRole, ProfileStatus
} = require('../models');
const { requireAuth, requireRole } = require('../middleware/auth');
const { error } = require('../utils/respond');
const { publicProfileCard, publicProfileDetail, ownerProfileDetail } = require('../utils/serializers');
const { computeSlotsForDate, findNextAvailableDate, dateToLocalISO } = require('../utils/availability');
const { distanceKm } = require('../utils/geo');

const router = express.Router();

async function loadOwnProfile(req, res, next) {
  try {
    const profile = await ProfessionalProfile.findOne({ where: { user_id: req.user.id }, include: [Category, Subcategory] });
    if (!profile) return error(res, 404, 'Create your professional profile first.');
    req.profile = profile;
    next();
  } catch (err) { error(res, 500, 'Unable to load your profile.'); }
}

// ---------------------------------------------------------------------------
// Public discovery & search
// ---------------------------------------------------------------------------

// GET /api/professionals
// Supports: q (name search), category, subcategory, city, min_fee, max_fee, languages,
// sort=featured|top_rated|recent|trending, lat/lng/radius_km (future-ready, no-op until
// profiles have coordinates), page, page_size.
router.get('/', async (req, res) => {
  try {
    const where = { status: ProfileStatus.ACTIVE };
    if (req.query.q) where.business_name = { [Op.like]: `%${String(req.query.q).trim()}%` };
    if (req.query.city) where.city = { [Op.like]: `%${String(req.query.city).trim()}%` };
    if (req.query.min_fee) where.consultation_fee = { ...(where.consultation_fee || {}), [Op.gte]: Number(req.query.min_fee) };
    if (req.query.max_fee) where.consultation_fee = { ...(where.consultation_fee || {}), [Op.lte]: Number(req.query.max_fee) };
    if (req.query.languages) where.languages_spoken = { [Op.like]: `%${String(req.query.languages).trim()}%` };

    if (req.query.category) {
      const category = Number.isInteger(Number(req.query.category))
        ? await Category.findByPk(Number(req.query.category))
        : await Category.findOne({ where: { slug: req.query.category } });
      if (!category) return res.json({ professionals: [], total: 0, page: 1, page_size: 0 });
      where.category_id = category.id;
    }
    if (req.query.subcategory) {
      const subcategory = Number.isInteger(Number(req.query.subcategory))
        ? await Subcategory.findByPk(Number(req.query.subcategory))
        : await Subcategory.findOne({ where: { slug: req.query.subcategory } });
      if (!subcategory) return res.json({ professionals: [], total: 0, page: 1, page_size: 0 });
      where.subcategory_id = subcategory.id;
    }

    const sort = req.query.sort || 'recent';
    const order = sort === 'featured' ? [['is_featured', 'DESC'], ['average_rating', 'DESC']]
      : sort === 'top_rated' ? [['average_rating', 'DESC'], ['reviews_count', 'DESC']]
      : sort === 'trending' ? [['completed_appointments_count', 'DESC'], ['average_rating', 'DESC']]
      : [['created_at', 'DESC']];

    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(req.query.page_size) || 20));

    const { rows, count } = await ProfessionalProfile.findAndCountAll({
      where, include: [Category, Subcategory], order, limit: pageSize, offset: (page - 1) * pageSize
    });

    let professionals = rows.map(publicProfileCard);

    // Future-ready radius filter: only applies once lat/lng query params AND profile
    // coordinates are both present. Silently ignored otherwise (no professionals have
    // coordinates yet), so this can be enabled purely by populating data later.
    if (req.query.lat && req.query.lng && req.query.radius_km) {
      const lat = Number(req.query.lat), lng = Number(req.query.lng), radius = Number(req.query.radius_km);
      professionals = professionals
        .filter(p => p.latitude != null && p.longitude != null)
        .map(p => ({ ...p, distance_km: Math.round(distanceKm(lat, lng, p.latitude, p.longitude) * 10) / 10 }))
        .filter(p => p.distance_km <= radius)
        .sort((a, b) => a.distance_km - b.distance_km);
    }

    res.json({ professionals, total: count, page, page_size: pageSize });
  } catch (err) { error(res, 500, 'Unable to search professionals.'); }
});

// Discovery sections for the listing/landing page.
router.get('/discovery/sections', async (req, res) => {
  try {
    const base = { status: ProfileStatus.ACTIVE };
    const [featured, topRated, recent, trending] = await Promise.all([
      ProfessionalProfile.findAll({ where: { ...base, is_featured: true }, include: [Category, Subcategory], order: [['average_rating', 'DESC']], limit: 8 }),
      ProfessionalProfile.findAll({ where: { ...base, reviews_count: { [Op.gt]: 0 } }, include: [Category, Subcategory], order: [['average_rating', 'DESC'], ['reviews_count', 'DESC']], limit: 8 }),
      ProfessionalProfile.findAll({ where: base, include: [Category, Subcategory], order: [['created_at', 'DESC']], limit: 8 }),
      ProfessionalProfile.findAll({ where: base, include: [Category, Subcategory], order: [['completed_appointments_count', 'DESC']], limit: 8 })
    ]);
    res.json({
      featured: featured.map(publicProfileCard),
      top_rated: topRated.map(publicProfileCard),
      recently_joined: recent.map(publicProfileCard),
      trending: trending.map(publicProfileCard)
    });
  } catch (err) { error(res, 500, 'Unable to load discovery sections.'); }
});

// ---------------------------------------------------------------------------
// Professional-owned profile management
// NOTE: these /me/* routes must be registered before the generic /:id routes
// below, otherwise Express would try to match "me" as a numeric :id.
// ---------------------------------------------------------------------------

router.get('/me/profile', requireRole(UserRole.PROFESSIONAL), async (req, res) => {
  try {
    const profile = await ProfessionalProfile.findOne({ where: { user_id: req.user.id }, include: [Category, Subcategory] });
    res.json({ professional: profile ? ownerProfileDetail(profile) : null });
  } catch (err) { error(res, 500, 'Unable to load your profile.'); }
});

function normalizeProfileInput(body) {
  const fields = {};
  const strFields = ['business_name', 'professional_title', 'qualifications', 'about', 'contact_number', 'contact_email', 'address_line', 'city', 'state', 'postal_code', 'country', 'google_maps_url', 'website_url', 'languages_spoken', 'profile_photo_url'];
  strFields.forEach(f => { if (typeof body?.[f] === 'string') fields[f] = body[f].trim() || null; });
  if (Number.isFinite(Number(body?.years_of_experience))) fields.years_of_experience = Number(body.years_of_experience);
  if (Number.isFinite(Number(body?.consultation_fee))) fields.consultation_fee = Number(body.consultation_fee);
  if (Number.isFinite(Number(body?.slot_duration_minutes))) fields.slot_duration_minutes = Number(body.slot_duration_minutes);
  if (Number.isFinite(Number(body?.category_id))) fields.category_id = Number(body.category_id);
  if (body?.subcategory_id === null || Number.isFinite(Number(body?.subcategory_id))) fields.subcategory_id = body.subcategory_id === null ? null : Number(body.subcategory_id);
  if (typeof body?.social_links === 'object' && body.social_links) fields.social_links = JSON.stringify(body.social_links);
  if (Number.isFinite(Number(body?.latitude))) fields.latitude = Number(body.latitude);
  if (Number.isFinite(Number(body?.longitude))) fields.longitude = Number(body.longitude);
  return fields;
}

router.post('/me/profile', requireRole(UserRole.PROFESSIONAL), async (req, res) => {
  try {
    const existing = await ProfessionalProfile.findOne({ where: { user_id: req.user.id } });
    if (existing) return error(res, 409, 'Profile already exists. Use PATCH to update it.');
    const fields = normalizeProfileInput(req.body);
    if (!fields.business_name || !fields.category_id) return error(res, 422, 'Business name and category are required.');
    const category = await Category.findByPk(fields.category_id);
    if (!category) return error(res, 422, 'Category not found.');
    const profile = await ProfessionalProfile.create({ user_id: req.user.id, ...fields, consultation_fee: fields.consultation_fee || 0, slot_duration_minutes: fields.slot_duration_minutes || 15 });
    const withIncludes = await ProfessionalProfile.findByPk(profile.id, { include: [Category, Subcategory] });
    res.status(201).json({ professional: ownerProfileDetail(withIncludes) });
  } catch (err) { error(res, 500, 'Unable to create profile.'); }
});

router.patch('/me/profile', requireRole(UserRole.PROFESSIONAL), loadOwnProfile, async (req, res) => {
  try {
    const fields = normalizeProfileInput(req.body);
    if (typeof req.body?.booking_paused === 'boolean') fields.booking_paused = req.body.booking_paused;
    fields.updated_at = new Date();
    await req.profile.update(fields);
    const withIncludes = await ProfessionalProfile.findByPk(req.profile.id, { include: [Category, Subcategory] });
    res.json({ professional: ownerProfileDetail(withIncludes) });
  } catch (err) { error(res, 500, 'Unable to update profile.'); }
});

// ---------------------------------------------------------------------------
// Availability configuration (owner only)
// ---------------------------------------------------------------------------

router.get('/me/business-hours', requireRole(UserRole.PROFESSIONAL), loadOwnProfile, async (req, res) => {
  try {
    const hours = await BusinessHours.findAll({ where: { professional_profile_id: req.profile.id }, order: [['weekday', 'ASC']] });
    res.json({ business_hours: hours.map(h => ({ id: h.id, weekday: h.weekday, start_time: h.start_time, end_time: h.end_time, is_working_day: h.is_working_day })) });
  } catch (err) { error(res, 500, 'Unable to load business hours.'); }
});

// Replaces the full weekly schedule in one call: body.days = [{weekday, start_time, end_time, is_working_day}]
router.put('/me/business-hours', requireRole(UserRole.PROFESSIONAL), loadOwnProfile, async (req, res) => {
  const days = Array.isArray(req.body?.days) ? req.body.days : null;
  if (!days) return error(res, 422, 'Provide a "days" array.');
  for (const d of days) {
    if (!Number.isInteger(d.weekday) || d.weekday < 0 || d.weekday > 6) return error(res, 422, 'Each day needs a weekday 0-6.');
    if (d.is_working_day && (!/^\d{2}:\d{2}$/.test(d.start_time) || !/^\d{2}:\d{2}$/.test(d.end_time))) return error(res, 422, 'Working days need start_time and end_time in HH:MM format.');
  }
  try {
    await BusinessHours.destroy({ where: { professional_profile_id: req.profile.id } });
    const created = await BusinessHours.bulkCreate(days.map(d => ({
      professional_profile_id: req.profile.id, weekday: d.weekday,
      start_time: d.start_time || '09:00', end_time: d.end_time || '17:00',
      is_working_day: d.is_working_day !== false
    })));
    res.json({ business_hours: created.map(h => ({ id: h.id, weekday: h.weekday, start_time: h.start_time, end_time: h.end_time, is_working_day: h.is_working_day })) });
  } catch (err) { error(res, 500, 'Unable to save business hours.'); }
});

router.get('/me/blocked-dates', requireRole(UserRole.PROFESSIONAL), loadOwnProfile, async (req, res) => {
  try {
    const dates = await BlockedDate.findAll({ where: { professional_profile_id: req.profile.id }, order: [['blocked_date', 'ASC']] });
    res.json({ blocked_dates: dates.map(d => ({ id: d.id, blocked_date: d.blocked_date, reason_type: d.reason_type, note: d.note })) });
  } catch (err) { error(res, 500, 'Unable to load blocked dates.'); }
});

router.post('/me/blocked-dates', requireRole(UserRole.PROFESSIONAL), loadOwnProfile, async (req, res) => {
  const blocked_date = typeof req.body?.blocked_date === 'string' ? req.body.blocked_date : '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(blocked_date)) return error(res, 422, 'blocked_date must be YYYY-MM-DD.');
  try {
    const existing = await BlockedDate.findOne({ where: { professional_profile_id: req.profile.id, blocked_date } });
    if (existing) return error(res, 409, 'This date is already blocked.');
    const record = await BlockedDate.create({
      professional_profile_id: req.profile.id, blocked_date,
      reason_type: req.body?.reason_type === 'holiday' ? 'holiday' : 'manual_block',
      note: typeof req.body?.note === 'string' ? req.body.note.trim() || null : null
    });
    res.status(201).json({ blocked_date: { id: record.id, blocked_date: record.blocked_date, reason_type: record.reason_type, note: record.note } });
  } catch (err) { error(res, 500, 'Unable to block date.'); }
});

router.delete('/me/blocked-dates/:id', requireRole(UserRole.PROFESSIONAL), loadOwnProfile, async (req, res) => {
  try {
    const record = await BlockedDate.findOne({ where: { id: Number(req.params.id), professional_profile_id: req.profile.id } });
    if (!record) return error(res, 404, 'Blocked date not found.');
    await record.destroy();
    res.json({ ok: true });
  } catch (err) { error(res, 500, 'Unable to unblock date.'); }
});

// ---------------------------------------------------------------------------
// Public profile detail & availability (generic :id, registered last)
// ---------------------------------------------------------------------------

router.get('/:id', async (req, res) => {
  try {
    const profile = await ProfessionalProfile.findByPk(Number(req.params.id), { include: [Category, Subcategory] });
    if (!profile || profile.status !== ProfileStatus.ACTIVE) return error(res, 404, 'Professional not found.');
    res.json({ professional: publicProfileDetail(profile) });
  } catch (err) { error(res, 500, 'Unable to load professional.'); }
});

router.get('/:id/availability', async (req, res) => {
  try {
    const profile = await ProfessionalProfile.findByPk(Number(req.params.id));
    if (!profile || profile.status !== ProfileStatus.ACTIVE) return error(res, 404, 'Professional not found.');
    const date = req.query.date || dateToLocalISO(new Date());
    const { slots, reason } = await computeSlotsForDate(profile, date);
    const nextAvailableDate = slots.some(s => s.is_available) ? date : await findNextAvailableDate(profile, date);
    res.json({ date, slots, reason, next_available_date: nextAvailableDate });
  } catch (err) { error(res, 500, 'Unable to load availability.'); }
});

module.exports = router;
