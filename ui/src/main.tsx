import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

console.log('DEBUG: VITE_IS_CT =', import.meta.env.VITE_IS_CT);

import { GoogleOAuthProvider } from '@react-oauth/google';
import './index.css'
import './i18n';
import App from './App.tsx'
import { StoreProvider } from './store/useStore';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

// Disable pinch zoom on Safari
document.addEventListener('gesturestart', (e) => {
  e.preventDefault();
});

// Disable pinch zoom on Chromium (touchmove with >1 touches)
document.addEventListener('touchmove', (e) => {
  if (e.touches.length > 1) {
    e.preventDefault();
  }
}, { passive: false });

if (!import.meta.env.VITE_IS_CT) {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <GoogleOAuthProvider clientId={CLIENT_ID}>
        <StoreProvider>
          <App />
        </StoreProvider>
      </GoogleOAuthProvider>
    </StrictMode>,
  )
}
