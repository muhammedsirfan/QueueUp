const { BusinessHours, BlockedDate, Appointment } = require('../models');
const { AppointmentStatus } = require('../models');

const ACTIVE_APPOINTMENT_STATES = [AppointmentStatus.BOOKED, AppointmentStatus.CONFIRMED];

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}
function toHHMM(mins) {
  const h = Math.floor(mins / 60).toString().padStart(2, '0');
  const m = (mins % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

function dateToLocalISO(date) {
  return date.toLocaleDateString('en-CA');
}

function weekdayOf(dateStr) {
  // dateStr "YYYY-MM-DD" parsed as local date to avoid TZ off-by-one.
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).getDay();
}

// Computes bookable slots for a professional on a given date, honoring business hours,
// slot duration, blocked dates/holidays, booking pause, and already-booked appointments.
async function computeSlotsForDate(profile, dateStr) {
  if (profile.booking_paused) return { slots: [], reason: 'Bookings are currently paused.' };

  const blocked = await BlockedDate.findOne({ where: { professional_profile_id: profile.id, blocked_date: dateStr } });
  if (blocked) return { slots: [], reason: blocked.reason_type === 'holiday' ? 'This is a holiday.' : 'This date is blocked.' };

  const weekday = weekdayOf(dateStr);
  const hours = await BusinessHours.findOne({ where: { professional_profile_id: profile.id, weekday } });
  if (!hours || !hours.is_working_day) return { slots: [], reason: 'Closed on this day.' };

  const duration = profile.slot_duration_minutes;
  const startMin = toMinutes(hours.start_time);
  const endMin = toMinutes(hours.end_time);
  const candidateStarts = [];
  for (let t = startMin; t + duration <= endMin; t += duration) candidateStarts.push(t);

  const booked = await Appointment.findAll({ where: { professional_profile_id: profile.id, appointment_date: dateStr, status: { [require('sequelize').Op.in]: ACTIVE_APPOINTMENT_STATES } } });
  const bookedStarts = new Set(booked.map(a => a.start_time));

  const now = new Date();
  const isToday = dateStr === dateToLocalISO(now);
  const nowMin = now.getHours() * 60 + now.getMinutes();

  const slots = candidateStarts
    .filter(startMinute => !(isToday && startMinute <= nowMin))
    .map(startMinute => ({ start_time: toHHMM(startMinute), end_time: toHHMM(startMinute + duration), is_available: !bookedStarts.has(toHHMM(startMinute)) }));

  return { slots, reason: null };
}

// Scans forward day-by-day (bounded) to find the next date with at least one available slot.
async function findNextAvailableDate(profile, fromDateStr, maxDaysToScan = 60) {
  let [y, m, d] = fromDateStr.split('-').map(Number);
  let cursor = new Date(y, m - 1, d);
  for (let i = 0; i < maxDaysToScan; i++) {
    const dateStr = dateToLocalISO(cursor);
    const { slots } = await computeSlotsForDate(profile, dateStr);
    if (slots.some(s => s.is_available)) return dateStr;
    cursor.setDate(cursor.getDate() + 1);
  }
  return null;
}

module.exports = { computeSlotsForDate, findNextAvailableDate, dateToLocalISO, weekdayOf, toMinutes, toHHMM };
