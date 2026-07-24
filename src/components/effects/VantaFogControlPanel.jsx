/**
 * VantaFogControlPanel.jsx
 * -------------------------------------------------------------------------
 * Reproduces the vantajs.com "1. Customize" panel, but wired to YOUR
 * options object/state instead of the URL. Works for:
 *
 *  - A single standalone VantaFogBackground (pass `options` + `onChange`)
 *  - One beat at a time out of BEAT_FOG_PRESETS (pass `beatIndex` +
 *    `beatOptions` + `onBeatOptionsChange`, plus a beat switcher)
 *
 * It never touches Vanta directly — it only edits a plain JS options
 * object and calls back. VantaFogBackground / VantaBeatFogBackground pick
 * up the new options via their own useEffect and call setOptions().
 *
 * USAGE — single page (Creative Visuals, E-commerce, etc.):
 *
 *   const [fogOptions, setFogOptions] = useState(DEFAULT_FOG_OPTIONS);
 *   <VantaFogBackground options={fogOptions} />
 *   <VantaFogControlPanel options={fogOptions} onChange={setFogOptions} />
 *
 * USAGE — HeroPage2, per-beat:
 *
 *   const [beatFogOptions, setBeatFogOptions] = useState(loadBeatFogPresets);
 *   const [editingBeat, setEditingBeat] = useState(0);
 *   <VantaBeatFogBackground beatOptions={beatFogOptions} ... />
 *   <VantaFogControlPanel
 *     beatIndex={editingBeat}
 *     onBeatIndexChange={setEditingBeat}
 *     beatCount={beatFogOptions.length}
 *     options={beatFogOptions[editingBeat]}
 *     onChange={(next) =>
 *       setBeatFogOptions((all) =>
 *         all.map((o, i) => (i === editingBeat ? next : o)),
 *       )
 *     }
 *     onSaveAsDefault={() => saveBeatFogPresets(beatFogOptions)}
 *     onResetToShipped={() => setBeatFogOptions(BEAT_FOG_PRESETS)}
 *   />
 * -------------------------------------------------------------------------
 */

import { useState } from "react";

const COLOR_FIELDS = [
  ["highlightColor", "highlightColor"],
  ["midtoneColor", "midtoneColor"],
  ["lowlightColor", "lowlightColor"],
  ["baseColor", "baseColor"],
];

const SLIDER_FIELDS = [
  ["blurFactor", "blurFactor", 0, 1, 0.01],
  ["zoom", "zoom", 0, 2, 0.01],
  ["speed", "speed", 0, 3, 0.01],
];

export default function VantaFogControlPanel({
  options,
  onChange,
  beatIndex,
  onBeatIndexChange,
  beatCount,
  onSaveAsDefault,
  onResetToShipped,
  title = "Vanta FOG",
}) {
  const [collapsed, setCollapsed] = useState(false);

  function set(key, value) {
    onChange({ ...options, [key]: value });
  }

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        style={{
          ...panelStyle,
          width: "auto",
          padding: "8px 14px",
          cursor: "pointer",
        }}
      >
        {title} ⚙
      </button>
    );
  }

  return (
    <div style={panelStyle}>
      <div style={headerRow}>
        <strong>{title}</strong>
        <button onClick={() => setCollapsed(true)} style={closeBtn}>
          ✕
        </button>
      </div>

      {typeof beatIndex === "number" && beatCount ? (
        <div style={row}>
          <label style={label}>Editing beat</label>
          <select
            value={beatIndex}
            onChange={(e) => onBeatIndexChange(Number(e.target.value))}
            style={select}
          >
            {Array.from({ length: beatCount }, (_, i) => (
              <option key={i} value={i}>
                Beat {i + 1}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {COLOR_FIELDS.map(([key, labelText]) => (
        <div style={row} key={key}>
          <label style={label}>{labelText}</label>
          <input
            type="color"
            value={options[key] ?? "#ffffff"}
            onChange={(e) => set(key, e.target.value)}
            style={colorInput}
          />
          <code style={code}>{options[key]}</code>
        </div>
      ))}

      {SLIDER_FIELDS.map(([key, labelText, min, max, step]) => (
        <div style={row} key={key}>
          <label style={label}>{labelText}</label>
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={options[key] ?? 0}
            onChange={(e) => set(key, Number(e.target.value))}
            style={{ flex: 1 }}
          />
          <code style={code}>{Number(options[key] ?? 0).toFixed(2)}</code>
        </div>
      ))}

      {(onSaveAsDefault || onResetToShipped) && (
        <div style={{ ...row, marginTop: 10 }}>
          {onSaveAsDefault && (
            <button style={actionBtn} onClick={onSaveAsDefault}>
              Save as default
            </button>
          )}
          {onResetToShipped && (
            <button style={actionBtn} onClick={onResetToShipped}>
              Reset to shipped
            </button>
          )}
        </div>
      )}

      <div style={{ marginTop: 10 }}>
        <div style={label}>Copy-paste options object</div>
        <textarea
          readOnly
          value={JSON.stringify(options, null, 2)}
          style={textarea}
          onFocus={(e) => e.target.select()}
        />
      </div>
    </div>
  );
}

const panelStyle = {
  position: "fixed",
  top: 16,
  right: 16,
  zIndex: 1000,
  width: 300,
  background: "rgba(20,20,24,0.92)",
  color: "#fff",
  borderRadius: 10,
  padding: 14,
  fontSize: 12,
  fontFamily: "monospace",
  boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
  pointerEvents: "auto",
};
const headerRow = {
  display: "flex",
  justifyContent: "space-between",
  marginBottom: 8,
};
const closeBtn = {
  background: "none",
  border: "none",
  color: "#fff",
  cursor: "pointer",
};
const row = { display: "flex", alignItems: "center", gap: 8, marginBottom: 6 };
const label = { flex: "0 0 92px", opacity: 0.8 };
const select = {
  flex: 1,
  background: "#111",
  color: "#fff",
  border: "1px solid #444",
};
const colorInput = {
  width: 28,
  height: 20,
  padding: 0,
  border: "none",
  background: "none",
};
const code = { flex: "0 0 66px", textAlign: "right", opacity: 0.7 };
const actionBtn = {
  flex: 1,
  background: "#2a2a32",
  color: "#fff",
  border: "1px solid #444",
  borderRadius: 6,
  padding: "6px 8px",
  cursor: "pointer",
};
const textarea = {
  width: "100%",
  height: 90,
  background: "#0c0c10",
  color: "#9be29b",
  border: "1px solid #333",
  borderRadius: 6,
  padding: 6,
  resize: "vertical",
};
