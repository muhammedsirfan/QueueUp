import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '../lib/api';

export default function QueueBooking() {
  const [professionals, setProfessionals] = useState([]);
  const [form, setForm] = useState({ professional_profile_id: '', customer_name: '', phone_number: '', payment_confirmed: false });
  const [message, setMessage] = useState('');
  const [result, setResult] = useState(null);

  useEffect(() => { api('/api/queue/professionals?current_date_only=true').then(d => setProfessionals(d.professionals)).catch(err => setMessage(err.message)); }, []);

  const selected = professionals.find(p => String(p.id) === form.professional_profile_id);

  async function submit(event) {
    event.preventDefault();
    setMessage(''); setResult(null);
    if (!form.customer_name.trim() || !/^\d{10}$/.test(form.phone_number) || !form.professional_profile_id || !form.payment_confirmed) {
      return setMessage('Please complete every field: name, 10-digit phone, professional, and UPI payment confirmation.');
    }
    try {
      const data = await api('/api/queue/tokens', { method: 'POST', body: JSON.stringify({ ...form, professional_profile_id: Number(form.professional_profile_id) }) });
      setResult(data);
    } catch (err) {
      if (err.data?.existing_tracking_path) setResult({ duplicate: err.data });
      setMessage(err.message);
    }
  }

  return (
    <main className="shell">
      <Link className="back" href="/">← Home</Link>
      <div className="eyebrow">QUEUE BOOKING</div>
      <h1>Reserve your<br /><span>place in line.</span></h1>
      <p className="lead">One token per active queue. Track your progress live with a private code — no login needed.</p>
      <form className="panel" onSubmit={submit}>
        <label>Choose a professional
          <select value={form.professional_profile_id} onChange={e => setForm({ ...form, professional_profile_id: e.target.value })}>
            <option value="">Select a professional</option>
            {professionals.map(p => (
              <option disabled={!p.current_daily_queue || p.current_daily_queue.queue_state !== 'open'} key={p.id} value={p.id}>
                {p.business_name}{!p.current_daily_queue ? ' · no queue today' : p.current_daily_queue.queue_state === 'paused' ? ' · paused' : ''}
              </option>
            ))}
          </select>
        </label>
        {selected && <div className="doctor-meta">₹{selected.consultation_fee} fee · {selected.current_daily_queue?.average_consultation_duration_minutes || selected.default_average_consultation_duration_minutes} min average</div>}
        <label>Your name<input value={form.customer_name} onChange={e => setForm({ ...form, customer_name: e.target.value })} placeholder="Full name" /></label>
        <label>Phone number<input inputMode="numeric" maxLength="10" value={form.phone_number} onChange={e => setForm({ ...form, phone_number: e.target.value.replace(/\D/g, '') })} placeholder="10 digits" /></label>
        <label className="check"><input type="checkbox" checked={form.payment_confirmed} onChange={e => setForm({ ...form, payment_confirmed: e.target.checked })} /> UPI payment recorded (sandbox)</label>
        <button type="submit">Confirm token <span>→</span></button>
        {message && <p className="error">{message}</p>}
      </form>
      {result && (
        <section className="success">
          <div className="token-number">{result.token?.token_number || result.duplicate.existing_token_number}</div>
          <h2>{result.duplicate ? 'You already have a token' : 'Your token is confirmed'}</h2>
          <p>{result.duplicate ? 'Use your existing tracking link below.' : 'Payment is recorded in the sandbox only.'}</p>
          <Link href={result.token ? result.token.tracking_path : result.duplicate.existing_tracking_path} className="button">Track token →</Link>
        </section>
      )}
    </main>
  );
}
