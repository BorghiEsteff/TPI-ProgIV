import axios from 'axios';
import { attachInterceptors } from './interceptors';

const djangoClient = axios.create({
  baseURL: import.meta.env.VITE_DJANGO_API_URL || 'http://localhost:8000/api/v1',
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
  },
});

attachInterceptors(djangoClient);

export default djangoClient;

