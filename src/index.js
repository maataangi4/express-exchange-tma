import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App, { useExchangeStore } from './App';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

useExchangeStore.setState({ ratesLoading: true });
useExchangeStore.getState().fetchExchangeRates();

reportWebVitals();
