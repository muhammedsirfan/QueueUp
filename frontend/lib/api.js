const BASE_BE_ENDPOINT = process.env.NEXT_PUBLIC_BASE_BE_ENDPOINT;

function getToken() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('queueup_token');
}

export async function api(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${BASE_BE_ENDPOINT}${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(data.error || 'Request failed.'), { data, status: response.status });
  return data;
}
