import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

export default function Login() {
  const router = useRouter();
  const auth = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setMessage('');
    if (!form.email || !form.password) return setMessage('Enter your email and password.');
    setBusy(true);
    try {
      const data = await api('/api/auth/login', { method: 'POST', body: JSON.stringify(form) });
      auth.login(data.user, data.token);
      if (data.user.role === 'professional') router.push('/professional/dashboard');
      else if (data.user.role === 'admin') router.push('/admin/dashboard');
      else router.push('/customer/dashboard');
    } catch (err) { setMessage(err.message); } finally { setBusy(false); }
  }

  return (
    <main className="shell">
      <Link className="back" href="/">← Home</Link>
      <div className="eyebrow">LOG IN</div>
      <h1>Welcome<br /><span>back.</span></h1>
      <p className="lead">Log in to book appointments, manage your business, or moderate the platform.</p>
      <form className="panel" onSubmit={submit}>
        <label>Email<input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" /></label>
        <label>Password<input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="••••••••" /></label>
        <button type="submit" disabled={busy}>{busy ? 'Logging in…' : 'Log in →'}</button>
        {message && <p className="error">{message}</p>}
      </form>
      <p className="muted" style={{ marginTop: 18 }}>New here? <Link href="/register">Create an account</Link></p>
      <p className="muted" style={{ marginTop: 8, fontSize: 13 }}>Demo logins: customer@queueup.app · dr.mehta@queueup.app · admin@queueup.app (password: password123)</p>
    </main>
  );
}
