import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Calculator } from '@trailofdad/morphkit-calculator/react';
import '@trailofdad/morphkit-calculator/styles.css';
import './playground.css';

// Loads the pinned dictionary release from jsDelivr, like a real consumer would.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <main className="playground">
      <Calculator title="morphkit-calculator" parentProps={{ carrierProbabilities: [0.66, 0.5] }} />
    </main>
  </StrictMode>,
);
