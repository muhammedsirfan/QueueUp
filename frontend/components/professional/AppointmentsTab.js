import { useEffect, useState } from 'react';
import { api } from '../../lib/api';

function today() { return new Date().toLocaleDateString('en-CA'); }

export default function AppointmentsTab() {
  const [date, setDate] = useState(today());
  const [appointments, setAppointments] = useState([]);
  const [message, setMessage] = useState('');

  useEffect(() => { load(); }, [date]);

  async function load() {
    try { const d = await api(`/api/appointments/professional/me?date=${date}`); setAppointments(d.appointments); } catch (err) { setMessage(err.message); }
  }

  async function act(id, action) {
    try { await api(`/api/appointments/${id}/${action}`, { method: 'POST' }); await load(); } catch (err) { setMessage(err.message); }
  }

  return (
    <div className="info-block">
      <h3>Appointments</h3>
      <label style={{ maxWidth: 220 }}>Date<input type="date" value={date} onChange={e => setDate(e.target.value)} /></label>
      {message && <p className="error">{message}</p>}
      {appointments.length === 0 && <p className="muted">No appointments for this date.</p>}
      {appointments.map(a => (
        <div key={a.id} className="appt-row">
          <div>
            <div className="who">{a.customer_name}</div>
            <div className="when">{a.start_time}–{a.end_time} · {a.customer_phone} · ₹{a.fee_snapshot}</div>
          </div>
          <div className="actions">
            <span className={`status-pill ${a.status}`}>{a.status}</span>
            {['booked', 'confirmed'].includes(a.status) && (
              <>
                <button onClick={() => act(a.id, 'complete')}>Complete</button>
                <button className="ghost" onClick={() => act(a.id, 'no-show')}>No-show</button>
                <button className="ghost" onClick={() => act(a.id, 'cancel')}>Cancel</button>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
