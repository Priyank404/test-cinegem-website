import { useState, useEffect } from "react";
import { isDevMode } from "@/config/env";

const DEFAULT_HEADING_COLOR = "#858890";
const DEFAULT_PARAGRAPH_COLOR = "#555860";
const DEFAULT_SHADOW = "none";

export const PRESET_SHADES = [
  { name: "Platinum Silver", heading: "#858890", paragraph: "#555860", desc: "Balanced whitish-silver" },
  { name: "Light Platinum", heading: "#A3A6AD", paragraph: "#6E727A", desc: "Lighter silver-grey" },
  { name: "Pearl Grey", heading: "#B8BAC0", paragraph: "#7D818A", desc: "Very light off-white grey" },
  { name: "Titanium Slate", heading: "#70747C", paragraph: "#4E5158", desc: "Deeper luxury titanium" },
  { name: "Refined Graphite", heading: "#5A5D64", paragraph: "#3C3F45", desc: "Deep contrast slate" },
  { name: "Champagne Silver", heading: "#C8C4B7", paragraph: "#787469", desc: "Subtle warm metallic" },
  { name: "Pure White", heading: "#FCFBFA", paragraph: "#E0E0E0", desc: "Maximum brightness" },
];

export const SHADOW_OPTIONS = [
  { id: "none", label: "None", value: "none" },
  { id: "soft", label: "Soft Depth", value: "0 2px 8px rgba(0,0,0,0.3)" },
  { id: "rim", label: "Light Rim", value: "0 1px 2px rgba(255,255,255,0.8)" },
  { id: "deep", label: "Deep Glow", value: "0 3px 12px rgba(0,0,0,0.6)" },
];

function applyCssVariables(heading, paragraph, shadow) {
  if (typeof document === "undefined") return;
  document.documentElement.style.setProperty("--hero-heading-color", heading);
  document.documentElement.style.setProperty("--hero-paragraph-color", paragraph);
  document.documentElement.style.setProperty(
    "--hero-shadow",
    shadow && shadow !== "none" ? shadow : "none"
  );
}

export function getSavedHeroColors() {
  if (typeof window === "undefined") {
    return {
      heading: DEFAULT_HEADING_COLOR,
      paragraph: DEFAULT_PARAGRAPH_COLOR,
      shadow: DEFAULT_SHADOW,
    };
  }
  const heading = localStorage.getItem("cinegem_hero_heading_color") || DEFAULT_HEADING_COLOR;
  const paragraph = localStorage.getItem("cinegem_hero_paragraph_color") || DEFAULT_PARAGRAPH_COLOR;
  const shadow = localStorage.getItem("cinegem_hero_shadow") || DEFAULT_SHADOW;

  applyCssVariables(heading, paragraph, shadow);

  return { heading, paragraph, shadow };
}

export function saveHeroColors(heading, paragraph, shadow) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("cinegem_hero_heading_color", heading);
    localStorage.setItem("cinegem_hero_paragraph_color", paragraph);
    localStorage.setItem("cinegem_hero_shadow", shadow);
  } catch (err) {
    // ignore quota/private mode errors
  }

  applyCssVariables(heading, paragraph, shadow);

  window.dispatchEvent(
    new CustomEvent("hero-color-change", {
      detail: { heading, paragraph, shadow },
    })
  );
}

export default function HeroColorTuner() {
  if (!isDevMode()) return null;
  const [isOpen, setIsOpen] = useState(false);
  const [headingColor, setHeadingColor] = useState(DEFAULT_HEADING_COLOR);
  const [paragraphColor, setParagraphColor] = useState(DEFAULT_PARAGRAPH_COLOR);
  const [shadow, setShadow] = useState(DEFAULT_SHADOW);
  const [copiedKey, setCopiedKey] = useState(null);

  useEffect(() => {
    const saved = getSavedHeroColors();
    setHeadingColor(saved.heading);
    setParagraphColor(saved.paragraph);
    setShadow(saved.shadow);

    const onColorChange = (e) => {
      if (e.detail) {
        setHeadingColor(e.detail.heading);
        setParagraphColor(e.detail.paragraph);
        setShadow(e.detail.shadow);
      }
    };

    window.addEventListener("hero-color-change", onColorChange);
    return () => window.removeEventListener("hero-color-change", onColorChange);
  }, []);

  const updateHeading = (color) => {
    setHeadingColor(color);
    saveHeroColors(color, paragraphColor, shadow);
  };

  const updateParagraph = (color) => {
    setParagraphColor(color);
    saveHeroColors(headingColor, color, shadow);
  };

  const updateShadow = (shadowVal) => {
    setShadow(shadowVal);
    saveHeroColors(headingColor, paragraphColor, shadowVal);
  };

  const applyPreset = (preset) => {
    setHeadingColor(preset.heading);
    setParagraphColor(preset.paragraph);
    saveHeroColors(preset.heading, preset.paragraph, shadow);
  };

  const resetDefaults = () => {
    setHeadingColor(DEFAULT_HEADING_COLOR);
    setParagraphColor(DEFAULT_PARAGRAPH_COLOR);
    setShadow(DEFAULT_SHADOW);
    saveHeroColors(DEFAULT_HEADING_COLOR, DEFAULT_PARAGRAPH_COLOR, DEFAULT_SHADOW);
  };

  const copyToClipboard = (text, key) => {
    navigator.clipboard?.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="fixed top-20 right-6 z-[9999] flex items-center gap-2.5 px-3.5 py-2 rounded-full border border-white/20 bg-black/60 backdrop-blur-xl shadow-2xl text-xs font-[Poppins] text-[#FCFBFA] hover:bg-black/80 hover:border-[#C5A059] transition-all duration-300 group cursor-pointer"
        title="Open Hero Text Color Tuner"
      >
        <span
          className="w-3.5 h-3.5 rounded-full border border-white/40 shadow-sm shrink-0 transition-transform duration-300 group-hover:scale-110"
          style={{ backgroundColor: headingColor }}
        />
        <span className="tracking-wider uppercase font-medium text-[11px]">
          {isOpen ? "Close Tuner" : "🎨 Tune Color"}
        </span>
        <span className="font-mono text-[10px] text-white/50 bg-white/10 px-1.5 py-0.5 rounded">
          {headingColor.toUpperCase()}
        </span>
      </button>

      {/* Floating Tuner Modal */}
      {isOpen && (
        <div className="fixed top-32 right-6 z-[9999] w-[340px] max-h-[85vh] overflow-y-auto rounded-2xl border border-white/20 bg-[#141416]/95 backdrop-blur-2xl p-5 shadow-[0_25px_60px_rgba(0,0,0,0.8)] text-[#FCFBFA] font-[Poppins] animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
            <div>
              <h3 className="text-sm font-semibold tracking-wide text-white flex items-center gap-2">
                <span>🎨 Hero Text Color Tuner</span>
              </h3>
              <p className="text-[11px] text-white/50 font-light mt-0.5">
                Updates all pages live in real time
              </p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/40 hover:text-white p-1 rounded-md hover:bg-white/10 transition-colors text-sm"
              title="Close"
            >
              ✕
            </button>
          </div>

          {/* Heading Color Picker */}
          <div className="mb-4">
            <label className="text-[11px] font-semibold tracking-wider uppercase text-[#C5A059] block mb-1.5">
              Heading Color
            </label>
            <div className="flex items-center gap-2.5">
              <input
                type="color"
                value={headingColor.startsWith("#") ? headingColor : "#858890"}
                onInput={(e) => updateHeading(e.target.value)}
                onChange={(e) => updateHeading(e.target.value)}
                className="w-10 h-10 rounded-lg border border-white/20 cursor-pointer bg-transparent p-0.5 shrink-0"
              />
              <input
                type="text"
                value={headingColor}
                onInput={(e) => updateHeading(e.target.value)}
                onChange={(e) => updateHeading(e.target.value)}
                placeholder="#858890"
                className="flex-1 font-mono text-xs px-3 py-2 rounded-lg bg-black/40 border border-white/15 text-white focus:outline-none focus:border-[#C5A059] transition-colors uppercase"
              />
              <button
                type="button"
                onClick={() => copyToClipboard(headingColor, "heading")}
                className="px-2.5 py-2 text-[11px] font-medium rounded-lg bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors shrink-0"
              >
                {copiedKey === "heading" ? "✓ Copied" : "Copy"}
              </button>
            </div>
          </div>

          {/* Paragraph Color Picker */}
          <div className="mb-4">
            <label className="text-[11px] font-semibold tracking-wider uppercase text-white/70 block mb-1.5">
              Paragraph / Subtitle Color
            </label>
            <div className="flex items-center gap-2.5">
              <input
                type="color"
                value={paragraphColor.startsWith("#") ? paragraphColor : "#555860"}
                onInput={(e) => updateParagraph(e.target.value)}
                onChange={(e) => updateParagraph(e.target.value)}
                className="w-10 h-10 rounded-lg border border-white/20 cursor-pointer bg-transparent p-0.5 shrink-0"
              />
              <input
                type="text"
                value={paragraphColor}
                onInput={(e) => updateParagraph(e.target.value)}
                onChange={(e) => updateParagraph(e.target.value)}
                placeholder="#555860"
                className="flex-1 font-mono text-xs px-3 py-2 rounded-lg bg-black/40 border border-white/15 text-white focus:outline-none focus:border-[#C5A059] transition-colors uppercase"
              />
              <button
                type="button"
                onClick={() => copyToClipboard(paragraphColor, "paragraph")}
                className="px-2.5 py-2 text-[11px] font-medium rounded-lg bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors shrink-0"
              >
                {copiedKey === "paragraph" ? "✓ Copied" : "Copy"}
              </button>
            </div>
          </div>

          {/* Preset Swatches */}
          <div className="mb-4">
            <label className="text-[11px] font-semibold tracking-wider uppercase text-white/70 block mb-2">
              Whitish-Grey Presets
            </label>
            <div className="grid grid-cols-1 gap-1.5">
              {PRESET_SHADES.map((preset) => (
                <button
                  key={preset.heading}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg border text-left transition-all duration-200 cursor-pointer ${
                    headingColor.toLowerCase() === preset.heading.toLowerCase()
                      ? "bg-white/15 border-[#C5A059] shadow-sm"
                      : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/25"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-4 h-4 rounded-full border border-white/30 shrink-0"
                      style={{ backgroundColor: preset.heading }}
                    />
                    <div>
                      <div className="text-xs font-medium text-white">
                        {preset.name}
                      </div>
                      <div className="text-[10px] text-white/50 font-light">
                        {preset.desc}
                      </div>
                    </div>
                  </div>
                  <span className="font-mono text-[10px] text-white/40 uppercase">
                    {preset.heading}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Text Shadow Options */}
          <div className="mb-4">
            <label className="text-[11px] font-semibold tracking-wider uppercase text-white/70 block mb-2">
              Text Shadow Depth
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {SHADOW_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => updateShadow(opt.value)}
                  className={`px-3 py-1.5 rounded-lg border text-xs text-center transition-colors cursor-pointer ${
                    shadow === opt.value
                      ? "bg-white/15 border-[#C5A059] text-white"
                      : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Copy Full Config Button */}
          <div className="pt-2 border-t border-white/10 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => {
                const configStr = `Heading: ${headingColor} | Paragraph: ${paragraphColor} | Shadow: ${shadow}`;
                copyToClipboard(configStr, "all");
              }}
              className="w-full py-2.5 px-4 rounded-lg bg-[#C5A059] hover:bg-[#b08d48] text-[#121212] font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-lg cursor-pointer"
            >
              <span>{copiedKey === "all" ? "✓ Config Copied!" : "📋 Copy Config for Chat"}</span>
            </button>
            <button
              type="button"
              onClick={resetDefaults}
              className="w-full py-1.5 px-3 rounded-lg bg-transparent hover:bg-white/5 text-white/40 hover:text-white/70 text-[11px] transition-colors text-center"
            >
              Reset to Defaults
            </button>
          </div>
        </div>
      )}
    </>
  );
}
