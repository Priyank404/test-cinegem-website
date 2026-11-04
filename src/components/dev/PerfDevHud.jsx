// src/components/dev/PerfDevHud.jsx
// Dev-only performance A/B testing overlay with interactive live toggles
import { useState, useEffect, useRef } from "react";

export function getPerfFlags() {
  if (typeof window === "undefined") {
    return { noring: false, nofog: false, noblur: false, novideo: false, any: false, raw: "" };
  }
  const params = new URLSearchParams(window.location.search);
  const isDev = import.meta.env.DEV || import.meta.env.VITE_APP_MODE === "dev" || params.has("fps") || params.has("perf");
  if (!isDev) {
    return { noring: false, nofog: false, noblur: false, novideo: false, any: false, raw: "" };
  }
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

export function usePerfFlags() {
  const [flags, setFlags] = useState(() => getPerfFlags());

  useEffect(() => {
    const handleUpdate = () => {
      setFlags(getPerfFlags());
    };
    window.addEventListener("perf-update", handleUpdate);
    window.addEventListener("popstate", handleUpdate);
    return () => {
      window.removeEventListener("perf-update", handleUpdate);
      window.removeEventListener("popstate", handleUpdate);
    };
  }, []);

  return flags;
}

export function togglePerfFlag(flagName) {
  if (typeof window === "undefined") return;
  const current = getPerfFlags();
  const nextValue = !current[flagName];
  const params = new URLSearchParams(window.location.search);
  const perf = (params.get("perf") || "").toLowerCase().trim();
  let flags = perf ? perf.split(",").map((f) => f.trim()).filter(Boolean) : [];

  if (nextValue) {
    if (!flags.includes(flagName)) flags.push(flagName);
  } else {
    flags = flags.filter((f) => f !== flagName);
  }

  if (flags.length > 0) {
    params.set("perf", flags.join(","));
  } else {
    params.delete("perf");
  }

  const queryStr = params.toString() ? `?${params.toString()}` : "";
  const newUrl = `${window.location.pathname}${queryStr}${window.location.hash}`;
  window.history.replaceState(null, "", newUrl);
  window.dispatchEvent(new CustomEvent("perf-update"));
}

export function resetPerfFlags() {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  params.delete("perf");
  const newUrl = `${window.location.pathname}${window.location.hash}`;
  window.history.replaceState(null, "", newUrl);
  window.dispatchEvent(new CustomEvent("perf-update"));
}

export default function PerfDevHud() {
  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const isDev =
    import.meta.env.DEV ||
    import.meta.env.VITE_APP_MODE === "dev" ||
    params?.has("fps") ||
    params?.has("perf");
  const [stats, setStats] = useState({ avg: 60, min: 60, maxDelta: 16 });
  const frameTimesRef = useRef([]);

  const flags = usePerfFlags();

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
        padding: "6px 10px",
        background: "rgba(10, 10, 14, 0.90)",
        border: "1px solid rgba(255, 255, 255, 0.18)",
        borderRadius: 6,
        color: stats.avg < 30 ? "#ff4d4d" : stats.avg < 50 ? "#ffcc00" : "#4ade80",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        fontSize: 11,
        lineHeight: 1.4,
        pointerEvents: "auto",
        userSelect: "none",
        boxShadow: "0 4px 14px rgba(0,0,0,0.6)",
        backdropFilter: "blur(6px)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div>
          <strong>{stats.avg} FPS</strong> <span style={{ opacity: 0.7 }}>(min: {stats.min} FPS / {stats.maxDelta}ms)</span>
        </div>
      </div>

      <div style={{ color: "#9ca3af", fontSize: 10, marginTop: 2, marginBottom: 6 }}>
        Active perf: <span style={{ color: flags.any ? "#fbbf24" : "#9ca3af" }}>{flags.raw || "none"}</span>
      </div>

      {/* Interactive Quick Toggles */}
      <div style={{ display: "flex", gap: "5px", flexWrap: "wrap", maxWidth: "280px" }}>
        <button
          type="button"
          onClick={() => togglePerfFlag("noring")}
          title="Click to toggle 3D Three.js Ring scene on/off"
          style={{
            cursor: "pointer",
            padding: "3px 7px",
            fontSize: "10px",
            fontWeight: "bold",
            borderRadius: "4px",
            border: "1px solid",
            borderColor: flags.noring ? "#ef4444" : "#10b981",
            background: flags.noring ? "rgba(239, 68, 68, 0.25)" : "rgba(16, 185, 129, 0.2)",
            color: flags.noring ? "#fca5a5" : "#6ee7b7",
            transition: "all 0.15s ease",
          }}
        >
          3D Ring: {flags.noring ? "OFF" : "ON"}
        </button>

        <button
          type="button"
          onClick={() => togglePerfFlag("nofog")}
          title="Click to toggle Vanta Fog WebGL shader on/off"
          style={{
            cursor: "pointer",
            padding: "3px 7px",
            fontSize: "10px",
            fontWeight: "bold",
            borderRadius: "4px",
            border: "1px solid",
            borderColor: flags.nofog ? "#ef4444" : "#10b981",
            background: flags.nofog ? "rgba(239, 68, 68, 0.25)" : "rgba(16, 185, 129, 0.2)",
            color: flags.nofog ? "#fca5a5" : "#6ee7b7",
            transition: "all 0.15s ease",
          }}
        >
          Fog: {flags.nofog ? "OFF" : "ON"}
        </button>

        <button
          type="button"
          onClick={() => togglePerfFlag("noblur")}
          title="Click to toggle card CSS backdrop-filter blur on/off"
          style={{
            cursor: "pointer",
            padding: "3px 7px",
            fontSize: "10px",
            borderRadius: "4px",
            border: "1px solid",
            borderColor: flags.noblur ? "#ef4444" : "rgba(255, 255, 255, 0.2)",
            background: flags.noblur ? "rgba(239, 68, 68, 0.2)" : "rgba(255, 255, 255, 0.08)",
            color: flags.noblur ? "#fca5a5" : "#d1d5db",
            transition: "all 0.15s ease",
          }}
        >
          Blur: {flags.noblur ? "OFF" : "ON"}
        </button>

        <button
          type="button"
          onClick={() => resetPerfFlags()}
          title="Reset all performance flags back to normal"
          style={{
            cursor: "pointer",
            padding: "3px 7px",
            fontSize: "10px",
            borderRadius: "4px",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            background: "rgba(255, 255, 255, 0.1)",
            color: "#ffffff",
            transition: "all 0.15s ease",
          }}
        >
          Reset All
        </button>
      </div>
    </div>
  );
}
