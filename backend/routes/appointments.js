const express = require('express');
const { Op } = require('sequelize');
const {
  sequelize, Appointment, ProfessionalProfile, PaymentRecord, User,
  AppointmentStatus, PaymentEntityType, PaymentStatus, UserRole
} = require('../models');
const { requireAuth, requireRole } = require('../middleware/auth');
const { error } = require('../utils/respond');
const { computeSlotsForDate, dateToLocalISO } = require('../utils/availability');
const { notify } = require('../utils/notify');
const { NotificationType } = require('../models');

const router = express.Router();

const ACTIVE_STATES = [AppointmentStatus.BOOKED, AppointmentStatus.CONFIRMED];

function appointmentPayload(appointment, profile) {
  return {
    id: appointment.id,
    professional_profile_id: appointment.professional_profile_id,
    professional_name: profile?.business_name,
    appointment_date: appointment.appointment_date,
    start_time: appointment.start_time,
    end_time: appointment.end_time,
    status: appointment.status,
    fee_snapshot: appointment.fee_snapshot,
    customer_name: appointment.customer_name_snapshot,
    customer_phone: appointment.customer_phone_snapshot,
    notes: appointment.notes,
    created_at: appointment.created_at
  };
}

// Customer books a new appointment slot. Requires UPI sandbox payment confirmation flag.
router.post('/', requireRole(UserRole.CUSTOMER), async (req, res) => {
  const professionalProfileId = Number(req.body?.professional_profile_id);
  const appointment_date = typeof req.body?.appointment_date === 'string' ? req.body.appointment_date : '';
  const start_time = typeof req.body?.start_time === 'string' ? req.body.start_time : '';
  const name = typeof req.body?.customer_name === 'string' ? req.body.customer_name.trim() : req.user.full_name;
  const phone = String(req.body?.customer_phone || req.user.phone_number || '');
  const notes = typeof req.body?.notes === 'string' ? req.body.notes.trim() || null : null;
  const upiConfirmed = req.body?.payment_confirmed === true;

  if (!Number.isInteger(professionalProfileId) || !/^\d{4}-\d{2}-\d{2}$/.test(appointment_date) || !/^\d{2}:\d{2}$/.test(start_time) || !name || !/^\d{10}$/.test(phone)) {
    return error(res, 422, 'Provide professional, date, time slot, name, and a 10-digit phone number.');
  }
  if (!upiConfirmed) return error(res, 422, 'Confirm the UPI payment to complete booking.');

  try {
    const profile = await ProfessionalProfile.findByPk(professionalProfileId);
    if (!profile || profile.status !== 'active') return error(res, 404, 'Professional not found.');
    if (profile.booking_paused) return error(res, 409, 'This professional is not accepting bookings right now.');

    const { slots } = await computeSlotsForDate(profile, appointment_date);
    const slot = slots.find(s => s.start_time === start_time);
    if (!slot) return error(res, 409, 'This slot is not part of the schedule.');
    if (!slot.is_available) return error(res, 409, 'This slot was just booked. Please choose another.');

    const appointment = await sequelize.transaction(async transaction => {
      const created = await Appointment.create({
        professional_profile_id: profile.id, customer_id: req.user.id,
        appointment_date, start_time, end_time: slot.end_time,
        status: AppointmentStatus.CONFIRMED, fee_snapshot: profile.consultation_fee,
        customer_name_snapshot: name, customer_phone_snapshot: phone, notes
      }, { transaction });
      await PaymentRecord.create({
        entity_type: PaymentEntityType.APPOINTMENT, entity_id: created.id,
        payment_type: 'upi', status: PaymentStatus.PAID, amount: profile.consultation_fee
      }, { transaction });
      return created;
    });

    await notify(req.user.id, NotificationType.BOOKING_CONFIRMATION, 'Booking confirmed', `Your appointment with ${profile.business_name} on ${appointment_date} at ${start_time} is confirmed.`, { related_entity_type: 'appointment', related_entity_id: appointment.id });

    res.status(201).json({ appointment: appointmentPayload(appointment, profile) });
  } catch (err) { error(res, 500, 'Unable to book appointment.'); }
});

// Customer: appointment history
router.get('/me', requireRole(UserRole.CUSTOMER), async (req, res) => {
  try {
    const where = { customer_id: req.user.id };
    if (req.query.status) where.status = req.query.status;
    const appointments = await Appointment.findAll({ where, include: [ProfessionalProfile], order: [['appointment_date', 'DESC'], ['start_time', 'DESC']] });
    res.json({ appointments: appointments.map(a => appointmentPayload(a, a.ProfessionalProfile)) });
  } catch (err) { error(res, 500, 'Unable to load appointment history.'); }
});

router.post('/:id/cancel', requireAuth, async (req, res) => {
  try {
    const appointment = await Appointment.findByPk(Number(req.params.id), { include: [ProfessionalProfile] });
    if (!appointment) return error(res, 404, 'Appointment not found.');
    const profile = appointment.ProfessionalProfile;
    const isOwner = req.user.role === UserRole.CUSTOMER && appointment.customer_id === req.user.id;
    const isProfessional = req.user.role === UserRole.PROFESSIONAL && profile.user_id === req.user.id;
    if (!isOwner && !isProfessional && req.user.role !== UserRole.ADMIN) return error(res, 403, 'You cannot cancel this appointment.');
    if (!ACTIVE_STATES.includes(appointment.status)) return error(res, 409, 'Only booked or confirmed appointments can be cancelled.');
    await appointment.update({ status: AppointmentStatus.CANCELLED, cancelled_at: new Date(), cancelled_by_role: req.user.role });
    await notify(appointment.customer_id, NotificationType.CANCELLATION, 'Appointment cancelled', `Your appointment with ${profile.business_name} on ${appointment.appointment_date} at ${appointment.start_time} was cancelled.`, { related_entity_type: 'appointment', related_entity_id: appointment.id });
    res.json({ appointment: appointmentPayload(appointment, profile) });
  } catch (err) { error(res, 500, 'Unable to cancel appointment.'); }
});

router.post('/:id/reschedule', requireRole(UserRole.CUSTOMER), async (req, res) => {
  const new_date = typeof req.body?.appointment_date === 'string' ? req.body.appointment_date : '';
  const new_start = typeof req.body?.start_time === 'string' ? req.body.start_time : '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(new_date) || !/^\d{2}:\d{2}$/.test(new_start)) return error(res, 422, 'Provide a new date and time slot.');
  try {
    const appointment = await Appointment.findByPk(Number(req.params.id), { include: [ProfessionalProfile] });
    if (!appointment) return error(res, 404, 'Appointment not found.');
    if (appointment.customer_id !== req.user.id) return error(res, 403, 'You cannot reschedule this appointment.');
    if (!ACTIVE_STATES.includes(appointment.status)) return error(res, 409, 'Only booked or confirmed appointments can be rescheduled.');
    const profile = appointment.ProfessionalProfile;
    const { slots } = await computeSlotsForDate(profile, new_date);
    const slot = slots.find(s => s.start_time === new_start);
    if (!slot || !slot.is_available) return error(res, 409, 'That slot is not available.');

    const result = await sequelize.transaction(async transaction => {
      await appointment.update({ status: AppointmentStatus.RESCHEDULED }, { transaction });
      const created = await Appointment.create({
        professional_profile_id: profile.id, customer_id: req.user.id,
        appointment_date: new_date, start_time: new_start, end_time: slot.end_time,
        status: AppointmentStatus.CONFIRMED, fee_snapshot: appointment.fee_snapshot,
        customer_name_snapshot: appointment.customer_name_snapshot, customer_phone_snapshot: appointment.customer_phone_snapshot,
        notes: appointment.notes, rescheduled_from_id: appointment.id
      }, { transaction });
      return created;
    });
    await notify(req.user.id, NotificationType.RESCHEDULE, 'Appointment rescheduled', `Your appointment with ${profile.business_name} moved to ${new_date} at ${new_start}.`, { related_entity_type: 'appointment', related_entity_id: result.id });
    res.json({ appointment: appointmentPayload(result, profile) });
  } catch (err) { error(res, 500, 'Unable to reschedule appointment.'); }
});

// ---------------------------------------------------------------------------
// Professional-side appointment management
// ---------------------------------------------------------------------------

router.get('/professional/me', requireRole(UserRole.PROFESSIONAL), async (req, res) => {
  try {
    const profile = await ProfessionalProfile.findOne({ where: { user_id: req.user.id } });
    if (!profile) return error(res, 404, 'Create your professional profile first.');
    const where = { professional_profile_id: profile.id };
    if (req.query.date) where.appointment_date = req.query.date;
    if (req.query.status) where.status = req.query.status;
    const appointments = await Appointment.findAll({ where, order: [['appointment_date', 'ASC'], ['start_time', 'ASC']] });
    res.json({ appointments: appointments.map(a => ({ ...appointmentPayload(a, profile) })) });
  } catch (err) { error(res, 500, 'Unable to load appointments.'); }
});

router.post('/:id/complete', requireRole(UserRole.PROFESSIONAL), async (req, res) => {
  try {
    const appointment = await Appointment.findByPk(Number(req.params.id), { include: [ProfessionalProfile] });
    if (!appointment) return error(res, 404, 'Appointment not found.');
    const profile = appointment.ProfessionalProfile;
    if (profile.user_id !== req.user.id) return error(res, 403, 'You cannot manage this appointment.');
    if (!ACTIVE_STATES.includes(appointment.status)) return error(res, 409, 'Only booked or confirmed appointments can be completed.');
    await appointment.update({ status: AppointmentStatus.COMPLETED, completed_at: new Date() });
    await profile.update({ completed_appointments_count: profile.completed_appointments_count + 1 });
    await notify(appointment.customer_id, NotificationType.REVIEW_REQUEST, 'How was your visit?', `Your appointment with ${profile.business_name} is complete. Leave a review to help others.`, { related_entity_type: 'appointment', related_entity_id: appointment.id });
    res.json({ appointment: appointmentPayload(appointment, profile) });
  } catch (err) { error(res, 500, 'Unable to complete appointment.'); }
});

router.post('/:id/no-show', requireRole(UserRole.PROFESSIONAL), async (req, res) => {
  try {
    const appointment = await Appointment.findByPk(Number(req.params.id), { include: [ProfessionalProfile] });
    if (!appointment) return error(res, 404, 'Appointment not found.');
    const profile = appointment.ProfessionalProfile;
    if (profile.user_id !== req.user.id) return error(res, 403, 'You cannot manage this appointment.');
    if (!ACTIVE_STATES.includes(appointment.status)) return error(res, 409, 'Only booked or confirmed appointments can be marked no-show.');
    await appointment.update({ status: AppointmentStatus.NO_SHOW });
    res.json({ appointment: appointmentPayload(appointment, profile) });
  } catch (err) { error(res, 500, 'Unable to update appointment.'); }
});

module.exports = router;
