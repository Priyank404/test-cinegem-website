import { useImperativeHandle, useRef, forwardRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";

/**
 * Ultra-robust parser for timeline data:
 * Accepts:
 * - JSON arrays: [{ frame: 0, camPos: ... }, ...]
 * - Exported version objects: { id, name, target, beats: [...] }
 * - Objects with .beats, .BEATS, .keyframes, .timeline, .desktop, or .mobile
 * - Frame-keyed dictionaries: { "0": { camPos: ... }, "44": { ... } }
 * - Raw JavaScript code copied from RingHero.jsx (e.g. export const BEATS = [...])
 */
function extractBeatsFromInput(inputStr) {
  if (!inputStr || typeof inputStr !== "string") return null;
  let text = inputStr.trim();
  if (!text) return null;

  let data = null;

  // 1. Direct JSON parse
  try {
    data = JSON.parse(text);
  } catch (jsonErr) {
    // 2. Loose JS literal evaluation (handles unquoted keys, comments, export statements)
    try {
      let clean = text.replace(/\/\*[\s\S]*?\*\/|([^:]|^)\/\/.*$/gm, "$1");
      clean = clean.replace(/export\s+(default\s+)?(const|var|let)\s+\w+\s*=\s*/g, "");
      clean = clean.replace(/(const|var|let)\s+\w+\s*=\s*/g, "");
      clean = clean.trim().replace(/;+$/, "");

      // If text doesn't start with [ or {, wrap it if it contains keyframe fields
      if (!clean.startsWith("[") && !clean.startsWith("{")) {
        if (/frame\s*:/i.test(clean) || /["']frame["']\s*:/i.test(clean)) {
          if (clean.includes("},{") || clean.includes("},\n{") || clean.includes("}, {") || clean.startsWith("{")) {
            clean = "[" + clean + "]";
          } else {
            clean = "{" + clean + "}";
          }
        }
      }

      if (
        (clean.startsWith("[") && clean.endsWith("]")) ||
        (clean.startsWith("{") && clean.endsWith("}"))
      ) {
        data = Function('"use strict"; return (' + clean + ")")();
      }
    } catch (evalErr) {
      // 3. Fallback regex match for bracketed array [...]
      try {
        const arrayMatch = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
        if (arrayMatch) {
          const rawArray = arrayMatch[0].replace(/\/\*[\s\S]*?\*\/|([^:]|^)\/\/.*$/gm, "$1");
          data = Function('"use strict"; return (' + rawArray + ")")();
        }
      } catch (regexErr) {
        // failed
      }
    }
  }

  if (!data) return null;

  let beats = null;
  let detectedName = null;
  let detectedTarget = null;

  if (/mobile/i.test(text) || /MOBILE_BEATS/.test(text)) {
    detectedTarget = "mobile";
  }

  if (Array.isArray(data)) {
    beats = data;
  } else if (data && Array.isArray(data.beats)) {
    beats = data.beats;
    detectedName = data.name;
    if (data.target) detectedTarget = data.target;
  } else if (data && Array.isArray(data.BEATS)) {
    beats = data.BEATS;
    if (!detectedTarget) detectedTarget = "desktop";
  } else if (data && Array.isArray(data.MOBILE_BEATS)) {
    beats = data.MOBILE_BEATS;
    detectedTarget = "mobile";
  } else if (data && Array.isArray(data.keyframes)) {
    beats = data.keyframes;
    detectedName = data.name;
    if (data.target) detectedTarget = data.target;
  } else if (data && Array.isArray(data.timeline)) {
    beats = data.timeline;
  } else if (data && Array.isArray(data.desktop)) {
    beats = data.desktop;
    detectedTarget = "desktop";
  } else if (data && Array.isArray(data.mobile)) {
    beats = data.mobile;
    detectedTarget = "mobile";
  } else if (data && typeof data === "object") {
    // If it's a single keyframe object like { frame: 10, camPos: ... }
    if (data.frame !== undefined && (data.camPos || data.ringRot || data.ringScale !== undefined)) {
      beats = [data];
    } else {
      const keys = Object.keys(data);
      const numericKeys = keys.filter((k) => !isNaN(Number(k)));
      if (numericKeys.length > 0 && numericKeys.length >= keys.length * 0.7) {
        beats = numericKeys
          .map((k) => {
            const item = data[k];
            return typeof item === "object" && item !== null
              ? { ...item, frame: item.frame !== undefined ? Number(item.frame) : Number(k) }
              : null;
          })
          .filter(Boolean)
          .sort((a, b) => a.frame - b.frame);
      }
    }
  }

  if (!beats || !Array.isArray(beats) || beats.length === 0) return null;

  // Sanitize beat entries so missing properties have safe defaults
  const sanitizedBeats = beats
    .map((b, idx) => {
      if (!b || typeof b !== "object") return null;
      const frame = typeof b.frame === "number" ? b.frame : Number(b.frame ?? idx * 10);
      return {
        ...b,
        frame,
        camPos: b.camPos ? { ...b.camPos } : { x: 0, y: 0.2, z: 4.2 },
        ringRot: b.ringRot ? { ...b.ringRot } : { x: 0, y: 0, z: 0 },
        ringPosOffset: b.ringPosOffset ? { ...b.ringPosOffset } : { x: 0, y: 0, z: 0 },
        ringScale: typeof b.ringScale === "number" ? b.ringScale : 1,
        metalEnvIntensity: typeof b.metalEnvIntensity === "number" ? b.metalEnvIntensity : 4,
        gemEnvIntensity: typeof b.gemEnvIntensity === "number" ? b.gemEnvIntensity : 1.2,
        cornerPark: typeof b.cornerPark === "number" ? b.cornerPark : 0,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.frame - b.frame);

  if (sanitizedBeats.length === 0) return null;

  return {
    beats: sanitizedBeats,
    count: sanitizedBeats.length,
    detectedName,
    detectedTarget,
  };
}

const TimelineEditor = forwardRef(function TimelineEditor({
  values,
  savedBeats,
  onSelectBeat,
  onChange,
  onToggleLive,
  onSave,
  onClear,
  poseApiRef,
  beatCount = 6,
  onJumpToProgress,
  onReboot,
  onMoveKeyframe,
  totalFrames = 260,
  timelineTarget = "desktop",
  onToggleTimelineTarget,
  experimentalAtmosphere = true,
  onToggleAtmosphere = null,
}, ref) {
  const [collapsed, setCollapsed] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState("");
  const [importName, setImportName] = useState("");
  const [importTarget, setImportTarget] = useState("desktop");
  const [importError, setImportError] = useState("");
  const [parsedPreview, setParsedPreview] = useState(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const fileInputRef = useRef(null);

  const [savedVersions, setSavedVersions] = useState(() => {
    try {
      const v = localStorage.getItem("timeline_versions");
      if (!v) return [];
      const parsed = JSON.parse(v);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  });

  // Keep savedVersions in sync when modal opens and toggle body class to restore native cursor
  useEffect(() => {
    if (showVersions || showImportModal) {
      document.body.classList.add("timeline-modal-open");
      try {
        const v = localStorage.getItem("timeline_versions");
        if (v) {
          const parsed = JSON.parse(v);
          if (Array.isArray(parsed)) {
            setSavedVersions(parsed);
          }
        }
      } catch (e) {
        console.error("Failed to reload savedVersions:", e);
      }
    } else {
      document.body.classList.remove("timeline-modal-open");
    }
    return () => {
      document.body.classList.remove("timeline-modal-open");
    };
  }, [showVersions, showImportModal]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [autoKey, setAutoKey] = useState(true);
  const [showCode, setShowCode] = useState(false);
  const [position, setPosition] = useState("bottom"); // "bottom" | "top"

  // Copy / Paste keyframe state
  const [copiedKeyframe, setCopiedKeyframe] = useState(null);
  const [clipboardNotice, setClipboardNotice] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const noticeTimerRef = useRef(null);

  // References for direct DOM updates (updates at 60fps without React re-renders)
  const playheadRef = useRef(null);
  const progressTextRef = useRef(null);
  const frameTextRef = useRef(null);
  const beatTextRef = useRef(null);
  
  // Live channel readout element refs
  const readoutsRef = useRef({
    camX: null,
    camY: null,
    camZ: null,
    rotX: null,
    rotY: null,
    rotZ: null,
    posX: null,
    posY: null,
    posZ: null,
    scale: null,
  });

  // Live slider input element refs for 60fps scroll thumb movements
  const sliderInputsRef = useRef({
    camX: null,
    camY: null,
    camZ: null,
    rotX: null,
    rotY: null,
    rotZ: null,
    posX: null,
    posY: null,
    posZ: null,
    scale: null,
  });

  const timelineTrackRef = useRef(null);
  const playheadProgressRef = useRef(0);
  const autoScrollRafRef = useRef(null);

  // Expose update method to parent so it can push frame, playhead, and live coordinates
  useImperativeHandle(ref, () => ({
    update(scrollInfo, poseInfo) {
      playheadProgressRef.current = scrollInfo.progress;

      // 1. Update playhead position in DOM
      if (playheadRef.current) {
        playheadRef.current.style.left = `${scrollInfo.progress * 100}%`;
      }

      // 2. Update playhead numeric readouts
      if (progressTextRef.current) {
        progressTextRef.current.textContent = `${(scrollInfo.progress * 100).toFixed(1)}%`;
      }
      if (frameTextRef.current) {
        frameTextRef.current.textContent = `f: ${Math.round(scrollInfo.progress * totalFrames)}`;
      }
      if (beatTextRef.current) {
        const frameNum = Math.round(scrollInfo.progress * totalFrames);
        // scrollInfo.beatIndex is 0-based "beat we're transitioning FROM",
        // beatFraction is 0–1 progress toward the NEXT beat. That reads as
        // "Beat 2 → 3 (73%)" which is confusing (looks like a range, not a
        // completion percentage). Instead, show it as a single current beat
        // + how far through that beat we are — e.g. "Beat 1 (20%)" simply
        // means "we're 20% of the way through Beat 1, heading to Beat 2."
        // Once beatFraction hits 100%, we've arrived at the NEXT beat, so
        // the displayed beat number should roll over to it at that point
        // rather than sitting at 100% forever.
        const pctBetween = scrollInfo.beatFraction * 100;
        const isBeatComplete = pctBetween >= 99.95; // treat ~100% as arrived
        const displayBeatNum = isBeatComplete
          ? Math.min(scrollInfo.beatIndex + 2, scrollInfo.beatCount)
          : scrollInfo.beatIndex + 1;
        const displayPct = isBeatComplete ? 0 : Math.round(pctBetween);
        beatTextRef.current.textContent = `Frame ${frameNum} | Beat ${displayBeatNum} (${displayPct}%)`;
      }

      // 3. Update live coordinate readouts in the sidebar
      if (poseInfo) {
        updateReadout("camX", poseInfo.camPos?.x);
        updateReadout("camY", poseInfo.camPos?.y);
        updateReadout("camZ", poseInfo.camPos?.z);
        updateReadout("rotX", poseInfo.ringRot?.x);
        updateReadout("rotY", poseInfo.ringRot?.y);
        updateReadout("rotZ", poseInfo.ringRot?.z);
        updateReadout("posX", poseInfo.ringPosOffset?.x);
        updateReadout("posY", poseInfo.ringPosOffset?.y);
        updateReadout("posZ", poseInfo.ringPosOffset?.z);
        updateReadout("scale", poseInfo.ringScale);
      }
    }
  }));

  const updateReadout = (key, val) => {
    const el = readoutsRef.current[key];
    if (el && val !== undefined && val !== null) {
      const formatted = typeof val === "number" ? val.toFixed(2) : val;
      if (document.activeElement !== el) {
        if (el.tagName === "INPUT") {
          el.value = formatted;
        } else {
          el.textContent = formatted;
        }
      }
    }
    const inputEl = sliderInputsRef.current[key];
    if (inputEl && val !== undefined && val !== null) {
      inputEl.value = val;
    }
  };

  // Timeline play/pause auto-scrolling animation loop
  useEffect(() => {
    if (isPlaying) {
      let lastTime = performance.now();
      const scrollSpeed = 0.05; // speed factor

      const loop = (now) => {
        const dt = (now - lastTime) / 1000;
        lastTime = now;

        let nextProgress = playheadProgressRef.current + scrollSpeed * dt;
        if (nextProgress > 1.0) {
          nextProgress = 0.0; // Loop animation
        }

        if (onJumpToProgress) {
          onJumpToProgress(nextProgress, false);
        }

        autoScrollRafRef.current = requestAnimationFrame(loop);
      };

      autoScrollRafRef.current = requestAnimationFrame(loop);
    } else {
      if (autoScrollRafRef.current) {
        cancelAnimationFrame(autoScrollRafRef.current);
      }
    }

    return () => {
      if (autoScrollRafRef.current) {
        cancelAnimationFrame(autoScrollRafRef.current);
      }
    };
  }, [isPlaying, onJumpToProgress]);

  // Handle timeline track scrubbing
  const handleTimelineScrub = (e) => {
    if (!timelineTrackRef.current || !onJumpToProgress) return;

    const rect = timelineTrackRef.current.getBoundingClientRect();
    const updateFromPosition = (clientX) => {
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const progress = x / rect.width;
      onJumpToProgress(progress, false);
    };

    updateFromPosition(e.clientX);

    const handleMouseMove = (moveEvent) => {
      updateFromPosition(moveEvent.clientX);
    };

    const handleMouseUp = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      const currentFrame = Math.round(playheadProgressRef.current * totalFrames);
      onSelectBeat(currentFrame);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  // Handle dragging green keyframe diamonds on timeline track
  const handleKeyframeMouseDown = (e, frame) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!timelineTrackRef.current) return;

    const diamondEl = e.currentTarget;
    const startX = e.clientX;
    const trackRect = timelineTrackRef.current.getBoundingClientRect();
    
    let currentFrame = frame;
    let didMove = false;

    // Disable transition style during active drag for instant 60fps DOM response
    const origTransition = diamondEl.style.transition;
    diamondEl.style.transition = "none";

    const handleMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      if (Math.abs(deltaX) > 3) {
        didMove = true;
      }
      
      const newPct = (moveEvent.clientX - trackRect.left) / trackRect.width;
      const nextFrame = Math.max(0, Math.min(totalFrames, Math.round(newPct * totalFrames)));
      
      // Update DOM position immediately (based on totalFrames percentage)
      diamondEl.style.left = `${(nextFrame / totalFrames) * 100}%`;
      currentFrame = nextFrame;
      
      if (frameTextRef.current) {
        frameTextRef.current.textContent = `f: ${nextFrame}`;
      }
    };

    const handleMouseUp = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      
      diamondEl.style.transition = origTransition;
      
      if (didMove) {
        if (onMoveKeyframe) {
          onMoveKeyframe(frame, currentFrame);
        }
      } else {
        onSelectBeat(frame);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  // Helper for input sliders
  const handleSliderChange = (key, value) => {
    // Automatically turn on live override when editing so values show immediately
    if (!values.live && onToggleLive) {
      onToggleLive(true);
    }
    const nextValues = { ...values, [key]: value };
    onChange({ [key]: value });
    if (autoKey) {
      onSave(nextValues);
    }
  };

  const showToast = (msg) => {
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    setClipboardNotice(msg);
    noticeTimerRef.current = setTimeout(() => {
      setClipboardNotice(null);
    }, 2500);
  };

  // Copy keyframe data from specified frame or active frame
  const handleCopyKeyframe = (targetFrame = values.activeFrame) => {
    const api = poseApiRef?.current;
    const snapshot = api?.getKeyframeSnapshot?.(timelineTarget) || {};
    const kf = snapshot[targetFrame];
    let data;
    if (kf) {
      data = {
        sourceFrame: targetFrame,
        camPos: { ...kf.camPos },
        ringRot: { ...kf.ringRot },
        ringPosOffset: { ...(kf.ringPosOffset || { x: 0, y: 0, z: 0 }) },
        ringScale: kf.ringScale ?? 1,
        metalEnvIntensity: kf.metalEnvIntensity ?? 4,
        gemEnvIntensity: kf.gemEnvIntensity ?? 1.2,
        cornerPark: kf.cornerPark ?? (targetFrame <= 210 ? 1 : 0),
        bgTop: kf.bgTop ?? "#0d0d10",
        bgBottom: kf.bgBottom ?? "#1a1a1f",
      };
    } else {
      data = {
        sourceFrame: targetFrame,
        camPos: { x: values.camX, y: values.camY, z: values.camZ },
        ringRot: { x: values.rotX, y: values.rotY, z: values.rotZ },
        ringPosOffset: { x: values.posX, y: values.posY, z: values.posZ },
        ringScale: values.scale ?? 1,
        metalEnvIntensity: 4,
        gemEnvIntensity: 1.2,
        cornerPark: targetFrame <= 210 ? 1 : 0,
        bgTop: "#0d0d10",
        bgBottom: "#1a1a1f",
      };
    }
    setCopiedKeyframe(data);
    showToast(`📋 Copied Keyframe f:${targetFrame}`);
  };

  // Paste copied keyframe data to specified destination frame or active frame
  const handlePasteKeyframe = (destFrame = values.activeFrame) => {
    if (!copiedKeyframe) {
      showToast("⚠ No keyframe copied yet!");
      return;
    }
    const api = poseApiRef?.current;
    if (!api || !api.saveKeyframe) {
      showToast("⚠ Timeline API not ready!");
      return;
    }

    const pasteData = {
      camPos: { ...copiedKeyframe.camPos },
      ringRot: { ...copiedKeyframe.ringRot },
      ringPosOffset: { ...(copiedKeyframe.ringPosOffset || { x: 0, y: 0, z: 0 }) },
      ringScale: copiedKeyframe.ringScale ?? 1,
      cornerPark: copiedKeyframe.cornerPark !== undefined ? copiedKeyframe.cornerPark : (destFrame <= 210 ? 1 : 0),
      metalEnvIntensity: copiedKeyframe.metalEnvIntensity ?? 4,
      gemEnvIntensity: copiedKeyframe.gemEnvIntensity ?? 1.2,
      bgTop: copiedKeyframe.bgTop,
      bgBottom: copiedKeyframe.bgBottom,
    };

    api.saveKeyframe(destFrame, pasteData, timelineTarget);
    onSelectBeat?.(destFrame);
    showToast(`✓ Pasted f:${copiedKeyframe.sourceFrame} → f:${destFrame}`);
  };

  // Keyboard shortcuts: Ctrl+C / Cmd+C to copy, Ctrl+V / Cmd+V to paste
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName)) return;

      if ((e.ctrlKey || e.metaKey) && (e.key === "c" || e.key === "C")) {
        e.preventDefault();
        handleCopyKeyframe(values.activeFrame);
      } else if ((e.ctrlKey || e.metaKey) && (e.key === "v" || e.key === "V")) {
        e.preventDefault();
        if (copiedKeyframe) {
          handlePasteKeyframe(values.activeFrame);
        } else {
          showToast("⚠ Copy a keyframe first (Ctrl+C)");
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [values.activeFrame, copiedKeyframe, timelineTarget]);

  // Close context menu on any outside click
  useEffect(() => {
    const closeMenu = () => setContextMenu(null);
    window.addEventListener("click", closeMenu);
    return () => window.removeEventListener("click", closeMenu);
  }, []);

  // Handle right-click on timeline track to open context menu
  const handleTrackContextMenu = (e) => {
    e.preventDefault();
    if (!timelineTrackRef.current) return;
    const rect = timelineTrackRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const clickFrame = Math.round(pct * totalFrames);
    const isSaved = savedBeats?.has(clickFrame);
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      frame: clickFrame,
      isSaved,
    });
  };

  const handleSaveTimelineToCode = async () => {
    const api = poseApiRef?.current;
    if (!api || !api.getFullTimeline) {
      alert("Timeline API not ready yet!");
      return;
    }

    const defaultName = `Version ${savedVersions.length + 1} (${timelineTarget === "mobile" ? "Mobile" : "Desktop"})`;
    const name = window.prompt("Enter a name for this timeline version:", defaultName);
    if (!name || !name.trim()) {
      return;
    }

    const beats = api.getFullTimeline(timelineTarget);
    const newVersion = {
      id: "ver_" + Date.now(),
      name: name.trim(),
      target: timelineTarget,
      date: new Date().toLocaleString(),
      keyframeCount: beats.length,
      beats: beats,
    };

    const updatedVersions = [newVersion, ...savedVersions];
    setSavedVersions(updatedVersions);
    try {
      localStorage.setItem("timeline_versions", JSON.stringify(updatedVersions));
    } catch (e) {
      console.error("Failed to save to localStorage:", e);
    }

    try {
      const res = await fetch("/api/save-timeline", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ beats, target: timelineTarget }),
      });
      const data = await res.json();
      if (data.success) {
        alert(
          `Successfully saved version "${name.trim()}"!\n• Saved to Version Control (${beats.length} keyframes)\n• Written to RingHero.jsx code`,
        );
      } else {
        alert(`Saved version "${name.trim()}" to Version Control, but code update failed: ${data.error}`);
      }
    } catch (err) {
      alert(`Saved version "${name.trim()}" to Version Control! (Code save error: ${err.message})`);
    }
  };

  const handleLoadVersion = (version) => {
    const api = poseApiRef?.current;
    if (!api || !api.loadTimeline) {
      alert("Timeline API load not supported yet! RingHero must be active.");
      return;
    }
    if (!version || !version.beats || !Array.isArray(version.beats)) {
      alert("Invalid timeline version data!");
      return;
    }

    if (onToggleTimelineTarget && version.target && version.target !== timelineTarget) {
      onToggleTimelineTarget(version.target);
    }

    api.loadTimeline(version.target || timelineTarget, version.beats);

    if (version.beats.length > 0) {
      const firstFrame = version.beats[0].frame ?? 0;
      onSelectBeat?.(firstFrame);
      api.jumpToBeat?.(firstFrame);
    }

    alert(`Loaded version "${version.name}" (${version.beats.length} keyframes for ${version.target || "desktop"})!`);
    setShowVersions(false);
  };

  const handleDeleteVersion = (id, e) => {
    e?.stopPropagation?.();
    const ver = savedVersions.find((v) => v.id === id);
    if (!window.confirm(`Delete saved timeline version "${ver?.name || "this version"}"?`)) return;
    const updated = savedVersions.filter((v) => v.id !== id);
    setSavedVersions(updated);
    try {
      localStorage.setItem("timeline_versions", JSON.stringify(updated));
    } catch (err) {
      console.error(err);
    }
  };

  const handleExportVersion = (version, e) => {
    e?.stopPropagation?.();
    const jsonStr = JSON.stringify(version, null, 2);
    navigator.clipboard?.writeText(jsonStr);
    alert(`Copied version "${version.name}" JSON to clipboard!`);
  };

  const handleDownloadVersion = (version, e) => {
    e?.stopPropagation?.();
    const jsonStr = JSON.stringify(version, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(version.name || "timeline").replace(/[^a-zA-Z0-9_-]/g, "_")}_timeline.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleOpenImportModal = () => {
    setImportText("");
    setImportName(`Version ${savedVersions.length + 1} (Imported)`);
    setImportTarget(timelineTarget || "desktop");
    setImportError("");
    setParsedPreview(null);
    setShowImportModal(true);
  };

  const handleTextChange = (text) => {
    setImportText(text);
    if (!text.trim()) {
      setParsedPreview(null);
      setImportError("");
      return;
    }
    const result = extractBeatsFromInput(text);
    if (result && result.beats && result.beats.length > 0) {
      setParsedPreview(result);
      setImportError("");
      if (result.detectedName && (!importName || importName.startsWith("Version "))) {
        setImportName(result.detectedName);
      }
      if (result.detectedTarget) {
        setImportTarget(result.detectedTarget);
      }
    } else {
      setParsedPreview(null);
      setImportError("Could not find a valid beats/keyframes array. Supported: JSON array, { beats: [...] }, { keyframes: [...] }, { '0': {...} }, or JS code from RingHero.jsx.");
    }
  };

  const handleFileChosen = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result;
      if (typeof content === "string") {
        const cleanFileName = file.name.replace(/\.(json|js|txt)$/i, "").trim();
        if (cleanFileName) {
          setImportName(cleanFileName);
        }
        handleTextChange(content);
      }
    };
    reader.readAsText(file);
  };

  const handleExecuteImport = (loadNow = false) => {
    if (!parsedPreview || !parsedPreview.beats) return;
    const beats = parsedPreview.beats;
    const name = (importName || "Imported Version").trim();
    const target = importTarget || timelineTarget || "desktop";

    const newVersion = {
      id: "ver_" + Date.now(),
      name: name,
      target: target,
      date: new Date().toLocaleString(),
      keyframeCount: beats.length,
      beats: beats,
    };

    const updated = [newVersion, ...savedVersions];
    setSavedVersions(updated);
    try {
      localStorage.setItem("timeline_versions", JSON.stringify(updated));
    } catch (err) {
      console.error("Failed to save to localStorage:", err);
    }

    setShowImportModal(false);

    if (loadNow) {
      handleLoadVersion(newVersion);
      alert(`Imported and loaded "${name}" with ${beats.length} keyframes into the 3D scene!`);
    } else {
      alert(`Successfully saved "${name}" with ${beats.length} keyframes to Version Control!`);
    }
  };

  const handleInheritFromMain = () => {
    const api = poseApiRef?.current;
    if (!api || !api.inheritMobileFromMain) {
      alert("Timeline API not ready yet!");
      return;
    }
    if (
      window.confirm(
        "Copy all keyframes from Main Desktop Timeline into Mobile Timeline? This will override your current mobile keyframes with the main timeline baseline.",
      )
    ) {
      api.inheritMobileFromMain();
      alert("Mobile timeline successfully updated to inherit from Main Desktop timeline!");
    }
  };

  const beatsArray = Array.from({ length: beatCount }, (_, i) => i);
  const beatPercentages = beatsArray.map((i) => i / (beatCount - 1));

  // Generate code snippet for easy copy-pasting into code config
  const codeSnippet = `frame: ${values.activeFrame},
camPos: { x: ${values.camX.toFixed(2)}, y: ${values.camY.toFixed(2)}, z: ${values.camZ.toFixed(2)}, lookAtY: 0 },
ringRot: { x: ${values.rotX.toFixed(2)}, y: ${values.rotY.toFixed(2)}, z: ${values.rotZ.toFixed(2)} },
ringPosOffset: { x: ${values.posX.toFixed(2)}, y: ${values.posY.toFixed(2)}, z: ${values.posZ.toFixed(2)} },
ringScale: ${values.scale.toFixed(2)},`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(codeSnippet);
    alert("Keyframe configuration copied to clipboard!");
  };

  const [isMobileScreen, setIsMobileScreen] = useState(
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );
  const [activeMobileTab, setActiveMobileTab] = useState("channels"); // "channels" | "timeline"
  const [mobileHeightMode, setMobileHeightMode] = useState("expanded"); // "expanded" | "peek"
  const touchStartYRef = useRef(0);

  useEffect(() => {
    const handleResize = () => {
      setIsMobileScreen(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleTouchStart = (e) => {
    if (!isMobileScreen) return;
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e) => {
    if (!isMobileScreen) return;
    const endY = e.changedTouches[0].clientY;
    const diffY = endY - touchStartYRef.current;
    if (diffY > 35) {
      // Swiped DOWN -> slide to peek or collapse
      if (collapsed) return;
      if (mobileHeightMode === "expanded") {
        setMobileHeightMode("peek");
      } else if (mobileHeightMode === "peek") {
        setCollapsed(true);
      }
    } else if (diffY < -35) {
      // Swiped UP -> slide to expanded
      if (collapsed) {
        setCollapsed(false);
        setMobileHeightMode("peek");
      } else if (mobileHeightMode === "peek") {
        setMobileHeightMode("expanded");
      }
    }
  };

  const calcHeight = collapsed || (isMobileScreen && mobileHeightMode === "peek")
    ? "32px"
    : isMobileScreen
    ? "370px"
    : "330px";

  return (
    <>
      {/* Sleek Floating Control Pill for 100% Fullscreen 3D View on Mobile */}
      {isMobileScreen && mobileHeightMode === "peek" && !collapsed && (
        <div
          data-lenis-prevent
          style={{
            position: "fixed",
            bottom: "16px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "6px 14px",
            borderRadius: "999px",
            background: "rgba(12, 12, 16, 0.85)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            boxShadow: "0 10px 36px rgba(0, 0, 0, 0.7)",
            fontFamily: "'SF Mono', Monaco, Fira Code, monospace",
            userSelect: "none",
          }}
        >
          <button
            onClick={() => onJumpToProgress(0, false)}
            style={{
              background: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              color: "#fff",
              borderRadius: "999px",
              padding: "4px 8px",
              fontSize: "10px",
              cursor: "pointer",
            }}
          >
            ⏮
          </button>

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            style={{
              background: isPlaying ? "rgba(226, 91, 28, 0.3)" : "rgba(255, 255, 255, 0.12)",
              border: isPlaying ? "1px solid #E25B1C" : "1px solid rgba(255, 255, 255, 0.2)",
              color: isPlaying ? "#ff7b39" : "#fff",
              borderRadius: "999px",
              padding: "4px 12px",
              fontSize: "10px",
              fontWeight: "bold",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            {isPlaying ? "⏸ PAUSE" : "▶ PLAY"}
          </button>

          <span ref={progressTextRef} style={{ fontSize: "10px", color: "#4DA3FF", fontWeight: "bold" }}>
            0%
          </span>

          <button
            onClick={onSave}
            style={{
              background: "rgba(57, 255, 20, 0.2)",
              border: "1px solid rgba(57, 255, 20, 0.4)",
              color: "#5cff6c",
              borderRadius: "999px",
              padding: "4px 10px",
              fontSize: "10px",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            ◆ REC
          </button>

          <button
            onClick={() => setMobileHeightMode("expanded")}
            style={{
              background: "rgba(255, 255, 255, 0.15)",
              border: "1px solid rgba(255, 255, 255, 0.3)",
              color: "#fff",
              borderRadius: "999px",
              padding: "4px 12px",
              fontSize: "10px",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            🎛️ Sliders ▲
          </button>
        </div>
      )}

      <div
        data-lenis-prevent
        className="timeline-editor-root"
        style={{
          position: "fixed",
          bottom: position === "bottom" ? 0 : "auto",
          top: position === "top" ? 0 : "auto",
          left: 0,
          right: 0,
          height: calcHeight,
          maxHeight: collapsed ? "32px" : "75vh",
          background: "rgba(18, 18, 22, 0.96)",
          borderTop: position === "bottom" ? "1px solid rgba(255, 255, 255, 0.12)" : "none",
          borderBottom: position === "top" ? "1px solid rgba(255, 255, 255, 0.12)" : "none",
          color: "#d1d1d6",
          fontFamily: "'SF Mono', Monaco, Fira Code, monospace",
          fontSize: "11px",
          zIndex: 9999,
          backdropFilter: "blur(24px)",
          transition: "height 0.25s cubic-bezier(0.25, 0.8, 0.25, 1)",
          display: isMobileScreen && mobileHeightMode === "peek" && !collapsed ? "none" : "flex",
          flexDirection: "column",
          boxShadow: position === "bottom" ? "0 -8px 32px rgba(0, 0, 0, 0.5)" : "0 8px 32px rgba(0, 0, 0, 0.5)",
          cursor: "default",
        }}
      >
        {/* Mobile Swipe Drag Handle */}
        {isMobileScreen && (
          <div
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onClick={(e) => {
              e.stopPropagation();
              if (collapsed) {
                setCollapsed(false);
                setMobileHeightMode("peek");
              } else {
                setMobileHeightMode(mobileHeightMode === "peek" ? "expanded" : "peek");
              }
            }}
            style={{
              width: "100%",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              paddingTop: "4px",
              paddingBottom: "2px",
              cursor: "grab",
              background: "rgba(255, 255, 255, 0.03)",
            }}
          >
            <div
              style={{
                width: "36px",
                height: "4px",
                borderRadius: "2px",
                background: "rgba(255, 255, 255, 0.35)",
              }}
            />
          </div>
        )}

        {/* Timeline Toggle Bar */}
        <div
          onClick={() => setCollapsed(!collapsed)}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          style={{
            minHeight: "32px",
            background: "rgba(30, 30, 35, 0.6)",
            borderBottom: collapsed ? "none" : "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            padding: isMobileScreen ? "4px 8px" : "0 16px",
            gap: "6px",
            cursor: "pointer",
            userSelect: "none",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
            <span style={{ color: timelineTarget === "mobile" ? "#34c759" : "#E25B1C", fontWeight: "bold" }}>●</span>
            <span style={{ fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase", fontSize: "10px", color: "#eee" }}>
              {isMobileScreen ? "3D Editor" : `3D Timeline: ${timelineTarget === "mobile" ? "Mobile Timeline" : "Main Desktop Timeline"}`}
            </span>

            {/* Target Timeline Switcher */}
            <div style={{ display: "flex", gap: "4px", marginLeft: isMobileScreen ? "2px" : "8px" }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleTimelineTarget?.("desktop");
                }}
                style={{
                  background: timelineTarget === "desktop" ? "rgba(226, 91, 28, 0.3)" : "rgba(255, 255, 255, 0.06)",
                  border: timelineTarget === "desktop" ? "1px solid #E25B1C" : "1px solid rgba(255, 255, 255, 0.1)",
                  color: timelineTarget === "desktop" ? "#fff" : "#8e8e93",
                  borderRadius: "4px",
                  padding: "2px 6px",
                  fontSize: "9px",
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                💻 Desktop
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleTimelineTarget?.("mobile");
                }}
                style={{
                  background: timelineTarget === "mobile" ? "rgba(52, 199, 89, 0.3)" : "rgba(255, 255, 255, 0.06)",
                  border: timelineTarget === "mobile" ? "1px solid #34c759" : "1px solid rgba(255, 255, 255, 0.1)",
                  color: timelineTarget === "mobile" ? "#fff" : "#8e8e93",
                  borderRadius: "4px",
                  padding: "2px 6px",
                  fontSize: "9px",
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                📱 Mobile
              </button>

              {timelineTarget === "mobile" && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleInheritFromMain();
                  }}
                  title="Copy all keyframes from Main Timeline as baseline for Mobile Timeline"
                  style={{
                    background: "rgba(255, 214, 10, 0.15)",
                    border: "1px solid rgba(255, 214, 10, 0.4)",
                    color: "#ffd60a",
                    borderRadius: "4px",
                    padding: "2px 6px",
                    fontSize: "9px",
                    cursor: "pointer",
                  }}
                >
                  🔄 Inherit
                </button>
              )}
            </div>

            {/* Saved Timelines / Version Control Top Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowVersions(!showVersions);
              }}
              style={{
                background: showVersions ? "rgba(77, 163, 255, 0.35)" : "rgba(255, 255, 255, 0.08)",
                border: showVersions ? "1px solid #4DA3FF" : "1px solid rgba(255, 255, 255, 0.2)",
                color: showVersions ? "#fff" : "#eee",
                borderRadius: "4px",
                padding: "2px 8px",
                fontSize: "9px",
                fontWeight: "bold",
                cursor: "pointer",
                marginLeft: "4px",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
              title="Display Saved Timelines & Version Control"
            >
              📂 Timelines ({savedVersions.length})
            </button>

            {/* Quick Import Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleOpenImportModal();
              }}
              style={{
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                color: "#eee",
                borderRadius: "4px",
                padding: "2px 8px",
                fontSize: "9px",
                fontWeight: "bold",
                cursor: "pointer",
                marginLeft: "4px",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
              title="Import timeline from file (.json, .js, .txt) or paste code"
            >
              📥 Import
            </button>

            {/* [EXPERIMENTAL_ATMOSPHERE] Atmosphere Toggle Button */}
            {onToggleAtmosphere && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleAtmosphere();
                }}
                style={{
                  background: experimentalAtmosphere
                    ? "rgba(255, 180, 50, 0.25)"
                    : "rgba(255, 255, 255, 0.08)",
                  border: experimentalAtmosphere
                    ? "1px solid #ffb432"
                    : "1px solid rgba(255, 255, 255, 0.2)",
                  color: experimentalAtmosphere ? "#ffd280" : "#999",
                  borderRadius: "4px",
                  padding: "2px 8px",
                  fontSize: "9px",
                  fontWeight: "bold",
                  cursor: "pointer",
                  marginLeft: "4px",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
                title="Experimental Atmosphere: Soft Depth of Field, Idle Float & Mist Blend at Frame 0"
              >
                ✨ Atmosphere: {experimentalAtmosphere ? "ON" : "OFF"}
              </button>
            )}

            {/* Mobile Tab Switcher */}
            {isMobileScreen && (
              <div style={{ display: "flex", gap: "4px", marginLeft: "4px" }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (collapsed) setCollapsed(false);
                    setMobileHeightMode("expanded");
                    setActiveMobileTab("channels");
                  }}
                  style={{
                    background: activeMobileTab === "channels" && mobileHeightMode === "expanded" ? "rgba(77, 163, 255, 0.3)" : "rgba(255, 255, 255, 0.05)",
                    border: activeMobileTab === "channels" && mobileHeightMode === "expanded" ? "1px solid #4DA3FF" : "1px solid rgba(255, 255, 255, 0.1)",
                    color: activeMobileTab === "channels" && mobileHeightMode === "expanded" ? "#fff" : "#aaa",
                    borderRadius: "4px",
                    padding: "2px 6px",
                    fontSize: "9px",
                    cursor: "pointer",
                  }}
                >
                  🎛️ Sliders
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (collapsed) setCollapsed(false);
                    setMobileHeightMode("expanded");
                    setActiveMobileTab("timeline");
                  }}
                  style={{
                    background: activeMobileTab === "timeline" && mobileHeightMode === "expanded" ? "rgba(77, 163, 255, 0.3)" : "rgba(255, 255, 255, 0.05)",
                    border: activeMobileTab === "timeline" && mobileHeightMode === "expanded" ? "1px solid #4DA3FF" : "1px solid rgba(255, 255, 255, 0.1)",
                    color: activeMobileTab === "timeline" && mobileHeightMode === "expanded" ? "#fff" : "#aaa",
                    borderRadius: "4px",
                    padding: "2px 6px",
                    fontSize: "9px",
                    cursor: "pointer",
                  }}
                >
                  ⏱️ Track
                </button>
              </div>
            )}

            {/* Peek 3D View button on mobile */}
            {isMobileScreen && !collapsed && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMobileHeightMode(mobileHeightMode === "peek" ? "expanded" : "peek");
                }}
                title="Slide editor down to inspect full 3D ring view while playback continues"
                style={{
                  background: mobileHeightMode === "peek" ? "rgba(226, 91, 28, 0.3)" : "rgba(255, 255, 255, 0.08)",
                  border: mobileHeightMode === "peek" ? "1px solid #E25B1C" : "1px solid rgba(255, 255, 255, 0.15)",
                  color: mobileHeightMode === "peek" ? "#ff7b39" : "#fff",
                  borderRadius: "4px",
                  padding: "2px 6px",
                  fontSize: "9px",
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                {mobileHeightMode === "peek" ? "🎛️ Sliders ▲" : "👁️ Hide Panel ▼"}
              </button>
            )}

            <span
              ref={beatTextRef}
              style={{
                background: "rgba(255, 255, 255, 0.06)",
                padding: "2px 6px",
                borderRadius: "4px",
                fontSize: "9px",
                color: "#a1a1a6",
              }}
            >
              f:0
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setPosition(position === "bottom" ? "top" : "bottom");
              }}
              style={{
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                borderRadius: "4px",
                padding: "2px 6px",
                color: "#fff",
                fontSize: "9px",
                cursor: "pointer",
              }}
            >
              {position === "bottom" ? "⇅ Top" : "⇅ Bottom"}
            </button>
            <span ref={frameTextRef} style={{ color: "#4DA3FF", fontWeight: "bold", fontSize: "10px" }}>f: 0</span>
            <span ref={progressTextRef} style={{ color: "#999", fontSize: "10px" }}>0%</span>
          </div>
        </div>

      {!collapsed && (
        <div style={{ flex: 1, display: "flex", flexDirection: isMobileScreen ? "column" : "row", overflow: "hidden", minHeight: 0 }}>
          {/* LEFT SIDEBAR - Channel Inspector (Parameters) */}
          {(!isMobileScreen || activeMobileTab === "channels") && (
            <div
              style={{
                width: isMobileScreen ? "100%" : "340px",
                flex: isMobileScreen ? 1 : "none",
                borderRight: isMobileScreen ? "none" : "1px solid rgba(255, 255, 255, 0.08)",
                background: "rgba(14, 14, 16, 0.5)",
                display: "flex",
                flexDirection: "column",
                overflowY: "auto",
                padding: isMobileScreen ? "8px" : "12px",
              }}
            >
              <div style={{ fontWeight: "bold", textTransform: "uppercase", fontSize: "10px", color: "#8e8e93", marginBottom: "8px", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "4px" }}>
                Channels & Properties ({timelineTarget === "mobile" ? "Mobile" : "Desktop"})
              </div>

              {/* Camera Position group */}
              <ChannelGroup label="Camera Position">
                <ChannelRow
                  label="Cam X"
                  valKey="camX"
                  value={values.camX}
                  min={-3}
                  max={3}
                  onChange={handleSliderChange}
                  readoutRef={(el) => (readoutsRef.current.camX = el)}
                  inputRef={(el) => (sliderInputsRef.current.camX = el)}
                />
                <ChannelRow
                  label="Cam Y"
                  valKey="camY"
                  value={values.camY}
                  min={-2}
                  max={2}
                  onChange={handleSliderChange}
                  readoutRef={(el) => (readoutsRef.current.camY = el)}
                  inputRef={(el) => (sliderInputsRef.current.camY = el)}
                />
                <ChannelRow
                  label="Cam Z"
                  valKey="camZ"
                  value={values.camZ}
                  min={1}
                  max={8}
                  onChange={handleSliderChange}
                  readoutRef={(el) => (readoutsRef.current.camZ = el)}
                  inputRef={(el) => (sliderInputsRef.current.camZ = el)}
                />
              </ChannelGroup>

              {/* Ring Rotation group */}
              <ChannelGroup label="Ring Rotation">
                <ChannelRow
                  label="Rot X"
                  valKey="rotX"
                  value={values.rotX}
                  min={-3.14}
                  max={3.14}
                  onChange={handleSliderChange}
                  readoutRef={(el) => (readoutsRef.current.rotX = el)}
                  inputRef={(el) => (sliderInputsRef.current.rotX = el)}
                />
                <ChannelRow
                  label="Rot Y"
                  valKey="rotY"
                  value={values.rotY}
                  min={-6.3}
                  max={6.3}
                  onChange={handleSliderChange}
                  readoutRef={(el) => (readoutsRef.current.rotY = el)}
                  inputRef={(el) => (sliderInputsRef.current.rotY = el)}
                />
                <ChannelRow
                  label="Rot Z"
                  valKey="rotZ"
                  value={values.rotZ}
                  min={-3.14}
                  max={3.14}
                  onChange={handleSliderChange}
                  readoutRef={(el) => (readoutsRef.current.rotZ = el)}
                  inputRef={(el) => (sliderInputsRef.current.rotZ = el)}
                />
              </ChannelGroup>

              {/* Ring Position group */}
              <ChannelGroup label="Ring Position Offset">
                <ChannelRow
                  label="Pos X"
                  valKey="posX"
                  value={values.posX}
                  min={-2}
                  max={2}
                  onChange={handleSliderChange}
                  readoutRef={(el) => (readoutsRef.current.posX = el)}
                  inputRef={(el) => (sliderInputsRef.current.posX = el)}
                />
                <ChannelRow
                  label="Pos Y"
                  valKey="posY"
                  value={values.posY}
                  min={-2}
                  max={2}
                  onChange={handleSliderChange}
                  readoutRef={(el) => (readoutsRef.current.posY = el)}
                  inputRef={(el) => (sliderInputsRef.current.posY = el)}
                />
                <ChannelRow
                  label="Pos Z"
                  valKey="posZ"
                  value={values.posZ}
                  min={-2}
                  max={2}
                  onChange={handleSliderChange}
                  readoutRef={(el) => (readoutsRef.current.posZ = el)}
                  inputRef={(el) => (sliderInputsRef.current.posZ = el)}
                />
              </ChannelGroup>

              {/* Scale group */}
              <ChannelGroup label="Ring Scale">
                <ChannelRow
                  label="Scale"
                  valKey="scale"
                  value={values.scale}
                  min={0.2}
                  max={2.5}
                  onChange={handleSliderChange}
                  readoutRef={(el) => (readoutsRef.current.scale = el)}
                  inputRef={(el) => (sliderInputsRef.current.scale = el)}
                />
              </ChannelGroup>
            </div>
          )}

          {/* RIGHT MAIN SECTION - Timeline, Transport & Keyframes */}
          {(!isMobileScreen || activeMobileTab === "timeline") && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: isMobileScreen ? "8px" : "12px", overflowY: isMobileScreen ? "auto" : "hidden" }}>
              {/* Top Toolbar */}
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", marginBottom: "8px", gap: "6px" }}>
                {/* Transport buttons */}
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <button
                    onClick={() => onJumpToProgress(0, false)}
                    title="Jump to Start"
                    style={toolbarButtonStyle}
                  >
                    ⏮
                  </button>
                  <button
                    onClick={() => {
                      const sorted = Array.from(savedBeats || []).sort((a, b) => a - b);
                      const prev = sorted.filter((f) => f < values.activeFrame).pop();
                      if (prev !== undefined) onSelectBeat(prev);
                      else if (sorted.length > 0) onSelectBeat(sorted[0]);
                    }}
                    title="Previous Keyframe"
                    style={toolbarButtonStyle}
                  >
                    ◀
                  </button>
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    title={isPlaying ? "Pause scroll playback" : "Play scroll playback"}
                    style={{
                      ...toolbarButtonStyle,
                      color: isPlaying ? "#E25B1C" : "#fff",
                      background: isPlaying ? "rgba(226,91,28,0.15)" : "rgba(255,255,255,0.06)",
                      borderColor: isPlaying ? "rgba(226,91,28,0.4)" : "rgba(255,255,255,0.15)",
                    }}
                  >
                    {isPlaying ? "⏸ PAUSE" : "▶ PLAY"}
                  </button>
                  <button
                    onClick={() => {
                      setIsPlaying(false);
                      onJumpToProgress(0, false);
                    }}
                  title="Stop"
                  style={toolbarButtonStyle}
                >
                  ⏹
                </button>
                <button
                  onClick={() => {
                    const sorted = Array.from(savedBeats || []).sort((a, b) => a - b);
                    const next = sorted.find((f) => f > values.activeFrame);
                    if (next !== undefined) onSelectBeat(next);
                    else if (sorted.length > 0) onSelectBeat(sorted[sorted.length - 1]);
                  }}
                  title="Next Keyframe"
                  style={toolbarButtonStyle}
                >
                  ▶
                </button>
                <button
                  onClick={() => onJumpToProgress(1, false)}
                  title="Jump to End"
                  style={toolbarButtonStyle}
                >
                  ⏭
                </button>
              </div>

              {/* Autokey & Override control */}
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    cursor: "pointer",
                    background: autoKey ? "rgba(226, 91, 28, 0.15)" : "rgba(255,255,255,0.03)",
                    padding: "4px 8px",
                    borderRadius: "4px",
                    border: autoKey ? "1px solid rgba(226, 91, 28, 0.3)" : "1px solid rgba(255,255,255,0.08)",
                  }}
                  title="Automatically save keyframes when sliders are moved"
                >
                  <input
                    type="checkbox"
                    checked={autoKey}
                    onChange={(e) => setAutoKey(e.target.checked)}
                    style={{ accentColor: "#E25B1C" }}
                  />
                  <span style={{ color: autoKey ? "#ff7b39" : "#aaa", fontWeight: "bold", fontSize: "9px" }}>AUTO-KEY</span>
                </label>

                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    cursor: "pointer",
                    background: values.live ? "rgba(77, 163, 255, 0.2)" : "rgba(255,255,255,0.03)",
                    padding: "4px 8px",
                    borderRadius: "4px",
                    border: values.live ? "1px solid rgba(77, 163, 255, 0.5)" : "1px solid rgba(255,255,255,0.08)",
                    boxShadow: values.live ? "0 0 8px rgba(77, 163, 255, 0.25)" : "none",
                    transition: "all 0.2s ease",
                  }}
                  title="Keep active to preview overridden settings across the entire timeline during scrub, play, or scroll"
                >
                  <input
                    type="checkbox"
                    checked={values.live}
                    onChange={(e) => onToggleLive(e.target.checked)}
                    style={{ accentColor: "#4DA3FF" }}
                  />
                  <span style={{ color: values.live ? "#4DA3FF" : "#aaa", fontWeight: "bold", fontSize: "9px" }}>
                    LIVE OVERRIDE {values.live ? "● ON" : ""}
                  </span>
                </label>
              </div>

              {/* Keyframe Operations */}
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <button
                  onClick={onSave}
                  style={{
                    background: "rgba(57, 255, 20, 0.15)",
                    border: "1px solid rgba(57, 255, 20, 0.35)",
                    borderRadius: "4px",
                    padding: "4px 10px",
                    color: "#5cff6c",
                    cursor: "pointer",
                    fontSize: "10px",
                    fontWeight: "bold",
                  }}
                  title="Save current parameters to selected keyframe/beat"
                >
                  ◆ RECORD KEYFRAME
                </button>
                <button
                  onClick={() => handleCopyKeyframe(values.activeFrame)}
                  style={{
                    background: savedBeats?.has(values.activeFrame)
                      ? "rgba(77, 163, 255, 0.15)"
                      : "rgba(255,255,255,0.04)",
                    border: savedBeats?.has(values.activeFrame)
                      ? "1px solid rgba(77, 163, 255, 0.4)"
                      : "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "4px",
                    padding: "4px 9px",
                    color: savedBeats?.has(values.activeFrame) ? "#9ad6ff" : "#888",
                    cursor: "pointer",
                    fontSize: "10px",
                    fontWeight: "bold",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    transition: "all 0.15s ease",
                  }}
                  title="Copy active keyframe parameters (Ctrl+C)"
                >
                  📋 COPY {savedBeats?.has(values.activeFrame) ? `(f:${values.activeFrame})` : ""}
                </button>
                <button
                  onClick={() => handlePasteKeyframe(values.activeFrame)}
                  disabled={!copiedKeyframe}
                  style={{
                    background: copiedKeyframe
                      ? "rgba(226, 91, 28, 0.22)"
                      : "rgba(255,255,255,0.03)",
                    border: copiedKeyframe
                      ? "1px solid rgba(226, 91, 28, 0.55)"
                      : "1px solid rgba(255,255,255,0.06)",
                    borderRadius: "4px",
                    padding: "4px 9px",
                    color: copiedKeyframe ? "#ff955c" : "#666",
                    cursor: copiedKeyframe ? "pointer" : "default",
                    fontSize: "10px",
                    fontWeight: "bold",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    opacity: copiedKeyframe ? 1 : 0.4,
                    boxShadow: copiedKeyframe ? "0 0 10px rgba(226, 91, 28, 0.3)" : "none",
                    transition: "all 0.15s ease",
                  }}
                  title={
                    copiedKeyframe
                      ? `Paste copied parameters from f:${copiedKeyframe.sourceFrame} to active frame f:${values.activeFrame} (Ctrl+V)`
                      : "No keyframe copied yet"
                  }
                >
                  📥 PASTE {copiedKeyframe ? `(from f:${copiedKeyframe.sourceFrame})` : ""}
                </button>
                <button
                  onClick={onClear}
                  disabled={!savedBeats?.has(values.activeFrame)}
                  style={{
                    background: "rgba(255, 69, 58, 0.12)",
                    border: "1px solid rgba(255, 69, 58, 0.3)",
                    borderRadius: "4px",
                    padding: "4px 10px",
                    color: savedBeats?.has(values.activeFrame) ? "#ff453a" : "#777",
                    cursor: savedBeats?.has(values.activeFrame) ? "pointer" : "default",
                    opacity: savedBeats?.has(values.activeFrame) ? 1 : 0.4,
                    fontSize: "10px",
                  }}
                  title="Clear keyframe for the selected beat"
                >
                  ✕ CLEAR
                </button>
                {clipboardNotice && (
                  <div
                    style={{
                      background: "rgba(57, 255, 20, 0.18)",
                      border: "1px solid rgba(57, 255, 20, 0.45)",
                      borderRadius: "4px",
                      padding: "3px 8px",
                      color: "#5cff6c",
                      fontSize: "10px",
                      fontWeight: "bold",
                      display: "flex",
                      alignItems: "center",
                      boxShadow: "0 0 8px rgba(57, 255, 20, 0.3)",
                    }}
                  >
                    {clipboardNotice}
                  </div>
                )}
                <button
                  onClick={handleSaveTimelineToCode}
                  style={{
                    background: "rgba(226, 91, 28, 0.25)",
                    border: "1px solid rgba(226, 91, 28, 0.5)",
                    borderRadius: "4px",
                    padding: "4px 10px",
                    color: "#ff7b39",
                    cursor: "pointer",
                    fontSize: "10px",
                    fontWeight: "bold",
                  }}
                  title="Save current timeline with a version name to Version Control and write to RingHero.jsx"
                >
                  💾 SAVE TIMELINE
                </button>
                <button
                  onClick={() => setShowVersions(true)}
                  style={{
                    background: "rgba(77, 163, 255, 0.2)",
                    border: "1px solid rgba(77, 163, 255, 0.45)",
                    borderRadius: "4px",
                    padding: "4px 10px",
                    color: "#4DA3FF",
                    cursor: "pointer",
                    fontSize: "10px",
                    fontWeight: "bold",
                  }}
                  title="Display Saved Timelines and load previous versions"
                >
                  📂 SAVED TIMELINES ({savedVersions.length})
                </button>
                <button
                  onClick={handleOpenImportModal}
                  style={{
                    background: "rgba(255, 255, 255, 0.08)",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    borderRadius: "4px",
                    padding: "4px 10px",
                    color: "#eee",
                    cursor: "pointer",
                    fontSize: "10px",
                    fontWeight: "bold",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                  title="Import timeline from file (.json, .js, .txt) or paste code"
                >
                  📥 IMPORT TIMELINE
                </button>
                <button
                  onClick={onReboot}
                  style={{
                    background: "rgba(77, 163, 255, 0.15)",
                    border: "1px solid rgba(77, 163, 255, 0.35)",
                    borderRadius: "4px",
                    padding: "4px 10px",
                    color: "#9ad6ff",
                    cursor: "pointer",
                    fontSize: "10px",
                    fontWeight: "bold",
                  }}
                  title="Reload the 3D ring model and update its coordinate paths from the saved code file"
                >
                  🔄 RELOAD MODEL
                </button>
              </div>
            </div>

            {/* Dope Sheet & Timeline Ruler container */}
            <div
              style={{
                background: "rgba(10, 10, 12, 0.6)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: "6px",
                display: "flex",
                flexDirection: "column",
                position: "relative",
                padding: "8px 0",
                marginBottom: "12px",
              }}
            >
              {/* Timeline Ruler (Ticks & Playhead handle) */}
              <div
                ref={timelineTrackRef}
                onMouseDown={handleTimelineScrub}
                style={{
                  height: "28px",
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                  position: "relative",
                  cursor: "ew-resize",
                  userSelect: "none",
                }}
              >
                {/* 10% Ticks */}
                {Array.from({ length: 11 }, (_, i) => {
                  const pct = i * 10;
                  return (
                    <div
                      key={pct}
                      style={{
                        position: "absolute",
                        left: `${pct}%`,
                        bottom: 0,
                        width: "1px",
                        height: "8px",
                        background: "rgba(255, 255, 255, 0.15)",
                      }}
                    >
                      <span
                        style={{
                          position: "absolute",
                          bottom: "10px",
                          transform: "translateX(-50%)",
                          fontSize: "8px",
                          color: "rgba(255, 255, 255, 0.4)",
                        }}
                      >
                        {pct}
                      </span>
                    </div>
                  );
                })}

                {/* Sub-ticks (5%) */}
                {Array.from({ length: 20 }, (_, i) => {
                  if (i % 2 === 0) return null;
                  const pct = i * 5;
                  return (
                    <div
                      key={pct}
                      style={{
                        position: "absolute",
                        left: `${pct}%`,
                        bottom: 0,
                        width: "1px",
                        height: "4px",
                        background: "rgba(255, 255, 255, 0.08)",
                      }}
                    />
                  );
                })}

                {/* Playhead Vertical Line & Grab handle */}
                <div
                  ref={playheadRef}
                  style={{
                    position: "absolute",
                    top: 0,
                    bottom: "-36px",
                    width: "2px",
                    background: "#E25B1C",
                    zIndex: 20,
                    pointerEvents: "none",
                    boxShadow: "0 0 8px rgba(226, 91, 28, 0.6)",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: "-5px",
                      width: "12px",
                      height: "12px",
                      background: "#E25B1C",
                      borderRadius: "2px",
                      transform: "rotate(45deg)",
                      cursor: "ew-resize",
                    }}
                  />
                </div>
              </div>

              {/* Keyframe Track / Dope Sheet */}
              <div
                onContextMenu={handleTrackContextMenu}
                style={{
                  height: "40px",
                  position: "relative",
                  background: "rgba(20, 20, 25, 0.4)",
                  overflow: "visible",
                }}
              >
                {/* Horizontal guide line */}
                <div
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: 0,
                    right: 0,
                    height: "1px",
                    background: "rgba(255, 255, 255, 0.05)",
                  }}
                />

                {/* 1. Keyframe Diamonds & Labels for every saved frame */}
                {Array.from(savedBeats || [])
                  .sort((a, b) => a - b)
                  .map((frame) => {
                    const isCurrent = values.activeFrame === frame;
                    return (
                      <div
                        key={`kf-wrap-${frame}`}
                        style={{
                          position: "absolute",
                          left: `${(frame / totalFrames) * 100}%`,
                          top: 0,
                          bottom: 0,
                          transform: "translateX(-50%)",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          pointerEvents: "none",
                          zIndex: isCurrent ? 25 : 8,
                        }}
                      >
                        {/* Floating action pill on active keyframe diamond */}
                        {isCurrent && (
                          <div
                            style={{
                              position: "absolute",
                              top: "-25px",
                              ...(frame / totalFrames < 0.1
                                ? { left: 0 }
                                : frame / totalFrames > 0.9
                                ? { right: 0 }
                                : { left: "50%", transform: "translateX(-50%)" }),
                              display: "flex",
                              alignItems: "center",
                              gap: "2px",
                              background: "rgba(18, 18, 24, 0.95)",
                              border: "1px solid rgba(255, 255, 255, 0.25)",
                              borderRadius: "10px",
                              padding: "2px 5px",
                              boxShadow: "0 4px 14px rgba(0, 0, 0, 0.8)",
                              pointerEvents: "auto",
                              zIndex: 35,
                              whiteSpace: "nowrap",
                            }}
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyKeyframe(frame);
                              }}
                              title="Copy this keyframe parameters (Ctrl+C)"
                              style={{
                                background: "rgba(77, 163, 255, 0.2)",
                                border: "1px solid rgba(77, 163, 255, 0.45)",
                                color: "#9ad6ff",
                                fontSize: "9px",
                                fontWeight: "bold",
                                cursor: "pointer",
                                padding: "1px 5px",
                                borderRadius: "3px",
                              }}
                            >
                              📋 Copy
                            </button>
                            {copiedKeyframe && copiedKeyframe.sourceFrame !== frame && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePasteKeyframe(frame);
                                }}
                                title={`Paste parameters from f:${copiedKeyframe.sourceFrame} here`}
                                style={{
                                  background: "rgba(226, 91, 28, 0.25)",
                                  border: "1px solid rgba(226, 91, 28, 0.5)",
                                  color: "#ff955c",
                                  fontSize: "9px",
                                  fontWeight: "bold",
                                  cursor: "pointer",
                                  padding: "1px 5px",
                                  borderRadius: "3px",
                                }}
                              >
                                📥 Paste f:{copiedKeyframe.sourceFrame}
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onClear();
                              }}
                              title="Delete this keyframe"
                              style={{
                                background: "rgba(255, 69, 58, 0.15)",
                                border: "1px solid rgba(255, 69, 58, 0.35)",
                                color: "#ff453a",
                                fontSize: "9px",
                                cursor: "pointer",
                                padding: "1px 4px",
                                borderRadius: "3px",
                              }}
                            >
                              ✕
                            </button>
                          </div>
                        )}

                        <button
                          onMouseDown={(e) => handleKeyframeMouseDown(e, frame)}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectBeat(frame);
                          }}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setContextMenu({
                              x: e.clientX,
                              y: e.clientY,
                              frame,
                              isSaved: true,
                            });
                          }}
                          title={`Keyframe at frame ${frame} (Click to select/copy, drag to move, right-click for options)`}
                          style={{
                            width: isCurrent ? "12px" : "8px",
                            height: isCurrent ? "12px" : "8px",
                            background: "#39FF14", // neon green
                            border: isCurrent ? "1.5px solid #fff" : "1px solid rgba(0,0,0,0.6)",
                            transform: "rotate(45deg)",
                            cursor: "pointer",
                            pointerEvents: "auto",
                            boxShadow: isCurrent
                              ? "0 0 14px rgba(57, 255, 20, 1)"
                              : "0 0 7px rgba(57, 255, 20, 0.7)",
                            padding: 0,
                            transition: "all 0.15s ease",
                          }}
                        />
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectBeat(frame);
                          }}
                          style={{
                            position: "absolute",
                            bottom: "2px",
                            fontSize: "8px",
                            fontFamily: "monospace",
                            fontWeight: isCurrent ? "bold" : "normal",
                            color: isCurrent ? "#39FF14" : "rgba(255, 255, 255, 0.45)",
                            cursor: "pointer",
                            pointerEvents: "auto",
                            userSelect: "none",
                            whiteSpace: "nowrap",
                            textShadow: isCurrent ? "0 0 4px rgba(57,255,20,0.8)" : "none",
                          }}
                        >
                          f:{frame}
                        </span>
                      </div>
                    );
                  })}

                {/* 2. Blue marker if current active frame does not have a keyframe */}
                {!savedBeats?.has(values.activeFrame) && (
                  <div
                    style={{
                      position: "absolute",
                      left: `${(values.activeFrame / totalFrames) * 100}%`,
                      top: 0,
                      bottom: 0,
                      transform: "translateX(-50%)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      pointerEvents: "none",
                      zIndex: 12,
                    }}
                  >
                    {/* Floating paste pill if a keyframe has been copied */}
                    {copiedKeyframe && (
                      <div
                        style={{
                          position: "absolute",
                          top: "-25px",
                          ...(values.activeFrame / totalFrames < 0.1
                            ? { left: 0 }
                            : values.activeFrame / totalFrames > 0.9
                            ? { right: 0 }
                            : { left: "50%", transform: "translateX(-50%)" }),
                          display: "flex",
                          alignItems: "center",
                          gap: "2px",
                          background: "rgba(18, 18, 24, 0.95)",
                          border: "1px solid rgba(226, 91, 28, 0.6)",
                          borderRadius: "10px",
                          padding: "2px 5px",
                          boxShadow: "0 4px 14px rgba(0, 0, 0, 0.8), 0 0 10px rgba(226, 91, 28, 0.35)",
                          pointerEvents: "auto",
                          zIndex: 35,
                          whiteSpace: "nowrap",
                        }}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePasteKeyframe(values.activeFrame);
                          }}
                          title={`Paste keyframe from f:${copiedKeyframe.sourceFrame} here to frame ${values.activeFrame}`}
                          style={{
                            background: "rgba(226, 91, 28, 0.3)",
                            border: "none",
                            color: "#ff955c",
                            fontSize: "9px",
                            fontWeight: "bold",
                            cursor: "pointer",
                            padding: "1px 6px",
                            borderRadius: "3px",
                          }}
                        >
                          📥 Paste f:{copiedKeyframe.sourceFrame} here
                        </button>
                      </div>
                    )}

                    <div
                      style={{
                        width: "9px",
                        height: "9px",
                        background: "transparent",
                        border: "2px solid #4DA3FF", // electric blue
                        transform: "rotate(45deg)",
                        boxShadow: "0 0 10px rgba(77, 163, 255, 0.9)",
                      }}
                      title={`Active Playhead at frame ${values.activeFrame} (Not Keyframed)`}
                    />
                    <span
                      style={{
                        position: "absolute",
                        bottom: "2px",
                        fontSize: "8px",
                        fontFamily: "monospace",
                        fontWeight: "bold",
                        color: "#4DA3FF",
                        userSelect: "none",
                        whiteSpace: "nowrap",
                        textShadow: "0 0 4px rgba(77,163,255,0.8)",
                      }}
                    >
                      f:{values.activeFrame}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Code exporter */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div
                onClick={() => setShowCode(!showCode)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  cursor: "pointer",
                  color: "#a1a1a6",
                  marginBottom: "4px",
                  alignSelf: "flex-start",
                }}
              >
                <span>{showCode ? "▼" : "▶"} Export Active Frame JS Configuration</span>
              </div>

              {showCode && (
                <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                  <pre
                    style={{
                      flex: 1,
                      background: "rgba(0,0,0,0.4)",
                      padding: "8px 12px",
                      borderRadius: "4px",
                      border: "1px solid rgba(255,255,255,0.06)",
                      fontSize: "10px",
                      color: "#9ad6ff",
                      whiteSpace: "pre-wrap",
                      margin: 0,
                      maxHeight: "80px",
                      overflowY: "auto",
                    }}
                  >
                    {codeSnippet}
                  </pre>
                  <button
                    onClick={copyToClipboard}
                    style={{
                      background: "rgba(77, 163, 255, 0.15)",
                      border: "1px solid rgba(77, 163, 255, 0.3)",
                      borderRadius: "4px",
                      padding: "6px 12px",
                      color: "#9ad6ff",
                      cursor: "pointer",
                      fontSize: "10px",
                      fontWeight: "bold",
                    }}
                  >
                    COPY CODE
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    )}

    {/* Saved Timelines / Version Control Modal (Portaled to document.body so backdrop-filter on the timeline bar doesn't trap or black out the modal) */}
    {showVersions && typeof document !== "undefined" && createPortal(
      <div
        className="timeline-version-modal"
        onClick={() => setShowVersions(false)}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: "100vw",
          height: "100vh",
          background: "rgba(0, 0, 0, 0.75)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          zIndex: 9999999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "16px",
          boxSizing: "border-box",
          cursor: "default",
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            width: "100%",
            maxWidth: "560px",
            maxHeight: "85vh",
            background: "rgba(18, 18, 22, 0.98)",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            borderRadius: "12px",
            boxShadow: "0 24px 64px rgba(0, 0, 0, 0.85)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            color: "#fff",
            fontFamily: "system-ui, -apple-system, sans-serif",
            cursor: "default",
          }}
        >
          {/* Modal Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 18px",
              borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
              background: "rgba(255, 255, 255, 0.03)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "16px" }}>📂</span>
              <span style={{ fontWeight: 700, fontSize: "14px", letterSpacing: "0.5px" }}>
                TIMELINE VERSION CONTROL
              </span>
              <span
                style={{
                  background: "rgba(77, 163, 255, 0.2)",
                  color: "#4DA3FF",
                  borderRadius: "12px",
                  padding: "2px 8px",
                  fontSize: "11px",
                  fontWeight: "bold",
                }}
              >
                {savedVersions?.length || 0} {(savedVersions?.length === 1) ? "version" : "versions"}
              </span>
            </div>
            <button
              onClick={() => setShowVersions(false)}
              style={{
                background: "transparent",
                border: "none",
                color: "#8e8e93",
                fontSize: "18px",
                cursor: "pointer",
                padding: "4px 8px",
                borderRadius: "4px",
              }}
              title="Close"
            >
              ✕
            </button>
          </div>

          {/* Action Toolbar */}
          <div
            style={{
              display: "flex",
              gap: "8px",
              padding: "10px 18px",
              background: "rgba(255, 255, 255, 0.02)",
              borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
              alignItems: "center",
            }}
          >
            <button
              onClick={handleSaveTimelineToCode}
              style={{
                background: "rgba(226, 91, 28, 0.25)",
                border: "1px solid #E25B1C",
                color: "#ff7b39",
                padding: "6px 12px",
                borderRadius: "6px",
                fontSize: "11px",
                fontWeight: "bold",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              💾 Save Current As New Version
            </button>
            <button
              onClick={handleOpenImportModal}
              style={{
                background: "rgba(77, 163, 255, 0.2)",
                border: "1px solid rgba(77, 163, 255, 0.5)",
                color: "#4DA3FF",
                padding: "6px 14px",
                borderRadius: "6px",
                fontSize: "11px",
                fontWeight: "bold",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
              title="Upload file or paste JSON/JS timeline code"
            >
              📥 Import JSON / File
            </button>
          </div>

          {/* Version List */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "14px 18px",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            {(!savedVersions || savedVersions.length === 0) ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "40px 16px",
                  color: "#6e6e73",
                  fontSize: "12px",
                }}
              >
                <p style={{ fontSize: "28px", margin: "0 0 10px" }}>📭</p>
                <p style={{ fontWeight: 600, color: "#aaa", margin: "0 0 4px" }}>
                  No Saved Timeline Versions Yet
                </p>
                <p style={{ margin: 0 }}>
                  Click "Save Current As New Version" above to name and record your current timeline.
                </p>
              </div>
            ) : (
              savedVersions.filter(Boolean).map((ver, idx) => (
                <div
                  key={ver.id || idx}
                  style={{
                    background: "rgba(255, 255, 255, 0.04)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "8px",
                    padding: "12px 14px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: "13px",
                          color: "#fff",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {ver.name || "Untitled"}
                      </span>
                      <span
                        style={{
                          fontSize: "9px",
                          fontWeight: "bold",
                          textTransform: "uppercase",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          background: ver.target === "mobile" ? "rgba(52, 199, 89, 0.2)" : "rgba(226, 91, 28, 0.2)",
                          color: ver.target === "mobile" ? "#34c759" : "#ff7b39",
                          border: ver.target === "mobile" ? "1px solid rgba(52, 199, 89, 0.4)" : "1px solid rgba(226, 91, 28, 0.4)",
                        }}
                      >
                        {ver.target || "desktop"}
                      </span>
                    </div>
                    <div style={{ fontSize: "10px", color: "#8e8e93", display: "flex", gap: "10px" }}>
                      <span>⏱️ {ver.keyframeCount ?? ver.beats?.length ?? 0} keyframes</span>
                      <span>📅 {ver.date || "Saved"}</span>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <button
                      onClick={() => handleLoadVersion(ver)}
                      style={{
                        background: "rgba(52, 199, 89, 0.2)",
                        border: "1px solid #34c759",
                        color: "#34c759",
                        padding: "6px 12px",
                        borderRadius: "6px",
                        fontSize: "11px",
                        fontWeight: "bold",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                      title="Load this timeline version into scene"
                    >
                      ⚡ LOAD
                    </button>
                    <button
                      onClick={(e) => handleExportVersion(ver, e)}
                      style={{
                        background: "rgba(255, 255, 255, 0.08)",
                        border: "1px solid rgba(255, 255, 255, 0.15)",
                        color: "#aaa",
                        padding: "6px 8px",
                        borderRadius: "6px",
                        fontSize: "11px",
                        cursor: "pointer",
                      }}
                      title="Copy JSON to clipboard"
                    >
                      📋
                    </button>
                    <button
                      onClick={(e) => handleDownloadVersion(ver, e)}
                      style={{
                        background: "rgba(255, 255, 255, 0.08)",
                        border: "1px solid rgba(255, 255, 255, 0.15)",
                        color: "#aaa",
                        padding: "6px 8px",
                        borderRadius: "6px",
                        fontSize: "11px",
                        cursor: "pointer",
                      }}
                      title="Download timeline as .json file"
                    >
                      💾
                    </button>
                    <button
                      onClick={(e) => handleDeleteVersion(ver.id, e)}
                      style={{
                        background: "rgba(255, 69, 58, 0.15)",
                        border: "1px solid rgba(255, 69, 58, 0.35)",
                        color: "#ff453a",
                        padding: "6px 8px",
                        borderRadius: "6px",
                        fontSize: "11px",
                        cursor: "pointer",
                      }}
                      title="Delete version"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>,
      document.body
    )}

    {/* Dedicated Timeline Import Modal (Portaled to document.body) */}
    {showImportModal && typeof document !== "undefined" && createPortal(
      <div
        className="timeline-version-modal"
        onClick={() => setShowImportModal(false)}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: "100vw",
          height: "100vh",
          background: "rgba(0, 0, 0, 0.8)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          zIndex: 99999999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "16px",
          boxSizing: "border-box",
          cursor: "default",
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            width: "100%",
            maxWidth: "620px",
            maxHeight: "90vh",
            background: "rgba(18, 18, 22, 0.98)",
            border: "1px solid rgba(255, 255, 255, 0.16)",
            borderRadius: "14px",
            boxShadow: "0 28px 70px rgba(0, 0, 0, 0.9)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            color: "#fff",
            fontFamily: "system-ui, -apple-system, sans-serif",
            cursor: "default",
          }}
        >
          {/* Modal Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 20px",
              borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
              background: "rgba(255, 255, 255, 0.03)",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "18px" }}>📥</span>
                <span style={{ fontWeight: 700, fontSize: "14px", letterSpacing: "0.5px" }}>
                  IMPORT TIMELINE
                </span>
              </div>
              <p style={{ margin: "3px 0 0", fontSize: "11px", color: "#8e8e93" }}>
                Upload a .json / .js / .txt file or paste raw keyframe code below
              </p>
            </div>
            <button
              onClick={() => setShowImportModal(false)}
              style={{
                background: "transparent",
                border: "none",
                color: "#8e8e93",
                fontSize: "18px",
                cursor: "pointer",
                padding: "4px 8px",
                borderRadius: "4px",
              }}
              title="Close"
            >
              ✕
            </button>
          </div>

          {/* Modal Body */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "18px 20px",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
            }}
          >
            {/* File Drag and Drop Box */}
            <input
              type="file"
              ref={fileInputRef}
              accept=".json,.js,.txt"
              style={{ display: "none" }}
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  handleFileChosen(e.target.files[0]);
                }
              }}
            />
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingFile(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsDraggingFile(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setIsDraggingFile(false);
                if (e.dataTransfer.files?.[0]) {
                  handleFileChosen(e.dataTransfer.files[0]);
                }
              }}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: isDraggingFile ? "2px dashed #4DA3FF" : "2px dashed rgba(255, 255, 255, 0.2)",
                background: isDraggingFile ? "rgba(77, 163, 255, 0.12)" : "rgba(255, 255, 255, 0.02)",
                borderRadius: "10px",
                padding: "18px 16px",
                textAlign: "center",
                cursor: "pointer",
                transition: "all 0.18s ease",
              }}
            >
              <div style={{ fontSize: "28px", marginBottom: "6px" }}>📁</div>
              <div style={{ fontSize: "12px", fontWeight: 600, color: "#eee" }}>
                Drag & drop a <span style={{ color: "#4DA3FF" }}>.json</span>, <span style={{ color: "#4DA3FF" }}>.js</span>, or <span style={{ color: "#4DA3FF" }}>.txt</span> file here
              </div>
              <div style={{ fontSize: "11px", color: "#8e8e93", marginTop: "4px" }}>
                or click to browse from your computer
              </div>
            </div>

            {/* Paste Code / JSON Area */}
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "6px",
                }}
              >
                <label style={{ fontSize: "11px", fontWeight: 700, color: "#ccc", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Or Paste JSON / JavaScript Code:
                </label>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const text = await navigator.clipboard.readText();
                      if (text) handleTextChange(text);
                    } catch (err) {
                      alert("Clipboard read permission denied. Please press Ctrl+V inside the text area.");
                    }
                  }}
                  style={{
                    background: "rgba(255, 255, 255, 0.08)",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    borderRadius: "4px",
                    color: "#ddd",
                    padding: "3px 8px",
                    fontSize: "10px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  📋 Paste from Clipboard
                </button>
              </div>
              <textarea
                value={importText}
                onChange={(e) => handleTextChange(e.target.value)}
                placeholder={'Paste here: e.g. [{"frame": 0, "camPos": ...}], or version export JSON, or RingHero.jsx code ("export const BEATS = [...]")'}
                rows={6}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  background: "rgba(0, 0, 0, 0.55)",
                  border: parsedPreview
                    ? "1px solid rgba(52, 199, 89, 0.5)"
                    : importError
                    ? "1px solid rgba(255, 69, 58, 0.5)"
                    : "1px solid rgba(255, 255, 255, 0.15)",
                  borderRadius: "8px",
                  color: "#e2e8f0",
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                  fontSize: "11px",
                  lineHeight: "1.4",
                  padding: "10px 12px",
                  resize: "vertical",
                  outline: "none",
                }}
              />
            </div>

            {/* Feedback / Validation Status */}
            {parsedPreview && (
              <div
                style={{
                  background: "rgba(52, 199, 89, 0.12)",
                  border: "1px solid rgba(52, 199, 89, 0.35)",
                  borderRadius: "8px",
                  padding: "10px 14px",
                  fontSize: "11px",
                  color: "#d1fae5",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 700, color: "#34c759", marginBottom: "4px" }}>
                  <span>✅</span>
                  <span>Successfully detected {parsedPreview.beats.length} keyframes!</span>
                </div>
                <div style={{ color: "#a7f3d0", fontSize: "10px", display: "flex", flexWrap: "wrap", gap: "4px", alignItems: "center" }}>
                  <span style={{ fontWeight: 600 }}>Frames:</span>
                  {parsedPreview.beats.slice(0, 16).map((b, i) => (
                    <span
                      key={i}
                      style={{
                        background: "rgba(52, 199, 89, 0.2)",
                        padding: "1px 5px",
                        borderRadius: "3px",
                      }}
                    >
                      {b.frame}
                    </span>
                  ))}
                  {parsedPreview.beats.length > 16 && (
                    <span style={{ opacity: 0.75 }}>+{parsedPreview.beats.length - 16} more</span>
                  )}
                </div>
              </div>
            )}

            {importError && (
              <div
                style={{
                  background: "rgba(255, 69, 58, 0.12)",
                  border: "1px solid rgba(255, 69, 58, 0.35)",
                  borderRadius: "8px",
                  padding: "10px 14px",
                  fontSize: "11px",
                  color: "#fca5a5",
                  lineHeight: "1.4",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 700, color: "#ff453a", marginBottom: "2px" }}>
                  <span>⚠️</span>
                  <span>Import Parsing Issue</span>
                </div>
                <div>{importError}</div>
              </div>
            )}

            {/* Version Metadata Options (Name & Target) */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 140px",
                gap: "12px",
                background: "rgba(255, 255, 255, 0.02)",
                padding: "10px 12px",
                borderRadius: "8px",
                border: "1px solid rgba(255, 255, 255, 0.06)",
              }}
            >
              <div>
                <label style={{ display: "block", fontSize: "10px", fontWeight: 700, color: "#aaa", marginBottom: "4px", textTransform: "uppercase" }}>
                  Version Name
                </label>
                <input
                  type="text"
                  value={importName}
                  onChange={(e) => setImportName(e.target.value)}
                  placeholder="e.g. Final Desktop 2.0"
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    background: "rgba(0, 0, 0, 0.4)",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    borderRadius: "6px",
                    color: "#fff",
                    fontSize: "11px",
                    padding: "6px 8px",
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "10px", fontWeight: 700, color: "#aaa", marginBottom: "4px", textTransform: "uppercase" }}>
                  Timeline Target
                </label>
                <select
                  value={importTarget}
                  onChange={(e) => setImportTarget(e.target.value)}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    background: "rgba(0, 0, 0, 0.4)",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    borderRadius: "6px",
                    color: "#fff",
                    fontSize: "11px",
                    padding: "6px 8px",
                    outline: "none",
                  }}
                >
                  <option value="desktop">Desktop</option>
                  <option value="mobile">Mobile</option>
                </select>
              </div>
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div
            style={{
              padding: "14px 20px",
              borderTop: "1px solid rgba(255, 255, 255, 0.1)",
              background: "rgba(255, 255, 255, 0.02)",
              display: "flex",
              justifyContent: "flex-end",
              gap: "10px",
              alignItems: "center",
            }}
          >
            <button
              onClick={() => setShowImportModal(false)}
              style={{
                background: "transparent",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                color: "#ccc",
                borderRadius: "6px",
                padding: "8px 14px",
                fontSize: "11px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>

            <button
              disabled={!parsedPreview}
              onClick={() => handleExecuteImport(false)}
              style={{
                background: parsedPreview ? "rgba(255, 255, 255, 0.1)" : "rgba(255, 255, 255, 0.03)",
                border: parsedPreview ? "1px solid rgba(255, 255, 255, 0.25)" : "1px solid rgba(255, 255, 255, 0.08)",
                color: parsedPreview ? "#eee" : "#666",
                borderRadius: "6px",
                padding: "8px 14px",
                fontSize: "11px",
                fontWeight: 600,
                cursor: parsedPreview ? "pointer" : "not-allowed",
              }}
            >
              Save to Version Control
            </button>

            <button
              disabled={!parsedPreview}
              onClick={() => handleExecuteImport(true)}
              style={{
                background: parsedPreview ? "#E25B1C" : "rgba(226, 91, 28, 0.2)",
                border: parsedPreview ? "1px solid #ff7b39" : "1px solid rgba(226, 91, 28, 0.3)",
                color: parsedPreview ? "#fff" : "#888",
                borderRadius: "6px",
                padding: "8px 16px",
                fontSize: "11px",
                fontWeight: 700,
                cursor: parsedPreview ? "pointer" : "not-allowed",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                boxShadow: parsedPreview ? "0 4px 14px rgba(226, 91, 28, 0.4)" : "none",
              }}
            >
              ⚡ Import & Load into Scene
            </button>
          </div>
        </div>
      </div>,
      document.body
    )}
    {/* Right-click Context Menu (Portaled to document.body so coordinates are viewport-accurate) */}
    {contextMenu && typeof document !== "undefined" && createPortal(
      <div
        className="timeline-context-menu"
        style={{
          position: "fixed",
          left: Math.min(contextMenu.x, window.innerWidth - 180),
          top: Math.min(contextMenu.y, window.innerHeight - 150),
          background: "rgba(18, 18, 22, 0.98)",
          border: "1px solid rgba(255,255,255,0.18)",
          borderRadius: "8px",
          boxShadow: "0 8px 28px rgba(0,0,0,0.85)",
          padding: "6px",
          zIndex: 9999999,
          display: "flex",
          flexDirection: "column",
          gap: "4px",
          minWidth: "170px",
          fontSize: "11px",
          fontFamily: "monospace",
          backdropFilter: "blur(12px)",
          cursor: "default",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: "4px 8px", color: "#888", fontSize: "10px", borderBottom: "1px solid rgba(255,255,255,0.08)", marginBottom: "2px" }}>
          Frame {contextMenu.frame} {contextMenu.isSaved ? "(Keyframed)" : ""}
        </div>
        {contextMenu.isSaved ? (
          <>
            <button
              onClick={() => {
                handleCopyKeyframe(contextMenu.frame);
                setContextMenu(null);
              }}
              style={contextMenuItemStyle}
            >
              📋 Copy Keyframe (f:{contextMenu.frame})
            </button>
            {copiedKeyframe && (
              <button
                onClick={() => {
                  handlePasteKeyframe(contextMenu.frame);
                  setContextMenu(null);
                }}
                style={{ ...contextMenuItemStyle, color: "#ff955c" }}
              >
                📥 Paste (f:{copiedKeyframe.sourceFrame} → f:{contextMenu.frame})
              </button>
            )}
            <button
              onClick={() => {
                poseApiRef?.current?.clearKeyframe?.(contextMenu.frame, timelineTarget);
                setContextMenu(null);
              }}
              style={{ ...contextMenuItemStyle, color: "#ff453a" }}
            >
              ✕ Delete Keyframe (f:{contextMenu.frame})
            </button>
          </>
        ) : (
          <>
            {copiedKeyframe && (
              <button
                onClick={() => {
                  handlePasteKeyframe(contextMenu.frame);
                  setContextMenu(null);
                }}
                style={{ ...contextMenuItemStyle, color: "#ff955c", fontWeight: "bold" }}
              >
                📥 Paste Keyframe (f:{copiedKeyframe.sourceFrame} here)
              </button>
            )}
            <button
              onClick={() => {
                onSelectBeat?.(contextMenu.frame);
                onSave?.();
                setContextMenu(null);
              }}
              style={contextMenuItemStyle}
            >
              ◆ Record Keyframe at f:{contextMenu.frame}
            </button>
          </>
        )}
        <button
          onClick={() => {
            onSelectBeat?.(contextMenu.frame);
            setContextMenu(null);
          }}
          style={{ ...contextMenuItemStyle, color: "#9ad6ff" }}
        >
          🎯 Jump to Frame {contextMenu.frame}
        </button>
      </div>,
      document.body
    )}
  </div>
</>
  );
});

const contextMenuItemStyle = {
  background: "transparent",
  border: "none",
  color: "#eee",
  textAlign: "left",
  padding: "6px 8px",
  cursor: "pointer",
  borderRadius: "4px",
  fontSize: "10px",
  fontFamily: "monospace",
  display: "flex",
  alignItems: "center",
  gap: "6px",
  width: "100%",
  transition: "background 0.12s ease",
};

// Sidebar Parameters group block style
function ChannelGroup({ label, children }) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ marginBottom: "14px" }}>
      <div
        onClick={() => setOpen(!open)}
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontWeight: 600,
          color: "#eee",
          cursor: "pointer",
          marginBottom: "6px",
          userSelect: "none",
        }}
      >
        <span>{label}</span>
        <span style={{ fontSize: "9px", opacity: 0.5 }}>{open ? "▼" : "▶"}</span>
      </div>
      {open && <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>{children}</div>}
    </div>
  );
}

// Single channel row style (label, readout, slider)
function ChannelRow({ label, valKey, value, min, max, onChange, readoutRef, inputRef }) {
  const [localVal, setLocalVal] = useState(
    value !== undefined && value !== null ? Number(value).toFixed(2) : "0.00"
  );
  const isFocusedRef = useRef(false);

  useEffect(() => {
    if (!isFocusedRef.current && value !== undefined && value !== null) {
      setLocalVal(Number(value).toFixed(2));
    }
  }, [value]);

  const commitValue = (valStr) => {
    const num = parseFloat(valStr);
    if (!isNaN(num)) {
      onChange(valKey, num);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#a1a1a6" }}>
        <span style={{ fontSize: "11px", fontWeight: 500 }}>{label}</span>
        <input
          ref={readoutRef}
          type="number"
          step="0.01"
          value={localVal}
          onFocus={() => {
            isFocusedRef.current = true;
          }}
          onBlur={(e) => {
            isFocusedRef.current = false;
            commitValue(e.target.value);
            if (value !== undefined && value !== null) {
              setLocalVal(Number(value).toFixed(2));
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              commitValue(e.target.value);
              e.target.blur();
            }
          }}
          onChange={(e) => {
            const v = e.target.value;
            setLocalVal(v);
            const num = parseFloat(v);
            if (!isNaN(num)) {
              onChange(valKey, num);
            }
          }}
          style={{
            fontFamily: "monospace",
            color: "#4DA3FF",
            fontWeight: "bold",
            background: "rgba(0, 0, 0, 0.5)",
            border: "1px solid rgba(77, 163, 255, 0.4)",
            borderRadius: "4px",
            width: "68px",
            textAlign: "right",
            padding: "2px 6px",
            fontSize: "11px",
            outline: "none",
            boxShadow: "inset 0 1px 3px rgba(0,0,0,0.4)",
          }}
          title="Click to type exact numeric value"
        />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <input
          ref={inputRef}
          type="range"
          min={min}
          max={max}
          step={0.01}
          value={value}
          onChange={(e) => {
            const num = Number(e.target.value);
            setLocalVal(num.toFixed(2));
            onChange(valKey, num);
          }}
          style={{ flex: 1, accentColor: "#4DA3FF", height: "18px", touchAction: "none", cursor: "pointer" }}
        />
      </div>
    </div>
  );
}

const toolbarButtonStyle = {
  background: "rgba(255, 255, 255, 0.06)",
  border: "1px solid rgba(255, 255, 255, 0.15)",
  borderRadius: "4px",
  padding: "5px 8px",
  color: "#fff",
  fontSize: "10px",
  fontFamily: "monospace",
  cursor: "pointer",
  transition: "all 0.1s ease",
};

export default TimelineEditor;