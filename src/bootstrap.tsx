import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import './i18n/config';

// A-10: 전역 에러 핸들러 — ErrorBoundary가 포착하지 못하는 비동기 오류 수집
window.addEventListener('unhandledrejection', (event) => {
  console.error('[Unhandled Promise Rejection]', event.reason);
});
window.addEventListener('error', (event) => {
  console.error('[Global Error]', event.error ?? event.message);
});

const container = document.getElementById('root');
if (!container) {
  document.body.innerHTML = `
    <div style="padding: 20px; font-family: sans-serif; text-align: center;">
      <h1 style="color: #e74c3c;">Initialization Error</h1>
      <p>The root element '#root' was not found. The application cannot start.</p>
    </div>
  `;
  console.error('[Bootstrap] Root element not found');
} else {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
}
