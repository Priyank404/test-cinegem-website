// src/components/dev/PerfDevHud.jsx
// Dev-only performance A/B testing overlay and query parameter reader
import { useState, useEffect, useRef } from "react";

export function getPerfFlags() {
  if (typeof window === "undefined") {
    return { noring: false, nofog: false, noblur: false, novideo: false, any: false, raw: "" };
  }
  const isDev = import.meta.env.DEV || import.meta.env.VITE_APP_MODE === "dev";
  if (!isDev) {
    return { noring: false, nofog: false, noblur: false, novideo: false, any: false, raw: "" };
  }
  const params = new URLSearchParams(window.location.search);
  const perf = (params.get("perf") || "").toLowerCase().trim();
  const flags = perf ? perf.split(",").map((f) => f.trim()).filter(Boolean) : [];
  return {
    noring: flags.includes("noring"),
    nofog: flags.includes("nofog"),
    noblur: flags.includes("noblur"),
    novideo: flags.includes("novideo"),
    any: flags.length > 0,
    raw: perf,
  };
}

export default function PerfDevHud() {
  const isDev = import.meta.env.DEV || import.meta.env.VITE_APP_MODE === "dev";
  const [stats, setStats] = useState({ avg: 60, min: 60, maxDelta: 16 });
  const frameTimesRef = useRef([]);

  const flags = getPerfFlags();

  // Apply noblur class to html element
  useEffect(() => {
    if (!isDev) return;
    if (flags.noblur) {
      document.documentElement.classList.add("perf-noblur");
    } else {
      document.documentElement.classList.remove("perf-noblur");
    }
    return () => {
      document.documentElement.classList.remove("perf-noblur");
    };
  }, [flags.noblur, isDev]);

  // RequestAnimationFrame FPS monitor over sliding 2s window
  useEffect(() => {
    if (!isDev) return;

    let animId;
    let lastTime = performance.now();
    let lastUiUpdate = performance.now();

    const loop = (now) => {
      const delta = now - lastTime;
      lastTime = now;

      // Track frame timestamp and delta
      frameTimesRef.current.push({ time: now, delta });

      // Keep only frames in last 2000 ms
      const cutoff = now - 2000;
      frameTimesRef.current = frameTimesRef.current.filter((f) => f.time >= cutoff);

      // Update UI once every 200 ms to avoid overhead
      if (now - lastUiUpdate > 200 && frameTimesRef.current.length > 2) {
        lastUiUpdate = now;
        const frames = frameTimesRef.current;
        const totalTime = frames[frames.length - 1].time - frames[0].time;
        const avgFps = totalTime > 0 ? Math.round(((frames.length - 1) / (totalTime / 1000))) : 60;
        let maxDelta = 0;
        for (const f of frames) {
          if (f.delta > maxDelta) maxDelta = f.delta;
        }
        const minFps = maxDelta > 0 ? Math.round(1000 / maxDelta) : avgFps;
        setStats({
          avg: avgFps,
          min: minFps,
          maxDelta: Math.round(maxDelta),
        });
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isDev]);

  if (!isDev) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 10,
        left: 10,
        zIndex: 99999,
        padding: "4px 8px",
        background: "rgba(10, 10, 14, 0.85)",
        border: "1px solid rgba(255, 255, 255, 0.15)",
        borderRadius: 4,
        color: stats.avg < 45 ? "#ff4d4d" : stats.avg < 55 ? "#ffcc00" : "#4ade80",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        fontSize: 11,
        lineHeight: 1.4,
        pointerEvents: "none",
        boxShadow: "0 2px 10px rgba(0,0,0,0.5)",
      }}
    >
      <div>
        <strong>{stats.avg} FPS</strong> (worst: {stats.min} FPS / {stats.maxDelta}ms)
      </div>
      <div style={{ color: "#9ca3af", fontSize: 10 }}>
        perf: {flags.raw || "none"}
      </div>
    </div>
  );
}
