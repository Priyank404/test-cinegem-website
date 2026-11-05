// src/components/dev/MobileDebugOverlay.jsx
// Mobile-friendly on-screen diagnostic overlay activated by ?debug in URL
import { useEffect, useState, useRef } from "react";
import { diagnostics } from "@/lib/diagnostics";
import { clearDowngradeRecovery } from "@/lib/deviceTier";

export default function MobileDebugOverlay() {
  const [visible, setVisible] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [copied, setCopied] = useState(false);
  const [info, setInfo] = useState(() => diagnostics.getWebGLCapabilities());
  const [logs, setLogs] = useState([]);
  const [fps, setFps] = useState(0);
  const [rendererStats, setRendererStats] = useState(null);
  const [tierInfo, setTierInfo] = useState(diagnostics.deviceTier);
  const [probeStatus, setProbeStatus] = useState(diagnostics.probeStatus);

  // FPS calculation
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (!params.has("debug")) return;

    setVisible(true);

    const unsubscribe = diagnostics.subscribe((bus) => {
      setLogs([...bus.logs]);
      if (bus.rendererInfo) setRendererStats({ ...bus.rendererInfo });
      if (bus.deviceTier) setTierInfo(bus.deviceTier);
      setProbeStatus(bus.probeStatus);
    });

    // FPS loop
    let animId;
    const calcFps = () => {
      frameCountRef.current++;
      const now = performance.now();
      const delta = now - lastTimeRef.current;
      if (delta >= 1000) {
        setFps(Math.round((frameCountRef.current * 1000) / delta));
        frameCountRef.current = 0;
        lastTimeRef.current = now;
      }
      animId = requestAnimationFrame(calcFps);
    };
    animId = requestAnimationFrame(calcFps);

    return () => {
      unsubscribe();
      cancelAnimationFrame(animId);
    };
  }, []);

  if (!visible) return null;

  const retry3D = () => {
    clearDowngradeRecovery();
    window.location.reload();
  };

  const copyReport = () => {
    const report = {
      timestamp: new Date().toISOString(),
      url: window.location.href,
      fps,
      tier: tierInfo,
      probeStatus,
      capabilities: info,
      creationFailureReason: diagnostics.creationFailureReason,
      contextLossCount: diagnostics.contextLossCount,
      device: {
        dpr: window.devicePixelRatio,
        cores: navigator.hardwareConcurrency,
        memory: navigator.deviceMemory,
        userAgent: navigator.userAgent,
        screen: `${window.innerWidth}x${window.innerHeight}`,
      },
      renderer: rendererStats,
      logs,
    };
    navigator.clipboard?.writeText(JSON.stringify(report, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (minimized) {
    return (
      <button
        onClick={() => setMinimized(false)}
        style={{
          position: "fixed",
          bottom: 12,
          right: 12,
          zIndex: 999999,
          background: "rgba(18, 18, 18, 0.92)",
          color: "#00ff66",
          border: "1px solid #00ff66",
          borderRadius: 8,
          padding: "6px 12px",
          fontFamily: "monospace",
          fontSize: 12,
          cursor: "pointer",
        }}
      >
        🐞 Debug: {fps} FPS | Tier: {tierInfo?.tier || "?"} | {logs.length} errs
      </button>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        maxHeight: "70vh",
        overflowY: "auto",
        zIndex: 999999,
        background: "rgba(10, 10, 14, 0.95)",
        backdropFilter: "blur(8px)",
        color: "#e2e8f0",
        fontFamily: "ui-monospace, monospace",
        fontSize: 11,
        lineHeight: 1.4,
        padding: "10px 14px",
        borderBottom: "2px solid #C5A059",
        boxShadow: "0 8px 32px rgba(0,0,0,0.8)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ color: "#C5A059", fontWeight: "bold", fontSize: 13 }}>
            ⚡ CINEGEM DEBUG HUD
          </span>
          <span style={{ background: fps < 30 ? "#ef4444" : "#10b981", color: "#fff", padding: "1px 6px", borderRadius: 4, fontWeight: "bold" }}>
            {fps} FPS
          </span>
          <span style={{ color: "#94a3b8" }}>
            Tier: <strong style={{ color: "#38bdf8" }}>{tierInfo?.tier || "detecting..."}</strong>
          </span>
          <span style={{
            background: probeStatus === "ok" ? "#065f46" : probeStatus === "context-lost" ? "#991b1b" : "#854d0e",
            color: "#f8fafc",
            padding: "1px 6px",
            borderRadius: 4,
            fontSize: 10,
          }}>
            Status: {probeStatus}
          </span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={retry3D}
            title="Clear crash downgrade and reload 3D"
            style={{
              background: "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: 4,
              padding: "3px 8px",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            ↻ Retry 3D
          </button>
          <button
            onClick={copyReport}
            style={{
              background: copied ? "#10b981" : "#334155",
              color: "#fff",
              border: "none",
              borderRadius: 4,
              padding: "3px 8px",
              cursor: "pointer",
            }}
          >
            {copied ? "✓ Copied" : "📋 Copy"}
          </button>
          <button
            onClick={() => setMinimized(true)}
            style={{
              background: "#334155",
              color: "#fff",
              border: "none",
              borderRadius: 4,
              padding: "3px 8px",
              cursor: "pointer",
            }}
          >
            _ Min
          </button>
          <button
            onClick={() => setVisible(false)}
            style={{
              background: "#ef4444",
              color: "#fff",
              border: "none",
              borderRadius: 4,
              padding: "3px 8px",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Grid of hardware and WebGL info */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 8, background: "rgba(255,255,255,0.04)", padding: 8, borderRadius: 6 }}>
        <div>
          <div style={{ color: "#C5A059" }}>GPU / Context:</div>
          <div>{info?.version || "No WebGL"}</div>
          <div style={{ color: "#94a3b8", wordBreak: "break-word" }}>{info?.renderer || "Unknown"}</div>
          {diagnostics.creationFailureReason && (
            <div style={{ color: "#f87171", fontSize: 10, marginTop: 4 }}>
              Creation error: {diagnostics.creationFailureReason}
            </div>
          )}
        </div>
        <div>
          <div style={{ color: "#C5A059" }}>Display & Hardware:</div>
          <div>DPR: {window.devicePixelRatio} | MaxTex: {info?.maxTextureSize || "N/A"}</div>
          <div>Cores: {navigator.hardwareConcurrency ?? "?"} | RAM: ~{navigator.deviceMemory ? `${navigator.deviceMemory}GB` : "?"}</div>
          <div>Viewport: {window.innerWidth}x{window.innerHeight}</div>
        </div>
        <div>
          <div style={{ color: "#C5A059" }}>HalfFloat & Texture Caps:</div>
          <div>
            EXT_color_buffer_half_float:{" "}
            <span style={{ color: info?.extensions?.EXT_color_buffer_half_float ? "#10b981" : "#ef4444" }}>
              {info?.extensions?.EXT_color_buffer_half_float ? "YES" : "NO"}
            </span>
          </div>
          <div>
            OES_texture_half_float_linear:{" "}
            <span style={{ color: info?.extensions?.OES_texture_half_float_linear ? "#10b981" : "#ef4444" }}>
              {info?.extensions?.OES_texture_half_float_linear ? "YES" : "NO"}
            </span>
          </div>
          <div>
            EXT_color_buffer_float:{" "}
            <span style={{ color: info?.extensions?.EXT_color_buffer_float ? "#10b981" : "#ef4444" }}>
              {info?.extensions?.EXT_color_buffer_float ? "YES" : "NO"}
            </span>
          </div>
        </div>
        {rendererStats && (
          <div>
            <div style={{ color: "#C5A059" }}>Three.js Renderer:</div>
            <div>Draw calls: {rendererStats.calls} | Triangles: {rendererStats.triangles}</div>
            <div>Textures: {rendererStats.textures} | Geometries: {rendererStats.geometries}</div>
          </div>
        )}
      </div>

      {/* Captured Logs & Errors */}
      <div style={{ marginTop: 8 }}>
        <div style={{ color: logs.length ? "#ef4444" : "#10b981", fontWeight: "bold", marginBottom: 4 }}>
          {logs.length ? `⚠️ Caught Issues (${logs.length}):` : "✓ Zero errors captured"}
        </div>
        {logs.length > 0 && (
          <div style={{ maxHeight: 150, overflowY: "auto", background: "rgba(0,0,0,0.5)", padding: 6, borderRadius: 4 }}>
            {logs.map((log, idx) => (
              <div key={idx} style={{ marginBottom: 6, borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: 4 }}>
                <span style={{ color: "#ef4444", fontWeight: "bold" }}>[{log.time}] {log.source}: </span>
                <span style={{ color: "#fca5a5" }}>{log.message}</span>
                {log.stack && (
                  <pre style={{ margin: "2px 0 0", color: "#94a3b8", fontSize: 9, whiteSpace: "pre-wrap" }}>
                    {log.stack.slice(0, 300)}...
                  </pre>
                )}
                {log.details && (
                  <pre style={{ margin: "2px 0 0", color: "#fbbf24", fontSize: 9, whiteSpace: "pre-wrap" }}>
                    {JSON.stringify(log.details, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
