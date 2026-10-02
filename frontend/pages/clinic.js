import { useEffect } from 'react';
import { useRouter } from 'next/router';

// Old clinic-only dashboard URL. Redirects to the generalized professional dashboard.
export default function ClinicRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/professional/dashboard'); }, []);
  return null;
}
