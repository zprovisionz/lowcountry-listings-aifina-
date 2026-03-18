import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

// Inject Google Maps script with env key (callback is defined in index.html)
const mapsKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
if (typeof mapsKey === 'string' && mapsKey.length > 0) {
  const script = document.createElement('script');
  script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(mapsKey)}&libraries=places&callback=initGoogleMaps`;
  script.async = true;
  script.defer = true;
  document.head.appendChild(script);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
