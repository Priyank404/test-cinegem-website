// src/components/dev/PerfDevHud.jsx
// Dev-only performance A/B testing flags and URL query parser
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

  // Apply noblur class to html element if flag is set (?perf=noblur)
  useEffect(() => {
    if (!isDevMode()) return;
    if (flags.noblur) {
      document.documentElement.classList.add("perf-noblur");
    } else {
      document.documentElement.classList.remove("perf-noblur");
    }
    return () => {
      document.documentElement.classList.remove("perf-noblur");
    };
  }, [flags.noblur]);

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
  return null;
}

