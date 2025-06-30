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
      const res = await API.post('/auth/refresh', {}, { withCredentials: true });
      token = res.data.token;
      localStorage.setItem('token', token);
    } catch {
      localStorage.removeItem('token');
      return null;
    }
  }
  return token;
}