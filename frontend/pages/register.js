import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

export default function Register() {
  const router = useRouter();
  const auth = useAuth();
  const [form, setForm] = useState({ full_name: '', email: '', password: '', phone_number: '', role: 'customer' });
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setMessage('');
    if (!form.full_name.trim() || !/^\S+@\S+\.\S+$/.test(form.email) || form.password.length < 6) {
      return setMessage('Enter your name, a valid email, and a password with at least 6 characters.');
    }
    setBusy(true);
    try {
      const data = await api('/api/auth/register', { method: 'POST', body: JSON.stringify(form) });
      auth.login(data.user, data.token);
      if (data.user.role === 'professional') router.push('/professional/onboarding');
      else router.push('/customer/dashboard');
    } catch (err) { setMessage(err.message); } finally { setBusy(false); }
  }

  return (
    <main className="shell">
      <Link className="back" href="/">← Home</Link>
      <div className="eyebrow">CREATE ACCOUNT</div>
      <h1>Join the<br /><span>platform.</span></h1>
      <p className="lead">Sign up as a customer to book appointments, or as a professional to publish your services.</p>
      <form className="panel" onSubmit={submit}>
        <label>I am a…
          <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
            <option value="customer">Customer looking to book</option>
            <option value="professional">Professional / business owner</option>
          </select>
        </label>
        <label>Full name<input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} placeholder="Your name" /></label>
        <label>Email<input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" /></label>
        <label>Phone number<input inputMode="numeric" maxLength="10" value={form.phone_number} onChange={e => setForm({ ...form, phone_number: e.target.value.replace(/\D/g, '') })} placeholder="10 digits" /></label>
        <label>Password<input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="At least 6 characters" /></label>
        <button type="submit" disabled={busy}>{busy ? 'Creating account…' : 'Create account →'}</button>
        {message && <p className="error">{message}</p>}
      </form>
      <p className="muted" style={{ marginTop: 18 }}>Already have an account? <Link href="/login">Log in</Link></p>
    </main>
  );
}
