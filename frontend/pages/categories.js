import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '../lib/api';

const CATEGORY_ICONS = { Healthcare: '🩺', Legal: '⚖️', Finance: '💰', 'Beauty & Wellness': '💇', Consulting: '🧭' };

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [message, setMessage] = useState('');

  useEffect(() => { api('/api/categories').then(d => setCategories(d.categories)).catch(err => setMessage(err.message)); }, []);

  return (
    <main className="shell wide">
      <Link className="back" href="/">← Home</Link>
      <div className="eyebrow">CATEGORIES</div>
      <h1>Find the right<br /><span>speciality.</span></h1>
      <p className="lead">Every professional on the platform belongs to a category and a speciality subcategory.</p>
      {message && <p className="error">{message}</p>}
      {categories.map(cat => (
        <section key={cat.id} className="info-block" style={{ marginTop: 24 }}>
          <h3><span style={{ marginRight: 8 }}>{CATEGORY_ICONS[cat.name] || '📌'}</span>{cat.name}</h3>
          <div className="subcategory-pills">
            <Link href={`/professionals?category=${cat.slug}`}>All {cat.name}</Link>
            {cat.subcategories.map(sub => <Link key={sub.id} href={`/professionals?category=${cat.slug}&subcategory=${sub.slug}`}>{sub.name}</Link>)}
          </div>
        </section>
      ))}
    </main>
  );
}
