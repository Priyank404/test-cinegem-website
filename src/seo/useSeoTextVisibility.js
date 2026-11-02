import { useSyncExternalStore } from 'react';

const STORAGE_KEY = 'cinegem:seoText';

function getInitialVisibility() {
  if (typeof window === 'undefined') return true;

  // 1. Check URL query override (?view=original)
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('view') === 'original') {
      return false;
    }
  } catch (e) {
    // Ignore URL parse error
  }

  // 2. Check build-time default env override
  const defaultEnv =
    (typeof process !== 'undefined' && process.env && process.env.VITE_SEO_TEXT_DEFAULT) ||
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SEO_TEXT_DEFAULT);

  if (defaultEnv === 'off') {
    return false;
  }

  // 3. Check localStorage
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'off') return false;
    if (stored === 'on') return true;
  } catch (e) {
    // LocalStorage blocked/unavailable
  }

  return true;
}

let isVisible = getInitialVisibility();
const listeners = new Set();

function subscribe(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getSnapshot() {
  return isVisible;
}

export function toggleSeoText(forceValue) {
  const nextValue = typeof forceValue === 'boolean' ? forceValue : !isVisible;
  isVisible = nextValue;

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, nextValue ? 'on' : 'off');
    }
  } catch (e) {
    // Ignore storage errors
  }

  listeners.forEach((listener) => listener());
}

export function useSeoTextVisibility() {
  const visible = useSyncExternalStore(subscribe, getSnapshot, () => true);
  return {
    isVisible: visible,
    toggle: toggleSeoText,
  };
}
