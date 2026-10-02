import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';

const STATUS_LABEL = { booked: 'Booked', confirmed: 'Confirmed', completed: 'Completed', cancelled: 'Cancelled', rescheduled: 'Rescheduled', no_show: 'No-show' };

export default function CustomerDashboard() {
  const auth = useAuth();
  const router = useRouter();
  const [appointments, setAppointments] = useState([]);
  const [message, setMessage] = useState('');
  const [reviewFor, setReviewFor] = useState(null);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [rescheduleFor, setRescheduleFor] = useState(null);

  useEffect(() => {
    if (!auth?.ready) return;
    if (!auth.user) return router.replace('/login');
    if (auth.user.role !== 'customer') return router.replace('/');
    load();
  }, [auth?.ready, auth?.user]);

  async function load() {
    try { const data = await api('/api/appointments/me'); setAppointments(data.appointments); } catch (err) { setMessage(err.message); }
  }

  async function cancel(id) {
    try { await api(`/api/appointments/${id}/cancel`, { method: 'POST' }); await load(); } catch (err) { setMessage(err.message); }
  }

  async function submitReview(event) {
    event.preventDefault();
    try {
      await api('/api/reviews', { method: 'POST', body: JSON.stringify({ appointment_id: reviewFor.id, rating: reviewForm.rating, comment: reviewForm.comment }) });
      setReviewFor(null); setReviewForm({ rating: 5, comment: '' });
    } catch (err) { setMessage(err.message); }
  }

  if (!auth?.user) return null;
  const upcoming = appointments.filter(a => ['booked', 'confirmed'].includes(a.status));
  const past = appointments.filter(a => !['booked', 'confirmed'].includes(a.status));

  return (
    <main className="shell wide">
      <div className="eyebrow">CUSTOMER DASHBOARD</div>
      <h1>Your<br /><span>appointments.</span></h1>
      {message && <p className="error">{message}</p>}

      <div className="info-block">
        <h3>Upcoming ({upcoming.length})</h3>
        {upcoming.length === 0 && <p className="muted">No upcoming appointments. <Link href="/professionals">Book one →</Link></p>}
        {upcoming.map(a => (
          <div key={a.id} className="appt-row">
            <div>
              <div className="who">{a.professional_name}</div>
              <div className="when">{a.appointment_date} at {a.start_time} · ₹{a.fee_snapshot}</div>
            </div>
            <div className="actions">
              <span className={`status-pill ${a.status}`}>{STATUS_LABEL[a.status]}</span>
              <button className="ghost" onClick={() => setRescheduleFor(a)}>Reschedule</button>
              <button className="ghost" onClick={() => cancel(a.id)}>Cancel</button>
            </div>
          </div>
        ))}
      </div>

      {rescheduleFor && <RescheduleForm appointment={rescheduleFor} onDone={() => { setRescheduleFor(null); load(); }} onCancel={() => setRescheduleFor(null)} />}

      <div className="info-block">
        <h3>History ({past.length})</h3>
        {past.length === 0 && <p className="muted">No past appointments yet.</p>}
        {past.map(a => (
          <div key={a.id} className="appt-row">
            <div>
              <div className="who">{a.professional_name}</div>
              <div className="when">{a.appointment_date} at {a.start_time} · ₹{a.fee_snapshot}</div>
            </div>
            <div className="actions">
              <span className={`status-pill ${a.status}`}>{STATUS_LABEL[a.status]}</span>
              {a.status === 'completed' && <button onClick={() => setReviewFor(a)}>Leave a review</button>}
            </div>
          </div>
        ))}
      </div>

      {reviewFor && (
        <div className="panel">
          <h3>Review {reviewFor.professional_name}</h3>
          <form onSubmit={submitReview}>
            <div className="star-input">
              {[1, 2, 3, 4, 5].map(n => <span key={n} className={n <= reviewForm.rating ? 'filled' : ''} onClick={() => setReviewForm({ ...reviewForm, rating: n })}>★</span>)}
            </div>
            <label>Comment (optional)<textarea value={reviewForm.comment} onChange={e => setReviewForm({ ...reviewForm, comment: e.target.value })} placeholder="How was your experience?" /></label>
            <button type="submit">Submit review</button>
            <button type="button" className="ghost" style={{ marginTop: 8 }} onClick={() => setReviewFor(null)}>Cancel</button>
          </form>
        </div>
      )}
    </main>
  );
}

function RescheduleForm({ appointment, onDone, onCancel }) {
  const [date, setDate] = useState('');
  const [slots, setSlots] = useState([]);
  const [slot, setSlot] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!date) return;
    api(`/api/professionals/${appointment.professional_profile_id}/availability?date=${date}`).then(d => setSlots(d.slots)).catch(err => setMessage(err.message));
  }, [date]);

  async function submit() {
    if (!date || !slot) return setMessage('Choose a date and time.');
    try {
      await api(`/api/appointments/${appointment.id}/reschedule`, { method: 'POST', body: JSON.stringify({ appointment_date: date, start_time: slot }) });
      onDone();
    } catch (err) { setMessage(err.message); }
  }

  return (
    <div className="panel">
      <h3>Reschedule with {appointment.professional_name}</h3>
      <label>New date<input type="date" value={date} onChange={e => setDate(e.target.value)} /></label>
      {slots.length > 0 && (
        <div className="slot-grid">
          {slots.map(s => <button type="button" key={s.start_time} disabled={!s.is_available} className={`slot-btn ${slot === s.start_time ? 'selected' : ''}`} onClick={() => setSlot(s.start_time)}>{s.start_time}</button>)}
        </div>
      )}
      {message && <p className="error">{message}</p>}
      <button onClick={submit}>Confirm reschedule</button>
      <button className="ghost" style={{ marginTop: 8 }} onClick={onCancel}>Cancel</button>
    </div>
  );
}
