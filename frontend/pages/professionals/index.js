import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { api } from '../../lib/api';
import ProfessionalCard from '../../components/ProfessionalCard';

const SORTS = [
  { key: 'recent', label: 'Newest' },
  { key: 'featured', label: 'Featured' },
  { key: 'top_rated', label: 'Top rated' },
  { key: 'trending', label: 'Trending' }
];

export default function ProfessionalListing() {
  const router = useRouter();
  const [categories, setCategories] = useState([]);
  const [professionals, setProfessionals] = useState([]);
  const [total, setTotal] = useState(0);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const q = router.query.q || '';
  const category = router.query.category || '';
  const subcategory = router.query.subcategory || '';
  const sort = router.query.sort || 'recent';

  useEffect(() => { api('/api/categories').then(d => setCategories(d.categories)).catch(() => {}); }, []);

  useEffect(() => {
    if (!router.isReady) return;
    setLoading(true);
    setMessage('');
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (category) params.set('category', category);
    if (subcategory) params.set('subcategory', subcategory);
    if (sort) params.set('sort', sort);
    api(`/api/professionals?${params.toString()}`)
      .then(d => { setProfessionals(d.professionals); setTotal(d.total); })
      .catch(err => setMessage(err.message))
      .finally(() => setLoading(false));
  }, [router.isReady, q, category, subcategory, sort]);

  function updateQuery(patch) {
    const next = { ...router.query, ...patch };
    Object.keys(next).forEach(key => { if (!next[key]) delete next[key]; });
    router.push({ pathname: '/professionals', query: next });
  }

  const activeCategory = categories.find(c => c.slug === category);

  return (
    <main className="shell wide">
      <Link className="back" href="/">← Home</Link>
      <div className="eyebrow">BROWSE PROFESSIONALS</div>
      <h1>Find your<br /><span>next appointment.</span></h1>

      <div className="filters">
        <input type="search" placeholder="Search by name" defaultValue={q} onKeyDown={e => { if (e.key === 'Enter') updateQuery({ q: e.target.value }); }} onBlur={e => updateQuery({ q: e.target.value })} />
        <select value={category} onChange={e => updateQuery({ category: e.target.value, subcategory: '' })}>
          <option value="">All categories</option>
          {categories.map(cat => <option key={cat.id} value={cat.slug}>{cat.name}</option>)}
        </select>
        {activeCategory && (
          <select value={subcategory} onChange={e => updateQuery({ subcategory: e.target.value })}>
            <option value="">All specialities</option>
            {activeCategory.subcategories.map(sub => <option key={sub.id} value={sub.slug}>{sub.name}</option>)}
          </select>
        )}
        <div className="sort-tabs">
          {SORTS.map(s => <button key={s.key} className={sort === s.key ? 'active' : ''} onClick={() => updateQuery({ sort: s.key })}>{s.label}</button>)}
        </div>
      </div>

      {message && <p className="error">{message}</p>}
      {!loading && professionals.length === 0 && <div className="empty">No professionals match these filters yet.</div>}
      <p className="muted" style={{ marginBottom: 14 }}>{loading ? 'Searching…' : `${total} professional${total === 1 ? '' : 's'} found`}</p>
      <div className="professional-grid">
        {professionals.map(p => <ProfessionalCard key={p.id} professional={p} />)}
      </div>
    </main>
  );
}
