import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '../lib/api';
import ProfessionalCard from '../components/ProfessionalCard';

const CATEGORY_ICONS = { Healthcare: '🩺', Legal: '⚖️', Finance: '💰', 'Beauty & Wellness': '💇', Consulting: '🧭' };

export default function Home() {
  const [categories, setCategories] = useState([]);
  const [sections, setSections] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    api('/api/categories').then(d => setCategories(d.categories)).catch(err => setMessage(err.message));
    api('/api/professionals/discovery/sections').then(setSections).catch(() => {});
  }, []);

  return (
    <main className="shell wide hero">
      <div className="eyebrow">QUEUEUP · APPOINTMENTS &amp; QUEUES</div>
      <h1>Book any professional.<br /><span>Skip the wait.</span></h1>
      <p className="lead">Discover doctors, lawyers, consultants, salons and more nearby. Book a slot, join a live queue, and pay by UPI — all in one place.</p>
      <div className="card-grid">
        <Link className="feature-card primary" href="/professionals"><b>Find a professional</b><span>Search by category, name, or city.</span><strong>→</strong></Link>
        <Link className="feature-card" href="/queue"><b>Join a queue</b><span>Book a walk-in token and track your place live.</span><strong>→</strong></Link>
        <Link className="feature-card" href="/register"><b>List your business</b><span>Publish your services and manage bookings.</span><strong>→</strong></Link>
      </div>

      <div className="section-title"><h2>Browse by category</h2><Link href="/categories">View all →</Link></div>
      <div className="category-grid">
        {categories.slice(0, 5).map(cat => (
          <Link key={cat.id} className="category-card" href={`/professionals?category=${cat.slug}`}>
            <span className="icon">{CATEGORY_ICONS[cat.name] || '📌'}</span>
            <b>{cat.name}</b>
            <small>{cat.subcategories.length} specialities</small>
          </Link>
        ))}
      </div>

      {sections?.featured?.length > 0 && (
        <>
          <div className="section-title"><h2>Featured professionals</h2><Link href="/professionals?sort=featured">See more →</Link></div>
          <div className="scroll-row">{sections.featured.map(p => <ProfessionalCard key={p.id} professional={p} />)}</div>
        </>
      )}
      {sections?.top_rated?.length > 0 && (
        <>
          <div className="section-title"><h2>Top rated</h2><Link href="/professionals?sort=top_rated">See more →</Link></div>
          <div className="scroll-row">{sections.top_rated.map(p => <ProfessionalCard key={p.id} professional={p} />)}</div>
        </>
      )}
      {sections?.trending?.length > 0 && (
        <>
          <div className="section-title"><h2>Trending now</h2><Link href="/professionals?sort=trending">See more →</Link></div>
          <div className="scroll-row">{sections.trending.map(p => <ProfessionalCard key={p.id} professional={p} />)}</div>
        </>
      )}
      {sections?.recently_joined?.length > 0 && (
        <>
          <div className="section-title"><h2>Recently joined</h2><Link href="/professionals?sort=recent">See more →</Link></div>
          <div className="scroll-row">{sections.recently_joined.map(p => <ProfessionalCard key={p.id} professional={p} />)}</div>
        </>
      )}

      <aside className="notice" style={{ marginTop: 56 }}><b>Sandbox limits</b><br />Payments are recorded via a UPI sandbox confirmation only. No real money moves and no external SMS/WhatsApp is sent (notifications are simulated in-app).</aside>
      {message && <p className="error">{message}</p>}
    </main>
  );
}
