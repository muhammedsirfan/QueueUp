const express = require('express');
const crypto = require('crypto');
const { Op } = require('sequelize');
const {
  sequelize, ProfessionalProfile, DailyQueue, Token, PaymentRecord,
  QueueState, TokenState, PaymentEntityType, PaymentStatus, UserRole
} = require('../models');
const { requireRole } = require('../middleware/auth');
const { error } = require('../utils/respond');
const { dateToLocalISO } = require('../utils/availability');
const { notify } = require('../utils/notify');
const { NotificationType } = require('../models');

const router = express.Router();
const today = () => dateToLocalISO(new Date());
const currentToken = tokens => tokens.find(t => t.token_state === TokenState.SERVING) || null;

async function queuePayload(queue) {
  const profile = await ProfessionalProfile.findByPk(queue.professional_profile_id);
  const tokens = await Token.findAll({ where: { daily_queue_id: queue.id }, order: [['token_number', 'ASC']] });
  const serving = currentToken(tokens);
  return {
    id: queue.id, professional_profile_id: profile.id, professional_name: profile.business_name,
    queue_date: queue.queue_date, queue_state: queue.queue_state,
    average_consultation_duration_minutes: queue.average_consultation_duration_minutes,
    current_token_number: serving?.token_number || null,
    tokens: tokens.map(token => ({
      id: token.id, token_number: token.token_number, customer_name: token.customer_name,
      masked_phone_number: `••••${token.phone_number.slice(-4)}`, token_state: token.token_state,
      fee_snapshot: token.fee_snapshot, tracking_code: token.tracking_code,
      permitted_action: queue.queue_state === QueueState.OPEN
        ? (token.token_state === TokenState.BOOKED && !serving && token.token_number === Math.min(...tokens.filter(t => t.token_state === TokenState.BOOKED).map(t => t.token_number), Infinity) ? 'start_serving'
          : token.token_state === TokenState.SERVING ? 'complete' : null)
        : null
    }))
  };
}

// Public: list professionals with a queue system and today's queue state, for the queue booking page.
router.get('/professionals', async (req, res) => {
  try {
    const professionals = await ProfessionalProfile.findAll({ where: { status: 'active' }, order: [['id', 'ASC']] });
    const queues = req.query.current_date_only === 'true' ? await DailyQueue.findAll({ where: { queue_date: today() } }) : [];
    res.json({
      professionals: professionals.map(profile => {
        const queue = queues.find(q => q.professional_profile_id === profile.id);
        return {
          id: profile.id, business_name: profile.business_name, consultation_fee: profile.consultation_fee,
          default_average_consultation_duration_minutes: profile.slot_duration_minutes,
          current_daily_queue: queue ? { id: queue.id, queue_date: queue.queue_date, queue_state: queue.queue_state, average_consultation_duration_minutes: queue.average_consultation_duration_minutes } : null
        };
      })
    });
  } catch (err) { error(res, 500, 'Unable to load professionals.'); }
});

router.post('/daily-queues', requireRole(UserRole.PROFESSIONAL), async (req, res) => {
  try {
    const profile = await ProfessionalProfile.findOne({ where: { user_id: req.user.id } });
    if (!profile) return error(res, 404, 'Create your professional profile first.');
    const duration = Number(req.body?.average_consultation_duration_minutes) || profile.slot_duration_minutes;
    if (!Number.isInteger(duration) || duration < 1) return error(res, 422, 'Enter a positive whole-number duration.');
    const existing = await DailyQueue.findOne({ where: { professional_profile_id: profile.id, queue_date: today() } });
    if (existing) return error(res, 409, 'A queue already exists for today.', { existing_queue_id: existing.id });
    const queue = await DailyQueue.create({ professional_profile_id: profile.id, queue_date: today(), queue_state: QueueState.OPEN, average_consultation_duration_minutes: duration });
    res.status(201).json({ daily_queue: await queuePayload(queue) });
  } catch (err) { error(res, 500, 'Unable to create the queue.'); }
});

router.get('/daily-queues/:id', async (req, res) => {
  try {
    const queue = await DailyQueue.findByPk(Number(req.params.id));
    if (!queue) return error(res, 404, 'Queue not found.');
    const payload = await queuePayload(queue);
    const profile = await ProfessionalProfile.findByPk(queue.professional_profile_id);
    payload.professional = { id: profile.id, business_name: profile.business_name, consultation_fee: profile.consultation_fee };
    payload.has_waiting_booked_tokens = payload.tokens.some(t => t.token_state === TokenState.BOOKED);
    res.json({ daily_queue: payload });
  } catch (err) { error(res, 500, 'Unable to load the queue.'); }
});

router.post('/tokens', async (req, res) => {
  const professionalProfileId = Number(req.body?.professional_profile_id);
  const name = typeof req.body?.customer_name === 'string' ? req.body.customer_name.trim() : '';
  const phone = String(req.body?.phone_number || '');
  if (!Number.isInteger(professionalProfileId) || !name || !/^\d{10}$/.test(phone) || req.body?.payment_confirmed !== true) {
    return error(res, 422, 'Enter a name, exactly 10 phone digits, choose a professional, and confirm UPI payment.');
  }
  try {
    const profile = await ProfessionalProfile.findByPk(professionalProfileId);
    if (!profile) return error(res, 422, 'Professional not found.');
    const queue = await DailyQueue.findOne({ where: { professional_profile_id: professionalProfileId, queue_date: today() } });
    if (!queue) return error(res, 409, 'This professional has no active queue today.');
    if (queue.queue_state !== QueueState.OPEN) return error(res, 409, 'This queue is paused.');
    const duplicate = await Token.findOne({ where: { daily_queue_id: queue.id, phone_number: phone, token_state: { [Op.in]: [TokenState.BOOKED, TokenState.SERVING, TokenState.SKIPPED] } } });
    if (duplicate) return error(res, 409, 'This phone number already has an active token.', { existing_token_number: duplicate.token_number, existing_tracking_code: duplicate.tracking_code, existing_tracking_path: `/track/${duplicate.tracking_code}` });
    const max = await Token.max('token_number', { where: { daily_queue_id: queue.id } });
    const token = await sequelize.transaction(async transaction => {
      const created = await Token.create({
        daily_queue_id: queue.id, token_number: (max || 0) + 1, customer_name: name, phone_number: phone,
        fee_snapshot: profile.consultation_fee, tracking_code: `TRK${crypto.randomBytes(6).toString('hex').toUpperCase()}`,
        token_state: TokenState.BOOKED
      }, { transaction });
      await PaymentRecord.create({ entity_type: PaymentEntityType.TOKEN, entity_id: created.id, payment_type: 'upi', status: PaymentStatus.PAID, amount: profile.consultation_fee }, { transaction });
      return created;
    });
    res.status(201).json({
      token: { token_number: token.token_number, tracking_code: token.tracking_code, tracking_path: `/track/${token.tracking_code}`, token_state: token.token_state, fee_snapshot: token.fee_snapshot },
      daily_queue: { id: queue.id, queue_state: queue.queue_state, average_consultation_duration_minutes: queue.average_consultation_duration_minutes }
    });
  } catch (err) { error(res, 500, 'Unable to create the token.'); }
});

router.get('/tokens/:trackingCode', async (req, res) => {
  try {
    const token = await Token.findOne({ where: { tracking_code: req.params.trackingCode }, include: [DailyQueue] });
    if (!token) return res.status(404).json({ no_token_found: true });
    const queue = token.DailyQueue;
    const profile = await ProfessionalProfile.findByPk(queue.professional_profile_id);
    const tokens = await Token.findAll({ where: { daily_queue_id: queue.id } });
    const serving = currentToken(tokens);
    const ahead = token.token_state === TokenState.BOOKED && queue.queue_state === QueueState.OPEN
      ? tokens.filter(item => item.token_number < token.token_number && [TokenState.BOOKED, TokenState.SERVING].includes(item.token_state)).length
      : 0;
    res.json({
      tracking: {
        professional_name: profile.business_name, token_number: token.token_number, token_state: token.token_state,
        queue_state: queue.queue_state, current_token_number: serving?.token_number || null,
        current_token_label: serving ? `Token ${serving.token_number}` : 'No token is currently being served',
        people_ahead: ahead, approximate_wait_minutes: queue.queue_state === QueueState.PAUSED ? null : ahead * queue.average_consultation_duration_minutes,
        wait_estimate_available: queue.queue_state !== QueueState.PAUSED
      }
    });
  } catch (err) { error(res, 500, 'Unable to load tracking.'); }
});

async function transition(req, res, target) {
  try {
    const token = await Token.findByPk(Number(req.params.id), { include: [DailyQueue] });
    if (!token) return error(res, 404, 'Token not found.');
    const queue = token.DailyQueue;
    const profile = await ProfessionalProfile.findByPk(queue.professional_profile_id);
    if (profile.user_id !== req.user.id) return error(res, 403, 'You cannot manage this queue.');
    const tokens = await Token.findAll({ where: { daily_queue_id: queue.id } });
    const serving = currentToken(tokens);
    if (target === TokenState.SERVING && (queue.queue_state !== QueueState.OPEN || token.token_state !== TokenState.BOOKED || serving || token.token_number !== Math.min(...tokens.filter(item => item.token_state === TokenState.BOOKED).map(item => item.token_number)))) {
      return error(res, 409, 'Only the lowest booked token in an open queue can start serving.');
    }
    if ([TokenState.COMPLETED, TokenState.SKIPPED].includes(target) && (queue.queue_state !== QueueState.OPEN || token.token_state !== TokenState.SERVING || !serving || serving.id !== token.id)) {
      return error(res, 409, 'Only the current serving token can be changed.');
    }
    await token.update({ token_state: target });
    const updatedQueue = { id: queue.id, queue_state: queue.queue_state, current_token_number: target === TokenState.SERVING ? token.token_number : null, has_waiting_booked_tokens: tokens.some(item => item.token_state === TokenState.BOOKED && item.id !== token.id) };
    res.json({ daily_queue: updatedQueue, token: { id: token.id, token_number: token.token_number, token_state: target } });
  } catch (err) { error(res, 500, 'Unable to update the token.'); }
}
router.post('/tokens/:id/start-serving', requireRole(UserRole.PROFESSIONAL), (req, res) => transition(req, res, TokenState.SERVING));
router.post('/tokens/:id/complete', requireRole(UserRole.PROFESSIONAL), (req, res) => transition(req, res, TokenState.COMPLETED));
router.post('/tokens/:id/skip', requireRole(UserRole.PROFESSIONAL), (req, res) => transition(req, res, TokenState.SKIPPED));

async function queueStateChange(req, res, state) {
  try {
    const queue = await DailyQueue.findByPk(Number(req.params.id));
    if (!queue) return error(res, 404, 'Queue not found.');
    const profile = await ProfessionalProfile.findByPk(queue.professional_profile_id);
    if (profile.user_id !== req.user.id) return error(res, 403, 'You cannot manage this queue.');
    const serving = await Token.findOne({ where: { daily_queue_id: queue.id, token_state: TokenState.SERVING } });
    if ((state === QueueState.PAUSED && (queue.queue_state !== QueueState.OPEN || serving)) || (state === QueueState.OPEN && queue.queue_state !== QueueState.PAUSED)) {
      return error(res, 409, 'Queue is not eligible for this state change.');
    }
    await queue.update({ queue_state: state });
    res.json({ daily_queue: { id: queue.id, queue_state: state, current_token_number: serving?.token_number || null } });
  } catch (err) { error(res, 500, 'Unable to update the queue.'); }
}
router.post('/daily-queues/:id/pause', requireRole(UserRole.PROFESSIONAL), (req, res) => queueStateChange(req, res, QueueState.PAUSED));
router.post('/daily-queues/:id/resume', requireRole(UserRole.PROFESSIONAL), (req, res) => queueStateChange(req, res, QueueState.OPEN));

module.exports = router;
