import API from './api';

export async function getValidToken() {
  let token = localStorage.getItem('token');
  const refreshToken = localStorage.getItem('refreshToken');
  if (!token || !refreshToken) return null;

  // Decode JWT to check expiry
  const [, payload] = token.split('.');
  const { exp } = JSON.parse(atob(payload));
  const now = Math.floor(Date.now() / 1000);

  if (exp < now + 60) { // If token expires in less than 1 minute
    try {
      const res = await API.post('/auth/refresh', { refreshToken });
      token = res.data.token;
      localStorage.setItem('token', token);
    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      return null;
    }
  }
  return token;
}