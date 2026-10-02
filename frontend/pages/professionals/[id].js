import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';

function dateToLocalISO(date) { return date.toLocaleDateString('en-CA'); }
function nextNDates(n) {
  const dates = [];
  const cursor = new Date();
  for (let i = 0; i < n; i++) { dates.push(dateToLocalISO(cursor)); cursor.setDate(cursor.getDate() + 1); }
  return dates;
}
function formatDateLabel(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return { weekday: date.toLocaleDateString('en-US', { weekday: 'short' }), day: d, month: date.toLocaleDateString('en-US', { month: 'short' }) };
}

export default function ProfessionalDetail() {
  const router = useRouter();
  const auth = useAuth();
  const { id } = router.query;

  const [professional, setProfessional] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [dates] = useState(nextNDates(14));
  const [selectedDate, setSelectedDate] = useState('');
  const [availability, setAvailability] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [bookingForm, setBookingForm] = useState({ customer_name: '', customer_phone: '', notes: '' });
  const [message, setMessage] = useState('');
  const [bookingMessage, setBookingMessage] = useState('');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    api(`/api/professionals/${id}`).then(d => setProfessional(d.professional)).catch(err => setMessage(err.message));
    api(`/api/reviews/professional/${id}`).then(d => setReviews(d.reviews)).catch(() => {});
    setSelectedDate(dateToLocalISO(new Date()));
  }, [id]);

  useEffect(() => {
    if (!id || !selectedDate) return;
    setSelectedSlot('');
    api(`/api/professionals/${id}/availability?date=${selectedDate}`).then(setAvailability).catch(err => setMessage(err.message));
  }, [id, selectedDate]);

  useEffect(() => {
    if (auth?.user) setBookingForm(f => ({ ...f, customer_name: auth.user.full_name, customer_phone: auth.user.phone_number || '' }));
  }, [auth?.user]);

  async function book(event) {
    event.preventDefault();
    setBookingMessage('');
    setResult(null);
    if (!auth?.user) { setBookingMessage('Please log in as a customer to book.'); return; }
    if (auth.user.role !== 'customer') { setBookingMessage('Only customer accounts can book appointments.'); return; }
    if (!selectedSlot) return setBookingMessage('Choose an available time slot.');
    if (!bookingForm.customer_name.trim() || !/^\d{10}$/.test(bookingForm.customer_phone)) return setBookingMessage('Enter your name and a 10-digit phone number.');
    setBusy(true);
    try {
      const data = await api('/api/appointments', {
        method: 'POST',
        body: JSON.stringify({ professional_profile_id: Number(id), appointment_date: selectedDate, start_time: selectedSlot, ...bookingForm, payment_confirmed: true })
      });
      setResult(data.appointment);
    } catch (err) { setBookingMessage(err.message); } finally { setBusy(false); }
  }

  if (message) return <main className="shell"><Link className="back" href="/professionals">← Back</Link><div className="empty">{message}</div></main>;
  if (!professional) return <main className="shell"><p className="muted">Loading…</p></main>;

  const initials = professional.business_name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const languages = professional.languages_spoken || [];

  return (
    <main className="shell wide">
      <Link className="back" href="/professionals">← Back to results</Link>
      <div className="profile-header">
        <div className="avatar-lg">{professional.profile_photo_url ? <img src={professional.profile_photo_url} alt="" /> : initials}</div>
        <div>
          <div className="eyebrow">{professional.category?.name}{professional.subcategory ? ` · ${professional.subcategory.name}` : ''}</div>
          <h1 style={{ fontSize: 40, marginBottom: 6 }}>{professional.business_name}</h1>
          <p className="muted" style={{ margin: 0 }}>{professional.professional_title}</p>
          <div className="meta-row" style={{ maxWidth: 320, marginTop: 10 }}>
            <span className="rating"><span className="star">★</span> {professional.average_rating || 'New'} {professional.reviews_count ? `(${professional.reviews_count} reviews)` : ''}</span>
            <span className="fee">₹{professional.consultation_fee} fee</span>
          </div>
        </div>
      </div>

      <div className="profile-grid">
        <div>
          <div className="info-block">
            <h3>About</h3>
            <p className="muted">{professional.about || 'No description provided yet.'}</p>
          </div>
          <div className="info-block">
            <h3>Details</h3>
            <div className="row"><span>Qualifications</span><b>{professional.qualifications || '—'}</b></div>
            <div className="row"><span>Years of experience</span><b>{professional.years_of_experience ?? '—'}</b></div>
            <div className="row"><span>Languages spoken</span><b>{languages.length ? languages.join(', ') : '—'}</b></div>
            <div className="row"><span>City</span><b>{professional.city || '—'}</b></div>
            <div className="row"><span>Address</span><b>{professional.address_line || '—'}</b></div>
            <div className="row"><span>Contact</span><b>{professional.contact_number || '—'}</b></div>
            {professional.google_maps_url && <div className="row"><span>Location</span><a href={professional.google_maps_url} target="_blank" rel="noreferrer">View on Google Maps →</a></div>}
            {professional.website_url && <div className="row"><span>Website</span><a href={professional.website_url} target="_blank" rel="noreferrer">{professional.website_url}</a></div>}
          </div>
          <div className="info-block">
            <h3>Reviews ({reviews.length})</h3>
            {reviews.length === 0 && <p className="muted">No reviews yet.</p>}
            {reviews.map(r => (
              <div key={r.id} className="review-item">
                <div className="who">{r.customer_name}</div>
                <div className="stars">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</div>
                {r.comment && <div className="comment">{r.comment}</div>}
                <div className="date">{new Date(r.created_at).toLocaleDateString()}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="sticky-book">
          <div className="info-block">
            <h3>Book an appointment</h3>
            {professional.booking_paused && <div className="empty">This professional isn't accepting new bookings right now.</div>}
            {!professional.booking_paused && (
              <>
                <div className="date-strip">
                  {dates.map(d => {
                    const { weekday, day, month } = formatDateLabel(d);
                    return (
                      <div key={d} className={`date-chip ${selectedDate === d ? 'selected' : ''}`} onClick={() => setSelectedDate(d)}>
                        {day}<small>{weekday} {month}</small>
                      </div>
                    );
                  })}
                </div>
                {availability?.reason && <div className="empty">{availability.reason}{availability.next_available_date ? ` Next available: ${availability.next_available_date}.` : ''}</div>}
                {availability && !availability.reason && (
                  <div className="slot-grid">
                    {availability.slots.length === 0 && <p className="muted">No slots configured for this day.</p>}
                    {availability.slots.map(slot => (
                      <button type="button" key={slot.start_time} disabled={!slot.is_available} className={`slot-btn ${selectedSlot === slot.start_time ? 'selected' : ''}`} onClick={() => setSelectedSlot(slot.start_time)}>{slot.start_time}</button>
                    ))}
                  </div>
                )}
                <form onSubmit={book}>
                  <label>Your name<input value={bookingForm.customer_name} onChange={e => setBookingForm({ ...bookingForm, customer_name: e.target.value })} placeholder="Full name" /></label>
                  <label>Phone number<input inputMode="numeric" maxLength="10" value={bookingForm.customer_phone} onChange={e => setBookingForm({ ...bookingForm, customer_phone: e.target.value.replace(/\D/g, '') })} placeholder="10 digits" /></label>
                  <label>Notes (optional)<textarea value={bookingForm.notes} onChange={e => setBookingForm({ ...bookingForm, notes: e.target.value })} placeholder="Anything the professional should know" /></label>
                  <label className="check"><input type="checkbox" checked readOnly /> UPI payment of ₹{professional.consultation_fee} recorded (sandbox)</label>
                  <button type="submit" disabled={busy}>{busy ? 'Booking…' : `Confirm booking · ${selectedSlot || 'pick a slot'} →`}</button>
                  {bookingMessage && <p className="error">{bookingMessage}</p>}
                </form>
                {result && (
                  <section className="success" style={{ marginTop: 18 }}>
                    <h2>Booking confirmed</h2>
                    <p>{result.appointment_date} at {result.start_time} with {professional.business_name}.</p>
                    <Link className="button" href="/customer/dashboard">View my appointments →</Link>
                  </section>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
