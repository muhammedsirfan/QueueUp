import Link from 'next/link';
import { useAuth } from '../lib/auth';

export default function Layout({ children }) {
  const auth = useAuth();
  const user = auth?.user;

  function dashboardPath() {
    if (!user) return '/login';
    if (user.role === 'professional') return '/professional/dashboard';
    if (user.role === 'admin') return '/admin/dashboard';
    return '/customer/dashboard';
  }

  return (
    <>
      <header className="topnav">
        <Link className="brand" href="/"><span className="dot" />QueueUp</Link>
        <nav>
          <Link href="/professionals">Browse</Link>
          <Link href="/categories">Categories</Link>
          <Link href="/queue">Queue booking</Link>
          <Link href="/track">Track token</Link>
        </nav>
        <div className="nav-actions">
          {user ? (
            <>
              <Link className="user-chip" href={dashboardPath()}>{user.full_name}</Link>
              <button className="ghost" onClick={auth.logout}>Log out</button>
            </>
          ) : (
            <>
              <Link className="button secondary" href="/login">Log in</Link>
              <Link className="button" href="/register">Sign up</Link>
            </>
          )}
        </div>
      </header>
      {children}
    </>
  );
}
