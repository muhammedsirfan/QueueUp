import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';

export default function Onboarding() {
  const auth = useAuth();
  const router = useRouter();
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ business_name: '', category_id: '', subcategory_id: '', professional_title: '', qualifications: '', years_of_experience: '', about: '', contact_number: '', contact_email: '', city: '', consultation_fee: '', languages_spoken: '' });
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!auth?.ready) return;
    if (!auth.user) return router.replace('/login');
    if (auth.user.role !== 'professional') return router.replace('/');
    api('/api/professionals/me/profile').then(d => { if (d.professional) router.replace('/professional/dashboard'); }).catch(() => {});
  }, [auth?.ready, auth?.user]);

  useEffect(() => { api('/api/categories').then(d => setCategories(d.categories)).catch(() => {}); }, []);

  const activeCategory = categories.find(c => String(c.id) === form.category_id);

  async function submit(event) {
    event.preventDefault();
    setMessage('');
    if (!form.business_name.trim() || !form.category_id) return setMessage('Business name and category are required.');
    setBusy(true);
    try {
      await api('/api/professionals/me/profile', { method: 'POST', body: JSON.stringify({ ...form, category_id: Number(form.category_id), subcategory_id: form.subcategory_id ? Number(form.subcategory_id) : null, years_of_experience: Number(form.years_of_experience) || null, consultation_fee: Number(form.consultation_fee) || 0 }) });
      router.push('/professional/dashboard');
    } catch (err) { setMessage(err.message); } finally { setBusy(false); }
  }

  return (
    <main className="shell">
      <Link className="back" href="/">← Home</Link>
      <div className="eyebrow">SET UP YOUR PROFILE</div>
      <h1>Publish your<br /><span>business.</span></h1>
      <p className="lead">Tell customers who you are. You can add availability and appointment slots next.</p>
      <form className="panel" onSubmit={submit}>
        <label>Business / professional name<input value={form.business_name} onChange={e => setForm({ ...form, business_name: e.target.value })} placeholder="e.g. Dr. Aditi Mehta Clinic" /></label>
        <div className="grid-2">
          <label>Category
            <select value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value, subcategory_id: '' })}>
              <option value="">Select category</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label>Subcategory
            <select value={form.subcategory_id} onChange={e => setForm({ ...form, subcategory_id: e.target.value })} disabled={!activeCategory}>
              <option value="">Select subcategory</option>
              {activeCategory?.subcategories.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
          <label>Professional title<input value={form.professional_title} onChange={e => setForm({ ...form, professional_title: e.target.value })} placeholder="e.g. MBBS, MD" /></label>
          <label>Years of experience<input type="number" min="0" value={form.years_of_experience} onChange={e => setForm({ ...form, years_of_experience: e.target.value })} /></label>
          <label>Consultation / service fee (₹)<input type="number" min="0" value={form.consultation_fee} onChange={e => setForm({ ...form, consultation_fee: e.target.value })} /></label>
          <label>City<input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} placeholder="e.g. Mumbai" /></label>
          <label>Contact number<input value={form.contact_number} onChange={e => setForm({ ...form, contact_number: e.target.value })} placeholder="Phone" /></label>
          <label>Contact email<input value={form.contact_email} onChange={e => setForm({ ...form, contact_email: e.target.value })} placeholder="Email" /></label>
          <label className="full">Languages spoken (comma separated)<input value={form.languages_spoken} onChange={e => setForm({ ...form, languages_spoken: e.target.value })} placeholder="English, Hindi" /></label>
          <label className="full">Qualifications / certifications<input value={form.qualifications} onChange={e => setForm({ ...form, qualifications: e.target.value })} placeholder="e.g. MBBS, MD" /></label>
        </div>
        <label>About<textarea value={form.about} onChange={e => setForm({ ...form, about: e.target.value })} placeholder="Tell customers about your practice" /></label>
        <button type="submit" disabled={busy}>{busy ? 'Creating…' : 'Create profile →'}</button>
        {message && <p className="error">{message}</p>}
      </form>
    </main>
  );
}
