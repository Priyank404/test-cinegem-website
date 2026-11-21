import React, { useState, useRef, useEffect } from "react";

export const DEFAULT_DIAMOND_CONFIG = {
  roughness: 0.04,
  ior: 2.72,
  dispersion: 0.02, // aberrationStrength
  bounces: 3,
  fresnel: 0.0,
  envMapIntensity: 0.0,
  opacity: 1.0,

  // Physical Matte diamond fallback extras
  transmission: 0.70,
  thickness: 1.8,
  attenuationDistance: 1.2,
  attenuationColor: "#0a0c12",
  clearcoat: 0.25,
  clearcoatRoughness: 0.09,
};

/**
 * Reusable core controls for diamond optical physics and material parameters.
 * Clean, uncluttered layout with sliders and direct numeric inputs.
 */
export function DiamondControlsContent({
  config = DEFAULT_DIAMOND_CONFIG,
  onChange,
  onReset,
}) {
  const [showPhysicalExtras, setShowPhysicalExtras] = useState(false);
  const [copiedToast, setCopiedToast] = useState(false);

  const update = (key, val) => {
    if (!onChange) return;
    onChange({
      ...config,
      [key]: val,
    });
  };

  const handleCopyJson = () => {
    const payload = JSON.stringify(config, null, 2);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(payload);
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 2000);
    }
  };

  const currentConfig = { ...DEFAULT_DIAMOND_CONFIG, ...(config || {}) };

  const inputNumberStyle = {
    width: 65,
    background: "rgba(0, 0, 0, 0.4)",
    border: "1px solid rgba(100, 210, 255, 0.3)",
    borderRadius: 4,
    color: "#64d2ff",
    fontSize: 11,
    fontFamily: "monospace",
    fontWeight: 700,
    padding: "2px 5px",
    textAlign: "right",
    outline: "none",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Optical Refraction Parameters */}
      <div
        style={{
          background: "rgba(0, 0, 0, 0.25)",
          padding: "12px",
          borderRadius: 8,
          border: "1px solid rgba(100, 210, 255, 0.2)",
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 700, color: "#64d2ff", marginBottom: 12, letterSpacing: "0.04em" }}>
          DIAMOND OPTICS
        </div>

        {/* 1. Roughness */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <span style={{ color: "#e0e6ed", fontSize: 11, fontWeight: 600 }}>Roughness</span>
            <input
              type="number"
              min={0.0}
              max={2.0}
              step={0.005}
              value={Number(currentConfig.roughness)}
              onChange={(e) => update("roughness", Math.max(0, Number(e.target.value)))}
              style={inputNumberStyle}
            />
          </div>
          <input
            type="range"
            min={0.0}
            max={2.0}
            step={0.005}
            value={currentConfig.roughness}
            onChange={(e) => update("roughness", Number(e.target.value))}
            style={{ width: "100%", accentColor: "#64d2ff", height: 4, cursor: "pointer" }}
          />
        </div>

        {/* 2. IOR */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <span style={{ color: "#e0e6ed", fontSize: 11, fontWeight: 600 }}>Refractive Index (IOR)</span>
            <input
              type="number"
              min={1.0}
              max={5.0}
              step={0.005}
              value={Number(currentConfig.ior)}
              onChange={(e) => update("ior", Math.max(1, Number(e.target.value)))}
              style={inputNumberStyle}
            />
          </div>
          <input
            type="range"
            min={1.0}
            max={5.0}
            step={0.005}
            value={currentConfig.ior}
            onChange={(e) => update("ior", Number(e.target.value))}
            style={{ width: "100%", accentColor: "#64d2ff", height: 4, cursor: "pointer" }}
          />
        </div>

        {/* 3. Dispersion */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <span style={{ color: "#e0e6ed", fontSize: 11, fontWeight: 600 }}>Dispersion (Fire)</span>
            <input
              type="number"
              min={0.0}
              max={0.15}
              step={0.001}
              value={Number(currentConfig.dispersion)}
              onChange={(e) => update("dispersion", Math.max(0, Number(e.target.value)))}
              style={{ ...inputNumberStyle, color: "#ffda85", borderColor: "rgba(255, 218, 133, 0.4)" }}
            />
          </div>
          <input
            type="range"
            min={0.0}
            max={0.15}
            step={0.001}
            value={currentConfig.dispersion}
            onChange={(e) => update("dispersion", Number(e.target.value))}
            style={{ width: "100%", accentColor: "#ffda85", height: 4, cursor: "pointer" }}
          />
        </div>

        {/* 4. Ray Bounces */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <span style={{ color: "#e0e6ed", fontSize: 11, fontWeight: 600 }}>Ray Bounces</span>
            <input
              type="number"
              min={1}
              max={16}
              step={1}
              value={Number(currentConfig.bounces)}
              onChange={(e) => update("bounces", Math.max(1, Math.min(16, Math.round(Number(e.target.value)))))}
              style={inputNumberStyle}
            />
          </div>
          <input
            type="range"
            min={1}
            max={16}
            step={1}
            value={currentConfig.bounces}
            onChange={(e) => update("bounces", Number(e.target.value))}
            style={{ width: "100%", accentColor: "#64d2ff", height: 4, cursor: "pointer" }}
          />
        </div>

        {/* 5. Surface Fresnel */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <span style={{ color: "#e0e6ed", fontSize: 11, fontWeight: 600 }}>Surface Fresnel</span>
            <input
              type="number"
              min={0.0}
              max={3.0}
              step={0.01}
              value={Number(currentConfig.fresnel)}
              onChange={(e) => update("fresnel", Math.max(0, Number(e.target.value)))}
              style={inputNumberStyle}
            />
          </div>
          <input
            type="range"
            min={0.0}
            max={3.0}
            step={0.01}
            value={currentConfig.fresnel}
            onChange={(e) => update("fresnel", Number(e.target.value))}
            style={{ width: "100%", accentColor: "#64d2ff", height: 4, cursor: "pointer" }}
          />
        </div>

        {/* 6. Sparkle Radiance */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <span style={{ color: "#e0e6ed", fontSize: 11, fontWeight: 600 }}>Sparkle Radiance</span>
            <input
              type="number"
              min={0.0}
              max={10.0}
              step={0.05}
              value={Number(currentConfig.envMapIntensity)}
              onChange={(e) => update("envMapIntensity", Math.max(0, Number(e.target.value)))}
              style={inputNumberStyle}
            />
          </div>
          <input
            type="range"
            min={0.0}
            max={10.0}
            step={0.05}
            value={currentConfig.envMapIntensity}
            onChange={(e) => update("envMapIntensity", Number(e.target.value))}
            style={{ width: "100%", accentColor: "#64d2ff", height: 4, cursor: "pointer" }}
          />
        </div>

        {/* 7. Opacity */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <span style={{ color: "#e0e6ed", fontSize: 11, fontWeight: 600 }}>Opacity</span>
            <input
              type="number"
              min={0.0}
              max={1.0}
              step={0.01}
              value={Number(currentConfig.opacity)}
              onChange={(e) => update("opacity", Math.max(0, Math.min(1.0, Number(e.target.value))))}
              style={inputNumberStyle}
            />
          </div>
          <input
            type="range"
            min={0.0}
            max={1.0}
            step={0.01}
            value={currentConfig.opacity}
            onChange={(e) => update("opacity", Number(e.target.value))}
            style={{ width: "100%", accentColor: "#64d2ff", height: 4, cursor: "pointer" }}
          />
        </div>
      </div>

      {/* Collapsible Physical Volume Extras (for Matte / Fallback Mode) */}
      <div
        style={{
          background: "rgba(0, 0, 0, 0.25)",
          borderRadius: 8,
          border: "1px solid rgba(255, 255, 255, 0.1)",
          overflow: "hidden",
        }}
      >
        <button
          type="button"
          onClick={() => setShowPhysicalExtras((v) => !v)}
          style={{
            width: "100%",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "8px 10px",
            background: "rgba(255, 255, 255, 0.04)",
            border: "none",
            color: "#b0c4de",
            fontSize: 10,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <span>PHYSICAL VOLUME EXTRAS</span>
          <span>{showPhysicalExtras ? "▲" : "▼"}</span>
        </button>

        {showPhysicalExtras && (
          <div style={{ padding: "10px", display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9.5, marginBottom: 2 }}>
                  <span>Transmission</span>
                  <span style={{ color: "#64d2ff" }}>{currentConfig.transmission.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min={0.0}
                  max={1.0}
                  step={0.01}
                  value={currentConfig.transmission}
                  onChange={(e) => update("transmission", Number(e.target.value))}
                  style={{ width: "100%", height: 3 }}
                />
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9.5, marginBottom: 2 }}>
                  <span>Thickness</span>
                  <span style={{ color: "#64d2ff" }}>{currentConfig.thickness.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min={0.0}
                  max={5.0}
                  step={0.1}
                  value={currentConfig.thickness}
                  onChange={(e) => update("thickness", Number(e.target.value))}
                  style={{ width: "100%", height: 3 }}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9.5, marginBottom: 2 }}>
                  <span>Clearcoat</span>
                  <span style={{ color: "#64d2ff" }}>{currentConfig.clearcoat.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min={0.0}
                  max={1.0}
                  step={0.01}
                  value={currentConfig.clearcoat}
                  onChange={(e) => update("clearcoat", Number(e.target.value))}
                  style={{ width: "100%", height: 3 }}
                />
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9.5, marginBottom: 2 }}>
                  <span>Coat Rough.</span>
                  <span style={{ color: "#64d2ff" }}>{currentConfig.clearcoatRoughness.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min={0.0}
                  max={1.0}
                  step={0.01}
                  value={currentConfig.clearcoatRoughness}
                  onChange={(e) => update("clearcoatRoughness", Number(e.target.value))}
                  style={{ width: "100%", height: 3 }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Footer Buttons */}
      <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
        <button
          type="button"
          onClick={handleCopyJson}
          style={{
            flex: 1,
            background: copiedToast ? "rgba(0, 255, 128, 0.25)" : "rgba(100, 210, 255, 0.15)",
            border: copiedToast ? "1px solid #00ff80" : "1px solid rgba(100, 210, 255, 0.4)",
            color: copiedToast ? "#00ff80" : "#8ecbff",
            borderRadius: 6,
            padding: "6px 8px",
            fontSize: 10,
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
        >
          {copiedToast ? "✓ Copied!" : "📋 Copy JSON"}
        </button>

        {onReset && (
          <button
            type="button"
            onClick={onReset}
            style={{
              flex: 1,
              background: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              color: "#ddd",
              borderRadius: 6,
              padding: "6px 8px",
              fontSize: 10,
              cursor: "pointer",
            }}
          >
            🔄 Reset
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Floating, Draggable Diamond Tuning Panel for Dev Mode.
 * Click and drag by the header to move anywhere on the screen.
 */
export default function DiamondDevPanel({
  config,
  onChange,
  onReset,
  onSave,
  onClose,
}) {
  const [minimized, setMinimized] = useState(false);

  // Position state with safe initial coordinates
  const [position, setPosition] = useState(() => {
    if (typeof window !== "undefined") {
      const savedX = Math.max(20, window.innerWidth - 380);
      const savedY = Math.max(40, window.innerHeight - 560);
      return { x: savedX, y: savedY };
    }
    return { x: 100, y: 100 };
  });

  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, posX: 0, posY: 0 });

  const handlePointerDown = (e) => {
    // Only drag from header, ignore buttons and inputs
    if (e.target.closest("button") || e.target.closest("input")) return;
    setIsDragging(true);
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      posX: position.x,
      posY: position.y,
    };

    const handlePointerMove = (moveEvent) => {
      const dx = moveEvent.clientX - dragStartRef.current.mouseX;
      const dy = moveEvent.clientY - dragStartRef.current.mouseY;
      const maxX = Math.max(10, window.innerWidth - 330);
      const maxY = Math.max(10, window.innerHeight - 80);
      const newX = Math.max(10, Math.min(maxX, dragStartRef.current.posX + dx));
      const newY = Math.max(10, Math.min(maxY, dragStartRef.current.posY + dy));
      setPosition({ x: newX, y: newY });
    };

    const handlePointerUp = () => {
      setIsDragging(false);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  return (
    <div
      data-lenis-prevent
      style={{
        position: "fixed",
        left: position.x,
        top: position.y,
        zIndex: 100,
        background: "rgba(14, 18, 26, 0.96)",
        border: "1px solid rgba(100, 210, 255, 0.35)",
        borderRadius: 12,
        padding: minimized ? "10px 14px" : "14px 16px",
        color: "#fff",
        fontSize: 12,
        fontFamily: "monospace",
        width: 320,
        maxHeight: minimized ? "auto" : "88vh",
        overflowY: minimized ? "hidden" : "auto",
        backdropFilter: "blur(12px)",
        boxShadow: isDragging
          ? "0 20px 50px rgba(0, 0, 0, 0.8), 0 0 30px rgba(100, 210, 255, 0.3)"
          : "0 12px 40px rgba(0, 0, 0, 0.7), 0 0 20px rgba(77, 163, 255, 0.15)",
        transition: isDragging ? "none" : "max-height 0.2s ease, padding 0.2s ease, box-shadow 0.2s ease",
      }}
    >
      {/* Draggable Header */}
      <div
        onPointerDown={handlePointerDown}
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: minimized ? 0 : 10,
          paddingBottom: minimized ? 0 : 8,
          borderBottom: minimized ? "none" : "1px solid rgba(255, 255, 255, 0.12)",
          cursor: isDragging ? "grabbing" : "grab",
          userSelect: "none",
          touchAction: "none",
        }}
        title="Click and drag to move panel"
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontWeight: 700, fontSize: 12.5, letterSpacing: "0.04em", color: "#64d2ff" }}>
            💎 DIAMOND CONTROLS
          </span>
          <span
            style={{
              fontSize: 8.5,
              background: "rgba(100, 210, 255, 0.2)",
              color: "#64d2ff",
              padding: "1px 5px",
              borderRadius: 4,
              fontWeight: 600,
            }}
          >
            DRAG
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button
            type="button"
            onClick={() => setMinimized((v) => !v)}
            style={{
              background: "transparent",
              border: "none",
              color: "#aaa",
              fontSize: 13,
              cursor: "pointer",
              padding: "0 4px",
            }}
            title={minimized ? "Expand panel" : "Minimize panel"}
          >
            {minimized ? "▢" : "—"}
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "transparent",
                border: "none",
                color: "#aaa",
                fontSize: 14,
                cursor: "pointer",
                padding: "0 4px",
              }}
              title="Close panel"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {!minimized && (
        <>
          <DiamondControlsContent
            config={config}
            onChange={onChange}
            onReset={onReset}
          />

          {onSave && (
            <button
              type="button"
              onClick={onSave}
              style={{
                width: "100%",
                background: "rgba(100, 210, 255, 0.15)",
                border: "1px solid rgba(100, 210, 255, 0.45)",
                borderRadius: 6,
                color: "#64d2ff",
                padding: "6px 10px",
                fontSize: 10,
                cursor: "pointer",
                fontWeight: 600,
                marginTop: 8,
              }}
              title="Save current diamond settings in localStorage"
            >
              💾 Save As Default Settings
            </button>
          )}
        </>
      )}
    </div>
  );
}
