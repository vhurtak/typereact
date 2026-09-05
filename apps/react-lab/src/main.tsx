import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.js';
import './styles.css';

/**
 * StrictMode double-invokes render, effects and state updaters in development.
 * That is a feature: it surfaces the impure code and the un-cleaned-up effects
 * that break under concurrent rendering. Never "fix" a StrictMode warning by
 * removing StrictMode — fix the effect's cleanup.
 */
createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
