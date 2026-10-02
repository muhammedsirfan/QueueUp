import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { api } from '../../lib/api';

export default function Track() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [tracking, setTracking] = useState(null);
  const [message, setMessage] = useState('');

  async function lookup(value) {
    setMessage(''); setTracking(null);
    if (!value) return;
    try { setTracking((await api(`/api/queue/tokens/${encodeURIComponent(value)}`)).tracking); }
    catch (err) { setMessage(err.status === 404 ? 'No token found for that code.' : err.message); }
  }

  useEffect(() => {
    if (router.isReady && router.query.code) {
      const value = Array.isArray(router.query.code) ? router.query.code[0] : router.query.code;
      setCode(value);
      lookup(value);
    }
  }, [router.isReady, router.query.code]);

  return (
    <main className="shell">
      <Link className="back" href="/">← Home</Link>
      <div className="eyebrow">QUEUE TRACKING</div>
      <h1>Follow the<br /><span>line.</span></h1>
      <p className="lead">This code is a convenience, not secure authentication. Refresh to see factual queue changes.</p>
      <form className="search" onSubmit={e => { e.preventDefault(); lookup(code); }}>
        <input value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="Enter tracking code" />
        <button>Check →</button>
      </form>
      {message && <div className="empty">{message}</div>}
      {tracking && (
        <section className="panel tracking">
          <div className="status">{tracking.queue_state === 'paused' ? 'QUEUE PAUSED' : tracking.token_state.toUpperCase()}</div>
          <h2>{tracking.professional_name}</h2>
          <div className="big-token">Token {tracking.token_number}</div>
          <div className="stats">
            <div><b>{tracking.current_token_label}</b><small>Now serving</small></div>
            <div><b>{tracking.people_ahead}</b><small>People ahead</small></div>
            <div><b>{tracking.wait_estimate_available ? `${tracking.approximate_wait_minutes} min` : 'Unavailable'}</b><small>Approx. wait</small></div>
          </div>
          <p className="muted">
            {tracking.token_state === 'completed' ? 'Service completed.'
              : tracking.token_state === 'skipped' ? 'This token was skipped.'
              : tracking.queue_state === 'paused' ? 'The queue is paused. Wait estimate will return when it resumes.'
              : 'Queue facts update when you check again.'}
          </p>
          <button className="refresh" onClick={() => lookup(code)}>Refresh status</button>
        </section>
      )}
    </main>
  );
}
