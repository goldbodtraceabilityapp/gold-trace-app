import API from './api';

export async function getValidToken() {
  let token = localStorage.getItem('token');
  if (!token) return null;

  // Decode JWT to check expiry
  const [, payload] = token.split('.');
  const { exp } = JSON.parse(atob(payload));
  const now = Math.floor(Date.now() / 1000);

  if (exp < now + 60) {
    try {
      // Use fetch directly to avoid circular import
      const res = await fetch('http://localhost:5000/auth/refresh', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Refresh failed');
      const data = await res.json();
      token = data.token;
      localStorage.setItem('token', token);
    } catch {
      localStorage.removeItem('token');
      return null;
    }
  }
  return token;
}