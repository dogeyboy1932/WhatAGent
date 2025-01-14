import reportWebVitals from './reportWebVitals';

import React from 'react';
import ReactDOM from 'react-dom/client';

import App from './App';

import './index.css';


import { LiveAPIProvider } from './contexts/LiveAPIContext';
import { API_CONFIG } from './config/llmConfig';


const API_KEY = process.env.REACT_APP_GEMINI_API_KEY;
if (!API_KEY) throw new Error("Missing REACT_APP_GEMINI_API_KEY in .env");



const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <LiveAPIProvider url={API_CONFIG.uri} apiKey={API_KEY}>
      <App />
    </LiveAPIProvider>
  </React.StrictMode>
);

reportWebVitals();