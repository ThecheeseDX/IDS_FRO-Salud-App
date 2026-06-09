import axios from 'axios';

const COMPUTADORA_IP = '192.168.1.45'; 

const apiClient = axios.create({
  baseURL: `http://${COMPUTADORA_IP}:3000/api`,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default apiClient;