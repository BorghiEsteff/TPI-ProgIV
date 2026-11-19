import axios from 'axios';
import { attachInterceptors } from './interceptors';

const nodeClient = axios.create({
  baseURL: import.meta.env.VITE_NODE_API_URL || 'http://localhost:5000/api/v1',
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
  },
});

attachInterceptors(nodeClient);

export default nodeClient;

