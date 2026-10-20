import { appState } from '../state/store.js';

const pending = new Map();
let frame = null;

export function reportError(error) {
  appState.ui.error = error.message || String(error);
  const banner = document.getElementById('appError');
  if (banner) {
    banner.textContent = appState.ui.error;
    banner.hidden = false;
  }
}

export function clearError() {
  appState.ui.error = null;
  const banner = document.getElementById('appError');
  if (banner) banner.hidden = true;
}

export function flushRenders() {
  frame = null;
  const jobs = [...pending.values()];
  pending.clear();
  for (const job of jobs) {
    try {
      job();
    } catch (error) {
      reportError(error);
    }
  }
}

export function schedule(key, callback) {
  pending.set(key, callback);
  if (frame === null) frame = requestAnimationFrame(flushRenders);
}
