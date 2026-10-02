import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import ProfileTab from '../../components/professional/ProfileTab';
import AvailabilityTab from '../../components/professional/AvailabilityTab';
import AppointmentsTab from '../../components/professional/AppointmentsTab';
import QueueTab from '../../components/professional/QueueTab';

const TABS = ['Profile', 'Availability', 'Appointments', 'Queue'];

export default function ProfessionalDashboard() {
  const auth = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [categories, setCategories] = useState([]);
  const [tab, setTab] = useState('Profile');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!auth?.ready) return;
    if (!auth.user) return router.replace('/login');
    if (auth.user.role !== 'professional') return router.replace('/');
    load();
  }, [auth?.ready, auth?.user]);

  useEffect(() => { api('/api/categories').then(d => setCategories(d.categories)).catch(() => {}); }, []);

  async function load() {
    try {
      const data = await api('/api/professionals/me/profile');
      if (!data.professional) return router.replace('/professional/onboarding');
      setProfile(data.professional);
    } catch (err) { setMessage(err.message); }
  }

  if (!auth?.user || !profile) return <main className="shell"><p className="muted">Loading…</p></main>;

  return (
    <main className="shell wide">
      <div className="eyebrow">PROFESSIONAL DASHBOARD</div>
      <h1>{profile.business_name}</h1>
      <div className="dashboard-stat-grid">
        <div className="stat-card"><b>{profile.average_rating || '—'}</b><span>Average rating ({profile.reviews_count} reviews)</span></div>
        <div className="stat-card"><b>{profile.completed_appointments_count}</b><span>Completed appointments</span></div>
        <div className="stat-card"><b>₹{profile.consultation_fee}</b><span>Consultation fee</span></div>
        <div className="stat-card"><b>{profile.booking_paused ? 'Paused' : 'Active'}</b><span>Booking status</span></div>
      </div>
      <div className="tabs">
        {TABS.map(t => <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>{t}</button>)}
      </div>
      {message && <p className="error">{message}</p>}
      {tab === 'Profile' && <ProfileTab profile={profile} categories={categories} onUpdated={setProfile} />}
      {tab === 'Availability' && <AvailabilityTab />}
      {tab === 'Appointments' && <AppointmentsTab />}
      {tab === 'Queue' && <QueueTab />}
    </main>
  );
}
