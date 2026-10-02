import { useState } from 'react';
import { api } from '../../lib/api';

export default function ProfileTab({ profile, categories, onUpdated }) {
  const activeCategory = categories.find(c => c.id === profile.category_id);
  const [form, setForm] = useState({
    business_name: profile.business_name || '', category_id: String(profile.category_id || ''), subcategory_id: String(profile.subcategory_id || ''),
    professional_title: profile.professional_title || '', qualifications: profile.qualifications || '', years_of_experience: profile.years_of_experience || '',
    about: profile.about || '', contact_number: profile.contact_number || '', contact_email: profile.contact_email || '',
    address_line: profile.address_line || '', city: profile.city || '', google_maps_url: profile.google_maps_url || '',
    consultation_fee: profile.consultation_fee || 0, languages_spoken: (profile.languages_spoken || []).join(', '),
    website_url: profile.website_url || '', profile_photo_url: profile.profile_photo_url || '',
    slot_duration_minutes: profile.slot_duration_minutes || 15, booking_paused: profile.booking_paused
  });
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const category = categories.find(c => String(c.id) === form.category_id);

  async function submit(event) {
    event.preventDefault();
    setMessage(''); setBusy(true);
    try {
      const data = await api('/api/professionals/me/profile', {
        method: 'PATCH',
        body: JSON.stringify({ ...form, category_id: Number(form.category_id) || undefined, subcategory_id: form.subcategory_id ? Number(form.subcategory_id) : null, years_of_experience: Number(form.years_of_experience) || null, consultation_fee: Number(form.consultation_fee) || 0, slot_duration_minutes: Number(form.slot_duration_minutes) || 15 })
      });
      onUpdated(data.professional);
      setMessage('Saved.');
    } catch (err) { setMessage(err.message); } finally { setBusy(false); }
  }

  async function togglePause() {
    try { const data = await api('/api/professionals/me/profile', { method: 'PATCH', body: JSON.stringify({ booking_paused: !form.booking_paused }) }); setForm({ ...form, booking_paused: data.professional.booking_paused }); onUpdated(data.professional); } catch (err) { setMessage(err.message); }
  }

  return (
    <div className="info-block">
      <h3>Business profile {form.booking_paused && <span className="status-pill" style={{ marginLeft: 8 }}>Bookings paused</span>}</h3>
      <button type="button" className="ghost" style={{ marginBottom: 16 }} onClick={togglePause}>{form.booking_paused ? 'Resume bookings' : 'Pause bookings'}</button>
      <form onSubmit={submit}>
        <label>Business / professional name<input value={form.business_name} onChange={e => setForm({ ...form, business_name: e.target.value })} /></label>
        <div className="grid-2">
          <label>Category
            <select value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value, subcategory_id: '' })}>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label>Subcategory
            <select value={form.subcategory_id} onChange={e => setForm({ ...form, subcategory_id: e.target.value })}>
              <option value="">None</option>
              {category?.subcategories.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
          <label>Professional title<input value={form.professional_title} onChange={e => setForm({ ...form, professional_title: e.target.value })} /></label>
          <label>Qualifications<input value={form.qualifications} onChange={e => setForm({ ...form, qualifications: e.target.value })} /></label>
          <label>Years of experience<input type="number" min="0" value={form.years_of_experience} onChange={e => setForm({ ...form, years_of_experience: e.target.value })} /></label>
          <label>Consultation / service fee (₹)<input type="number" min="0" value={form.consultation_fee} onChange={e => setForm({ ...form, consultation_fee: e.target.value })} /></label>
          <label>Slot duration (minutes)<input type="number" min="1" value={form.slot_duration_minutes} onChange={e => setForm({ ...form, slot_duration_minutes: e.target.value })} /></label>
          <label>Contact number<input value={form.contact_number} onChange={e => setForm({ ...form, contact_number: e.target.value })} /></label>
          <label>Contact email<input value={form.contact_email} onChange={e => setForm({ ...form, contact_email: e.target.value })} /></label>
          <label>City<input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} /></label>
          <label className="full">Address<input value={form.address_line} onChange={e => setForm({ ...form, address_line: e.target.value })} /></label>
          <label className="full">Google Maps URL<input value={form.google_maps_url} onChange={e => setForm({ ...form, google_maps_url: e.target.value })} placeholder="https://maps.google.com/..." /></label>
          <label className="full">Languages spoken (comma separated)<input value={form.languages_spoken} onChange={e => setForm({ ...form, languages_spoken: e.target.value })} /></label>
          <label className="full">Website URL<input value={form.website_url} onChange={e => setForm({ ...form, website_url: e.target.value })} /></label>
          <label className="full">Profile photo URL<input value={form.profile_photo_url} onChange={e => setForm({ ...form, profile_photo_url: e.target.value })} placeholder="https://…" /></label>
        </div>
        <label>About<textarea value={form.about} onChange={e => setForm({ ...form, about: e.target.value })} /></label>
        <button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>
        {message && <p className={message === 'Saved.' ? 'muted' : 'error'}>{message}</p>}
      </form>
    </div>
  );
}
