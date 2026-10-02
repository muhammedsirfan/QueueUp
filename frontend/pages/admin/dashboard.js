import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';

const TABS = ['Overview', 'Categories', 'Professionals', 'Reviews'];

export default function AdminDashboard() {
  const auth = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState('Overview');

  useEffect(() => {
    if (!auth?.ready) return;
    if (!auth.user) return router.replace('/login');
    if (auth.user.role !== 'admin') return router.replace('/');
  }, [auth?.ready, auth?.user]);

  if (!auth?.user) return null;

  return (
    <main className="shell wide">
      <div className="eyebrow">ADMIN DASHBOARD</div>
      <h1>Platform<br /><span>control room.</span></h1>
      <div className="tabs">{TABS.map(t => <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>{t}</button>)}</div>
      {tab === 'Overview' && <Overview />}
      {tab === 'Categories' && <CategoriesAdmin />}
      {tab === 'Professionals' && <ProfessionalsAdmin />}
      {tab === 'Reviews' && <ReviewsAdmin />}
    </main>
  );
}

function Overview() {
  const [stats, setStats] = useState(null);
  const [message, setMessage] = useState('');
  useEffect(() => { api('/api/admin/stats').then(setStats).catch(err => setMessage(err.message)); }, []);
  if (message) return <p className="error">{message}</p>;
  if (!stats) return <p className="muted">Loading…</p>;
  return (
    <div className="dashboard-stat-grid">
      <div className="stat-card"><b>{stats.total_professionals}</b><span>Total professionals</span></div>
      <div className="stat-card"><b>{stats.active_professionals}</b><span>Active professionals</span></div>
      <div className="stat-card"><b>{stats.total_customers}</b><span>Total customers</span></div>
      <div className="stat-card"><b>{stats.total_categories}</b><span>Categories</span></div>
    </div>
  );
}

function CategoriesAdmin() {
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState('');
  const [subName, setSubName] = useState({});
  const [message, setMessage] = useState('');

  async function load() { try { const d = await api('/api/categories?include_inactive=true'); setCategories(d.categories); } catch (err) { setMessage(err.message); } }
  useEffect(() => { load(); }, []);

  async function addCategory(event) {
    event.preventDefault();
    if (!name.trim()) return;
    try { await api('/api/categories', { method: 'POST', body: JSON.stringify({ name }) }); setName(''); await load(); } catch (err) { setMessage(err.message); }
  }

  async function addSubcategory(categoryId) {
    const value = subName[categoryId];
    if (!value?.trim()) return;
    try { await api(`/api/categories/${categoryId}/subcategories`, { method: 'POST', body: JSON.stringify({ name: value }) }); setSubName({ ...subName, [categoryId]: '' }); await load(); } catch (err) { setMessage(err.message); }
  }

  async function toggleCategory(cat) { try { await api(`/api/categories/${cat.id}`, { method: 'PATCH', body: JSON.stringify({ is_active: !cat.is_active }) }); await load(); } catch (err) { setMessage(err.message); } }
  async function toggleSubcategory(sub) { try { await api(`/api/categories/subcategories/${sub.id}`, { method: 'PATCH', body: JSON.stringify({ is_active: !sub.is_active }) }); await load(); } catch (err) { setMessage(err.message); } }

  return (
    <div className="info-block">
      <h3>Manage categories</h3>
      <form onSubmit={addCategory} className="toolbar" style={{ marginBottom: 20 }}>
        <input placeholder="New category name" value={name} onChange={e => setName(e.target.value)} />
        <button type="submit">Add category</button>
      </form>
      {message && <p className="error">{message}</p>}
      {categories.map(cat => (
        <div key={cat.id} style={{ marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid var(--line)' }}>
          <div className="appt-row" style={{ borderBottom: 0 }}>
            <div className="who">{cat.name} {!cat.is_active && <span className="status-pill cancelled">Inactive</span>}</div>
            <button className="ghost" onClick={() => toggleCategory(cat)}>{cat.is_active ? 'Deactivate' : 'Activate'}</button>
          </div>
          <div className="subcategory-pills">
            {cat.subcategories.map(sub => (
              <a key={sub.id} onClick={() => toggleSubcategory(sub)} className={!sub.is_active ? '' : 'active'} style={{ cursor: 'pointer', opacity: sub.is_active ? 1 : 0.5 }}>{sub.name}</a>
            ))}
          </div>
          <div className="toolbar" style={{ marginTop: 10 }}>
            <input placeholder="New subcategory" value={subName[cat.id] || ''} onChange={e => setSubName({ ...subName, [cat.id]: e.target.value })} />
            <button className="ghost" onClick={() => addSubcategory(cat.id)}>Add</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function ProfessionalsAdmin() {
  const [professionals, setProfessionals] = useState([]);
  const [message, setMessage] = useState('');
  async function load() { try { const d = await api('/api/admin/professionals'); setProfessionals(d.professionals); } catch (err) { setMessage(err.message); } }
  useEffect(() => { load(); }, []);

  async function toggleStatus(p) { try { await api(`/api/admin/professionals/${p.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: p.status === 'active' ? 'inactive' : 'active' }) }); await load(); } catch (err) { setMessage(err.message); } }
  async function toggleFeatured(p) { try { await api(`/api/admin/professionals/${p.id}/featured`, { method: 'PATCH', body: JSON.stringify({ is_featured: !p.is_featured }) }); await load(); } catch (err) { setMessage(err.message); } }

  return (
    <div className="info-block">
      <h3>All professionals ({professionals.length})</h3>
      {message && <p className="error">{message}</p>}
      {professionals.map(p => (
        <div key={p.id} className="appt-row">
          <div>
            <div className="who">{p.business_name}</div>
            <div className="when">{p.owner_email} · {p.city || 'No city set'} · {p.average_rating || 'New'} ★ ({p.reviews_count})</div>
          </div>
          <div className="actions">
            <span className={`status-pill ${p.status === 'active' ? 'confirmed' : 'cancelled'}`}>{p.status}</span>
            {p.is_featured && <span className="status-pill completed">Featured</span>}
            <button className="ghost" onClick={() => toggleFeatured(p)}>{p.is_featured ? 'Unfeature' : 'Feature'}</button>
            <button className="ghost" onClick={() => toggleStatus(p)}>{p.status === 'active' ? 'Deactivate' : 'Activate'}</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function ReviewsAdmin() {
  const [reviews, setReviews] = useState([]);
  const [message, setMessage] = useState('');
  async function load() { try { const d = await api('/api/reviews/admin/all'); setReviews(d.reviews); } catch (err) { setMessage(err.message); } }
  useEffect(() => { load(); }, []);

  async function setStatus(id, status) { try { await api(`/api/reviews/admin/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }); await load(); } catch (err) { setMessage(err.message); } }

  return (
    <div className="info-block">
      <h3>Review moderation ({reviews.length})</h3>
      {message && <p className="error">{message}</p>}
      {reviews.map(r => (
        <div key={r.id} className="appt-row">
          <div>
            <div className="who">{r.customer_name} → {r.professional_name}</div>
            <div className="when">{'★'.repeat(r.rating)} · {r.comment || 'No comment'}</div>
          </div>
          <div className="actions">
            <span className={`status-pill ${r.status === 'published' ? 'confirmed' : r.status === 'flagged' ? 'no_show' : 'cancelled'}`}>{r.status}</span>
            {r.status !== 'published' && <button className="ghost" onClick={() => setStatus(r.id, 'published')}>Publish</button>}
            {r.status !== 'hidden' && <button className="ghost" onClick={() => setStatus(r.id, 'hidden')}>Hide</button>}
          </div>
        </div>
      ))}
    </div>
  );
}
