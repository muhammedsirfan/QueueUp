import { useEffect, useState } from 'react';
import { api } from '../../lib/api';

export default function QueueTab() {
  const [duration, setDuration] = useState('15');
  const [queue, setQueue] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => { checkExisting(); }, []);

  async function checkExisting() {
    try {
      const data = await api('/api/professionals/me/profile');
      if (!data.professional) return;
      // try today's queue via professionals-for-queue listing to find id
      const list = await api('/api/queue/professionals?current_date_only=true');
      const mine = list.professionals.find(p => p.id === data.professional.id);
      if (mine?.current_daily_queue) await loadQueue(mine.current_daily_queue.id);
    } catch (err) { /* no profile yet or no queue today */ }
  }

  async function openQueue() {
    setMessage('');
    try {
      const data = await api('/api/queue/daily-queues', { method: 'POST', body: JSON.stringify({ average_consultation_duration_minutes: Number(duration) }) });
      setQueue(data.daily_queue);
    } catch (err) {
      if (err.data?.existing_queue_id) return loadQueue(err.data.existing_queue_id);
      setMessage(err.message);
    }
  }

  async function loadQueue(id) { try { const data = await api(`/api/queue/daily-queues/${id}`); setQueue(data.daily_queue); } catch (err) { setMessage(err.message); } }

  async function action(path) { try { await api(path, { method: 'POST' }); await loadQueue(queue.id); } catch (err) { setMessage(err.message); } }

  return (
    <div className="info-block">
      <h3>Walk-in queue</h3>
      {!queue && (
        <div className="toolbar">
          <input type="number" min="1" value={duration} onChange={e => setDuration(e.target.value)} />
          <button onClick={openQueue}>Open today's queue</button>
        </div>
      )}
      {message && <p className="error">{message}</p>}
      {queue && (
        <section style={{ marginTop: 20 }}>
          <div className="queue-head">
            <div>
              <span className={`pill ${queue.queue_state}`}>{queue.queue_state}</span>
              <h2>{queue.queue_date}</h2>
              <p>{queue.average_consultation_duration_minutes} min average · {queue.current_token_number ? `Token ${queue.current_token_number} serving` : 'No token is currently being served'}</p>
            </div>
            <button onClick={() => action(`/api/queue/daily-queues/${queue.id}/${queue.queue_state === 'open' ? 'pause' : 'resume'}`)}>{queue.queue_state === 'open' ? 'Pause queue' : 'Resume queue'}</button>
          </div>
          {queue.tokens.length === 0 ? <div className="empty">No tokens today.</div> : (
            <div className="token-list">
              {queue.tokens.map(token => (
                <div className="token-row" key={token.id}>
                  <div className="row-token">#{token.token_number}</div>
                  <div><b>{token.customer_name}</b><small>{token.masked_phone_number}</small></div>
                  <span className={`state ${token.token_state}`}>{token.token_state}</span>
                  {token.permitted_action && <button onClick={() => action(`/api/queue/tokens/${token.id}/${token.permitted_action.replace('_', '-')}`)}>{token.permitted_action.replace('_', ' ')}</button>}
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
