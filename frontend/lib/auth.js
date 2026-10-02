import { createContext, useContext, useEffect, useState } from 'react';
import { api } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = window.localStorage.getItem('queueup_token');
    const cached = window.localStorage.getItem('queueup_user');
    if (token && cached) { try { setUser(JSON.parse(cached)); } catch (err) { /* ignore */ } }
    setReady(true);
  }, []);

  function login(userData, token) {
    window.localStorage.setItem('queueup_token', token);
    window.localStorage.setItem('queueup_user', JSON.stringify(userData));
    setUser(userData);
  }

  function logout() {
    window.localStorage.removeItem('queueup_token');
    window.localStorage.removeItem('queueup_user');
    setUser(null);
  }

  async function refresh() {
    try { const data = await api('/api/auth/me'); setUser(data.user); window.localStorage.setItem('queueup_user', JSON.stringify(data.user)); } catch (err) { logout(); }
  }

  return <AuthContext.Provider value={{ user, ready, login, logout, refresh }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
