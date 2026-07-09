/**
 * HeroPage2.jsx
 * -------------------------------------------------------------------------
 * Full page that wires up RingHero.jsx as a fixed 3D scroll-background,
 * with real DOM content scrolling on top of it — same structure as
 * peachweb.io (fixed canvas behind, tall content div drives scroll).
 *
 * Uses the @/ alias (matches your vite.config.js / jsconfig setup).
 * Plug this into your router as a route/page, e.g. in App.jsx:
 *
 *   import HeroPage2 from '@/pages/HeroPage2'
 *   <Route path="/hero2" element={<HeroPage2 />} />
 *
 * Nav bar, section copy, and CTA are placeholders — replace with your
 * real portfolio content. Keep the 4 <section> blocks in sync with the
 * 4 BEATS defined in RingHero.jsx: add/remove both together.
 *
 * Dev-only tuning panel: set SHOW_DEV_PANEL to false (or delete the
 * <MaterialDevPanel /> usage) before shipping — it's a plain overlay
 * with no dependency beyond React state, fine during dev but not
 * something you want visible to site visitors. The HDR rotation/scale/
 * power/gamma sliders mirror your production viewer's dev controls
 * (useHdrSync.js) 1:1, both in field names and in the underlying math
 * (see hdrControls.js) — same defaults (100/100/100 = neutral, 0° =
 * no rotation).
 * -------------------------------------------------------------------------
 */

import { useState } from "react";
import RingHero from "@/components/three/RingHero";
import { metalPresets } from "@/components/three/metalMaterials";
import "./HeroPage2.css";

const SHOW_DEV_PANEL = true;

// Defaults for a single HDR control group — reused for both metal and gem.
const DEFAULT_HDR_CONFIG = {
  rotation: 0,
  rotationY: 0,
  scale: 100,
  power: 100,
  gamma: 100,
};

export default function HeroPage2() {
  // Live-tunable knobs, independent per element — this is what actually
  // proves metal and gem aren't cross-contaminating each other's HDR.
  // These two files are the ones that actually exist in /public/hdr —
  // the previous "/hdr/studio_small.hdr" default 404'd, which is why
  // RGBELoader was throwing "Bad File Format" and the ring never
  // rendered at all.
  const [metalPresetKey, setMetalPresetKey] = useState("yellowGold");
  const [metalHdrUrl, setMetalHdrUrl] = useState("/hdr/env_metal_001_d01c4504e0.hdr");
  const [gemHdrUrl, setGemHdrUrl] = useState("/hdr/LUMA-Unsaid-R_D-DIA-Mirrored-Automation-shapes-Wave-R3.hdr");
  const [gemMode, setGemMode] = useState(null); // null = preset default ("refraction"), or "matte"
  const [meshDebugList, setMeshDebugList] = useState([]);

  // Rotation / scale / power / gamma — same shape as your viewer's
  // useHdrSync.js, one group per element.
  const [metalHdrConfig, setMetalHdrConfig] = useState(DEFAULT_HDR_CONFIG);
  const [gemHdrConfig, setGemHdrConfig] = useState(DEFAULT_HDR_CONFIG);

  const [postFxEnabled, setPostFxEnabled] = useState(true);
  const [panelVisible, setPanelVisible] = useState(true);

  return (
    <div className="hero2-page">
      {/* Fixed 3D background — canvas + gradient overlay, pinned behind
          everything else via z-index (see RingHero.jsx inline styles) */}
      <RingHero
        glbUrl="/models/ring-draco.glb"
        metalHdrUrl={metalHdrUrl}
        gemHdrUrl={gemHdrUrl}
        metalPreset={metalPresets[metalPresetKey]}
        gemMaterialTypeOverride={gemMode}
        dracoDecoderPath="/draco/"
        scrollContainerSelector="#scroll-content"
        onMeshesClassified={setMeshDebugList}
        metalHdrRotation={metalHdrConfig.rotation}
        metalHdrRotationY={metalHdrConfig.rotationY}
        metalHdrScale={metalHdrConfig.scale}
        metalHdrPower={metalHdrConfig.power}
        metalHdrGamma={metalHdrConfig.gamma}
        gemHdrRotation={gemHdrConfig.rotation}
        gemHdrRotationY={gemHdrConfig.rotationY}
        gemHdrScale={gemHdrConfig.scale}
        gemHdrPower={gemHdrConfig.power}
        gemHdrGamma={gemHdrConfig.gamma}
        postFxEnabled={postFxEnabled}
      />

      {SHOW_DEV_PANEL && (
        <>
          {/* Always-visible toggle — stays on screen even when the panel
              itself is hidden, so there's a way back in. Positioned above
              where the panel sits (bottom-right) so it doesn't overlap it. */}
          <button
            onClick={() => setPanelVisible((v) => !v)}
            style={{
              position: "fixed",
              // Nav bar occupies top:0 with ~24px vertical padding plus
              // button height, so this sits clear below it rather than
              // overlapping the "Get in touch" button in the corner.
              top: 84,
              right: 20,
              zIndex: 51,
              background: "rgba(20,20,22,0.9)",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 8,
              padding: "8px 12px",
              color: "#fff",
              fontSize: 11,
              fontFamily: "monospace",
              cursor: "pointer",
              backdropFilter: "blur(6px)",
            }}
          >
            {panelVisible ? "Hide dev panel" : "Show dev panel"}
          </button>

          {panelVisible && (
            <MaterialDevPanel
              metalPresetKey={metalPresetKey}
              setMetalPresetKey={setMetalPresetKey}
              metalHdrUrl={metalHdrUrl}
              setMetalHdrUrl={setMetalHdrUrl}
              gemHdrUrl={gemHdrUrl}
              setGemHdrUrl={setGemHdrUrl}
              gemMode={gemMode}
              setGemMode={setGemMode}
              meshDebugList={meshDebugList}
              metalHdrConfig={metalHdrConfig}
              setMetalHdrConfig={setMetalHdrConfig}
              gemHdrConfig={gemHdrConfig}
              setGemHdrConfig={setGemHdrConfig}
              postFxEnabled={postFxEnabled}
              setPostFxEnabled={setPostFxEnabled}
            />
          )}
        </>
      )}

      {/* Simple fixed nav, sits above the canvas */}
      <nav className="hero2-nav">
        <span className="hero2-logo">Your Name</span>
        <div className="hero2-nav-links">
          <a href="#work">Work</a>
          <a href="#about">About</a>
          <a href="#contact">Contact</a>
        </div>
        <a href="#contact" className="hero2-cta-btn">
          Get in touch →
        </a>
      </nav>

      {/* Tall scrollable content — its height drives the ScrollTrigger
          timeline inside RingHero. Must match id used in
          scrollContainerSelector prop above. */}
      <div id="scroll-content" className="hero2-scroll-content">
        <section className="hero2-section">
          <div className="hero2-section-inner">
            <h1>
              Crafted in
              <br />
              3D. Rendered
              <br />
              in real time.
            </h1>
            <p>
              A portfolio built the same way the jewelry it showcases is
              made — precisely, and with light doing most of the work.
            </p>
          </div>
        </section>

        <section id="work" className="hero2-section">
          <div className="hero2-section-inner align-right">
            <h2>Every angle, considered</h2>
            <p>
              From render automation pipelines to real-time WebGL
              viewers — the same eye for material and light, just running
              in a browser instead of a render queue.
            </p>
          </div>
        </section>

        <section className="hero2-section">
          <div className="hero2-section-inner">
            <h2>Detail is the whole point</h2>
            <p>
              Physically based materials, HDRI lighting, and a scroll
              engine that never drops a frame — because the ring never
              stops catching the light.
            </p>
          </div>
        </section>

        <section id="contact" className="hero2-section hero2-section-cta">
          <div className="hero2-section-inner">
            <h2>Let's build something</h2>
            <p>Available for freelance and full-time roles.</p>
            <a href="mailto:you@example.com" className="hero2-cta-btn large">
              Say hello →
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}

/**
 * MaterialDevPanel
 * -------------------------------------------------------------------------
 * Floating overlay for live-tuning metal preset, per-element HDR URLs,
 * per-element HDR rotation/scale/power/gamma (mirrors your viewer's dev
 * controls), post-processing toggle, and gem material mode while you're
 * developing. Pure React state, no extra deps. Remove or hide
 * (SHOW_DEV_PANEL = false) before shipping.
 * -------------------------------------------------------------------------
 */
function MaterialDevPanel({
  metalPresetKey,
  setMetalPresetKey,
  metalHdrUrl,
  setMetalHdrUrl,
  gemHdrUrl,
  setGemHdrUrl,
  gemMode,
  setGemMode,
  meshDebugList = [],
  metalHdrConfig,
  setMetalHdrConfig,
  gemHdrConfig,
  setGemHdrConfig,
  postFxEnabled,
  setPostFxEnabled,
}) {
  const gemCount = meshDebugList.filter((m) => m.type === "gem").length;
  const metalCount = meshDebugList.filter((m) => m.type === "metal").length;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 20,
        right: 20,
        zIndex: 50,
        background: "rgba(20,20,22,0.9)",
        border: "1px solid rgba(255,255,255,0.15)",
        borderRadius: 10,
        padding: "14px 16px",
        color: "#fff",
        fontSize: 12,
        fontFamily: "monospace",
        width: 280,
        maxHeight: "85vh",
        overflowY: "auto",
        backdropFilter: "blur(6px)",
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 10, fontSize: 12, opacity: 0.8 }}>
        MATERIAL DEV PANEL
      </div>

      {/* Per-mesh classification — this is the part that actually tells
          you whether gem/metal assignment is correct, instead of
          eyeballing the render. Populated by RingHero's
          onMeshesClassified callback once the GLB loads. */}
      <div
        style={{
          marginBottom: 12,
          padding: "8px 10px",
          background: "rgba(255,255,255,0.05)",
          borderRadius: 6,
        }}
      >
        <div style={{ opacity: 0.6, marginBottom: 6 }}>
          Mesh classification {meshDebugList.length > 0 && `(${gemCount} gem / ${metalCount} metal)`}
        </div>
        {meshDebugList.length === 0 ? (
          <div style={{ opacity: 0.4 }}>Loading…</div>
        ) : (
          meshDebugList.map((m) => (
            <div
              key={m.name}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "2px 0",
                color: m.type === "gem" ? "#8ecbff" : "#ffd88e",
              }}
            >
              <span>{m.name}</span>
              <span>{m.type}</span>
            </div>
          ))
        )}
      </div>

      <label style={{ display: "block", marginBottom: 10 }}>
        Metal preset
        <select
          value={metalPresetKey}
          onChange={(e) => setMetalPresetKey(e.target.value)}
          style={selectStyle}
        >
          <option value="yellowGold">Yellow Gold</option>
          <option value="whiteGold">White Gold</option>
          <option value="roseGold">Rose Gold</option>
          <option value="platinum">Platinum</option>
        </select>
      </label>

      <label style={{ display: "block", marginBottom: 10 }}>
        Metal HDR URL
        <input
          type="text"
          value={metalHdrUrl}
          onChange={(e) => setMetalHdrUrl(e.target.value)}
          style={inputStyle}
        />
      </label>

      <HdrConfigGroup
        label="Metal HDR controls"
        config={metalHdrConfig}
        setConfig={setMetalHdrConfig}
      />

      <label style={{ display: "block", marginTop: 14, marginBottom: 10 }}>
        Gem HDR URL
        <input
          type="text"
          value={gemHdrUrl}
          onChange={(e) => setGemHdrUrl(e.target.value)}
          style={inputStyle}
        />
      </label>

      <label style={{ display: "block", marginBottom: 10 }}>
        Gem material
        <select
          value={gemMode ?? "default"}
          onChange={(e) => setGemMode(e.target.value === "default" ? null : e.target.value)}
          style={selectStyle}
        >
          <option value="default">Preset default (refraction)</option>
          <option value="matte">Matte (cheap)</option>
        </select>
      </label>

      <HdrConfigGroup
        label="Gem HDR controls"
        config={gemHdrConfig}
        setConfig={setGemHdrConfig}
      />

      {/* Post-processing toggle — ported from components/JewelryPostFX.jsx
          (SMAA + mipmap Bloom + ACES Filmic tone mapping + grain +
          vignette). Useful to flip off during dev to isolate whether an
          artifact is coming from the shader or from bloom/grain. */}
      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginTop: 14,
          marginBottom: 4,
          cursor: "pointer",
        }}
      >
        <input
          type="checkbox"
          checked={postFxEnabled}
          onChange={(e) => setPostFxEnabled(e.target.checked)}
        />
        Post-processing (Bloom / SMAA / Vignette)
      </label>

      <div style={{ marginTop: 10, fontSize: 10, opacity: 0.5, lineHeight: 1.4 }}>
        Set metal/gem HDR URLs to different files to confirm they don't
        affect each other. Rotation/scale/power/gamma match your 3D
        viewer's dev controls — 100/100/100 and 0° are neutral.
      </div>
    </div>
  );
}

/**
 * HdrConfigGroup
 * -------------------------------------------------------------------------
 * Rotation (X/Y), scale, power, gamma sliders for one HDR (metal or
 * gem) — same 5 controls, same ranges/units as your viewer's dev panel.
 * -------------------------------------------------------------------------
 */
function HdrConfigGroup({ label, config, setConfig }) {
  const update = (key) => (e) =>
    setConfig((prev) => ({ ...prev, [key]: Number(e.target.value) }));

  return (
    <div
      style={{
        marginBottom: 6,
        padding: "8px 10px",
        background: "rgba(255,255,255,0.04)",
        borderRadius: 6,
      }}
    >
      <div style={{ opacity: 0.6, marginBottom: 8 }}>{label}</div>

      <SliderRow
        label="Rotation"
        value={config.rotation}
        min={-180}
        max={180}
        step={1}
        unit="°"
        onChange={update("rotation")}
      />
      <SliderRow
        label="Rotation Y"
        value={config.rotationY}
        min={-180}
        max={180}
        step={1}
        unit="°"
        onChange={update("rotationY")}
      />
      <SliderRow
        label="Scale"
        value={config.scale}
        min={0}
        max={300}
        step={1}
        onChange={update("scale")}
      />
      <SliderRow
        label="Power"
        value={config.power}
        min={0}
        max={300}
        step={1}
        onChange={update("power")}
      />
      <SliderRow
        label="Gamma"
        value={config.gamma}
        min={10}
        max={300}
        step={1}
        onChange={update("gamma")}
      />
    </div>
  );
}

function SliderRow({ label, value, min, max, step, unit = "", onChange }) {
  return (
    <label style={{ display: "block", marginBottom: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
        <span>{label}</span>
        <span style={{ opacity: 0.6 }}>
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={onChange}
        style={{ width: "100%" }}
      />
    </label>
  );
}

const selectStyle = {
  display: "block",
  width: "100%",
  marginTop: 4,
  background: "#1a1a1e",
  color: "#fff",
  border: "1px solid rgba(255,255,255,0.2)",
  borderRadius: 6,
  padding: "6px 8px",
  fontSize: 12,
  fontFamily: "monospace",
};

const inputStyle = {
  ...selectStyle,
};
