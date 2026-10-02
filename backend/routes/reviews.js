const express = require('express');
const { Review, Appointment, ProfessionalProfile, User, UserRole, AppointmentStatus, ReviewStatus } = require('../models');
const { requireAuth, requireRole } = require('../middleware/auth');
const { error } = require('../utils/respond');

const router = express.Router();

function reviewPayload(review) {
  return {
    id: review.id, rating: review.rating, comment: review.comment, status: review.status,
    customer_name: review.Customer?.full_name || 'Customer', created_at: review.created_at
  };
}

async function recalculateRating(professionalProfileId) {
  const reviews = await Review.findAll({ where: { professional_profile_id: professionalProfileId, status: ReviewStatus.PUBLISHED } });
  const count = reviews.length;
  const average = count ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / count) * 10) / 10 : 0;
  await ProfessionalProfile.update({ average_rating: average, reviews_count: count }, { where: { id: professionalProfileId } });
}

// Public: list published reviews for a professional.
router.get('/professional/:profileId', async (req, res) => {
  try {
    const reviews = await Review.findAll({ where: { professional_profile_id: Number(req.params.profileId), status: ReviewStatus.PUBLISHED }, include: [{ model: User, as: 'Customer' }], order: [['created_at', 'DESC']] });
    res.json({ reviews: reviews.map(reviewPayload) });
  } catch (err) { error(res, 500, 'Unable to load reviews.'); }
});

// Customer: submit a review, only allowed for a completed appointment they own, one review per appointment.
router.post('/', requireRole(UserRole.CUSTOMER), async (req, res) => {
  const appointmentId = Number(req.body?.appointment_id);
  const rating = Number(req.body?.rating);
  const comment = typeof req.body?.comment === 'string' ? req.body.comment.trim() || null : null;
  if (!Number.isInteger(appointmentId) || !Number.isInteger(rating) || rating < 1 || rating > 5) return error(res, 422, 'Provide appointment_id and a rating from 1 to 5.');
  try {
    const appointment = await Appointment.findByPk(appointmentId);
    if (!appointment) return error(res, 404, 'Appointment not found.');
    if (appointment.customer_id !== req.user.id) return error(res, 403, 'You cannot review this appointment.');
    if (appointment.status !== AppointmentStatus.COMPLETED) return error(res, 409, 'You can only review completed appointments.');
    const existing = await Review.findOne({ where: { appointment_id: appointmentId } });
    if (existing) return error(res, 409, 'You already reviewed this appointment.');
    const review = await Review.create({ professional_profile_id: appointment.professional_profile_id, customer_id: req.user.id, appointment_id: appointmentId, rating, comment });
    await recalculateRating(appointment.professional_profile_id);
    res.status(201).json({ review: { id: review.id, rating: review.rating, comment: review.comment, status: review.status, created_at: review.created_at } });
  } catch (err) { error(res, 500, 'Unable to submit review.'); }
});

// Admin: moderation
router.get('/admin/all', requireRole(UserRole.ADMIN), async (req, res) => {
  try {
    const where = {};
    if (req.query.status) where.status = req.query.status;
    const reviews = await Review.findAll({ where, include: [{ model: User, as: 'Customer' }, ProfessionalProfile], order: [['created_at', 'DESC']] });
    res.json({ reviews: reviews.map(r => ({ id: r.id, rating: r.rating, comment: r.comment, status: r.status, customer_name: r.Customer?.full_name, professional_name: r.ProfessionalProfile?.business_name, created_at: r.created_at })) });
  } catch (err) { error(res, 500, 'Unable to load reviews.'); }
});

router.patch('/admin/:id', requireRole(UserRole.ADMIN), async (req, res) => {
  const status = req.body?.status;
  if (![ReviewStatus.PUBLISHED, ReviewStatus.HIDDEN, ReviewStatus.FLAGGED].includes(status)) return error(res, 422, 'Invalid status.');
  try {
    const review = await Review.findByPk(Number(req.params.id));
    if (!review) return error(res, 404, 'Review not found.');
    await review.update({ status, moderation_note: typeof req.body?.moderation_note === 'string' ? req.body.moderation_note.trim() || null : review.moderation_note });
    await recalculateRating(review.professional_profile_id);
    res.json({ review: { id: review.id, status: review.status } });
  } catch (err) { error(res, 500, 'Unable to update review.'); }
});

module.exports = router;
