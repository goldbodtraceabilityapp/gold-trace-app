// src/services/api.js
import axios from 'axios';
import { getValidToken } from './auth';

const API = axios.create({
  baseURL: "",
  withCredentials: true, // important for cookies!
});

API.interceptors.request.use(async (config) => {
  const token = await getValidToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default API;
