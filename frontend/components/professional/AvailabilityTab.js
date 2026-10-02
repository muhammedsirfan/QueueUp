import { useEffect, useState } from 'react';
import { api } from '../../lib/api';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function AvailabilityTab() {
  const [days, setDays] = useState(WEEKDAYS.map((_, i) => ({ weekday: i, start_time: '09:00', end_time: '18:00', is_working_day: i !== 0 })));
  const [blockedDates, setBlockedDates] = useState([]);
  const [newBlock, setNewBlock] = useState({ blocked_date: '', reason_type: 'manual_block', note: '' });
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api('/api/professionals/me/business-hours').then(d => { if (d.business_hours.length) setDays(WEEKDAYS.map((_, i) => d.business_hours.find(h => h.weekday === i) || { weekday: i, start_time: '09:00', end_time: '18:00', is_working_day: false })); }).catch(() => {});
    loadBlocked();
  }, []);

  async function loadBlocked() { try { const d = await api('/api/professionals/me/blocked-dates'); setBlockedDates(d.blocked_dates); } catch (err) { setMessage(err.message); } }

  async function saveHours() {
    setBusy(true); setMessage('');
    try { await api('/api/professionals/me/business-hours', { method: 'PUT', body: JSON.stringify({ days }) }); setMessage('Business hours saved.'); }
    catch (err) { setMessage(err.message); } finally { setBusy(false); }
  }

  function updateDay(weekday, patch) { setDays(days.map(d => d.weekday === weekday ? { ...d, ...patch } : d)); }

  async function addBlock(event) {
    event.preventDefault();
    if (!newBlock.blocked_date) return setMessage('Choose a date to block.');
    try { await api('/api/professionals/me/blocked-dates', { method: 'POST', body: JSON.stringify(newBlock) }); setNewBlock({ blocked_date: '', reason_type: 'manual_block', note: '' }); await loadBlocked(); }
    catch (err) { setMessage(err.message); }
  }

  async function removeBlock(id) { try { await api(`/api/professionals/me/blocked-dates/${id}`, { method: 'DELETE' }); await loadBlocked(); } catch (err) { setMessage(err.message); } }

  return (
    <>
      <div className="info-block">
        <h3>Business hours &amp; slot duration</h3>
        {days.map(d => (
          <div key={d.weekday} className="hours-row">
            <span className="day-name">{WEEKDAYS[d.weekday]}</span>
            <input type="time" value={d.start_time} disabled={!d.is_working_day} onChange={e => updateDay(d.weekday, { start_time: e.target.value })} />
            <input type="time" value={d.end_time} disabled={!d.is_working_day} onChange={e => updateDay(d.weekday, { end_time: e.target.value })} />
            <label className="check" style={{ margin: 0 }}><input type="checkbox" checked={d.is_working_day} onChange={e => updateDay(d.weekday, { is_working_day: e.target.checked })} /> Open</label>
          </div>
        ))}
        <button style={{ marginTop: 16 }} onClick={saveHours} disabled={busy}>{busy ? 'Saving…' : 'Save business hours'}</button>
        {message && <p className={message.includes('saved') ? 'muted' : 'error'}>{message}</p>}
      </div>

      <div className="info-block">
        <h3>Holidays &amp; blocked dates</h3>
        <form onSubmit={addBlock} className="grid-2">
          <label>Date<input type="date" value={newBlock.blocked_date} onChange={e => setNewBlock({ ...newBlock, blocked_date: e.target.value })} /></label>
          <label>Reason
            <select value={newBlock.reason_type} onChange={e => setNewBlock({ ...newBlock, reason_type: e.target.value })}>
              <option value="manual_block">Manual block</option>
              <option value="holiday">Holiday</option>
            </select>
          </label>
          <label className="full">Note (optional)<input value={newBlock.note} onChange={e => setNewBlock({ ...newBlock, note: e.target.value })} placeholder="e.g. Diwali holiday" /></label>
          <div className="full"><button type="submit">Add blocked date</button></div>
        </form>
        {blockedDates.length === 0 && <p className="muted">No blocked dates yet.</p>}
        {blockedDates.map(b => (
          <div key={b.id} className="appt-row">
            <div><div className="who">{b.blocked_date}</div><div className="when">{b.reason_type === 'holiday' ? 'Holiday' : 'Manual block'}{b.note ? ` · ${b.note}` : ''}</div></div>
            <button className="ghost" onClick={() => removeBlock(b.id)}>Remove</button>
          </div>
        ))}
      </div>
    </>
  );
}
