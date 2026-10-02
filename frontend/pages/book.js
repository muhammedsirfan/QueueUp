import { useEffect } from 'react';
import { useRouter } from 'next/router';

// Old clinic-only booking URL. Redirects to the generalized queue booking page
// so existing bookmarks/links keep working after the platform-wide rename.
export default function BookRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/queue'); }, []);
  return null;
}
