/**
 * readyGateDebug.js
 * -------------------------------------------------------------------------
 * Zero-overhead instrumentation helper for Ring Ready Gate benchmarking.
 * Stamping and console logging only activate in DEV mode or when a debug
 * query flag (?debug, ?ringdebug, ?perf) is explicitly present in the URL.
 * In normal production for site visitors, this is an inert no-op.
 * -------------------------------------------------------------------------
 */

export const isReadyGateDebug = () => {
  if (typeof window === "undefined") return false;
  return Boolean(
    import.meta.env.DEV ||
    window.location.search.includes("debug") ||
    window.location.search.includes("ringdebug") ||
    window.location.search.includes("perf")
  );
};

export const recordGateTimestamp = (key) => {
  if (typeof window === "undefined" || !isReadyGateDebug()) return;
  window.__cinegemReadyGate = window.__cinegemReadyGate || {};
  window.__cinegemReadyGate[key] = performance.now();
};
