// src/components/dev/PerfDevHud.jsx
// Dev-only performance A/B testing overlay with interactive live toggles
import { useState, useEffect } from "react";
import { isDevMode } from "@/config/env";

export function getPerfFlags() {
  if (typeof window === "undefined" || !isDevMode()) {
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

export function usePerfFlags() {
  const [flags, setFlags] = useState(() => getPerfFlags());

  useEffect(() => {
    if (!isDevMode()) return;
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
  if (typeof window === "undefined" || !isDevMode()) return;
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
  if (typeof window === "undefined" || !isDevMode()) return;
  const params = new URLSearchParams(window.location.search);
  params.delete("perf");
  const newUrl = `${window.location.pathname}${window.location.hash}`;
  window.history.replaceState(null, "", newUrl);
  window.dispatchEvent(new CustomEvent("perf-update"));
}

export default function PerfDevHud() {
  const isDev = isDevMode();
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

  if (!isDev) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 10,
        left: 10,
        zIndex: 99999,
        padding: "8px 12px",
        background: "rgba(10, 10, 14, 0.90)",
        border: "1px solid rgba(255, 255, 255, 0.18)",
        borderRadius: 6,
        color: "#e5e7eb",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        fontSize: 11,
        lineHeight: 1.4,
        pointerEvents: "auto",
        userSelect: "none",
        boxShadow: "0 4px 14px rgba(0,0,0,0.6)",
        backdropFilter: "blur(6px)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, marginBottom: 8 }}>
        <span style={{ fontWeight: 600, color: "#f9fafb", fontSize: 11, letterSpacing: "0.02em" }}>
          Perf Controls
        </span>
        <span style={{ color: "#9ca3af", fontSize: 10 }}>
          Active: <strong style={{ color: flags.any ? "#fbbf24" : "#9ca3af" }}>{flags.raw || "none"}</strong>
        </span>
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
