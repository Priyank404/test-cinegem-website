import { useImperativeHandle, useRef, forwardRef, useState, useEffect } from "react";

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
}, ref) {
  const [collapsed, setCollapsed] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [autoKey, setAutoKey] = useState(true);
  const [showCode, setShowCode] = useState(false);
  const [position, setPosition] = useState("bottom"); // "bottom" | "top"

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
      el.textContent = typeof val === "number" ? val.toFixed(2) : val;
    }
    const inputEl = sliderInputsRef.current[key];
    if (inputEl && val !== undefined && val !== null) {
      inputEl.value = val;
    }
  };

  // Timeline play/pause auto-scrolling animation loop
  useEffect(() => {
    if (isPlaying) {
      // Turn off live override during playback so the animation plays smoothly
      if (values.live && onToggleLive) {
        onToggleLive(false);
      }

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
  }, [isPlaying, onJumpToProgress, values.live, onToggleLive]);

  // Handle timeline track scrubbing
  const handleTimelineScrub = (e) => {
    if (!timelineTrackRef.current || !onJumpToProgress) return;

    // Deactivate live override on scrub so the animation updates correctly
    if (values.live && onToggleLive) {
      onToggleLive(false);
    }

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

  const handleSaveTimelineToCode = async () => {
    const api = poseApiRef?.current;
    if (!api || !api.getFullTimeline) {
      alert("Timeline API not ready yet!");
      return;
    }
    try {
      const beats = api.getFullTimeline();
      const res = await fetch("/api/save-timeline", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ beats }),
      });
      const data = await res.json();
      if (data.success) {
        alert("Timeline changes successfully written directly into RingHero.jsx code!");
      } else {
        alert("Failed to save timeline: " + data.error);
      }
    } catch (err) {
      alert("Error saving timeline to code: " + err.message);
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

  return (
    <div
      data-lenis-prevent
      style={{
        position: "fixed",
        bottom: position === "bottom" ? 0 : "auto",
        top: position === "top" ? 0 : "auto",
        left: 0,
        right: 0,
        height: collapsed ? "32px" : "330px",
        background: "rgba(18, 18, 22, 0.96)",
        borderTop: position === "bottom" ? "1px solid rgba(255, 255, 255, 0.12)" : "none",
        borderBottom: position === "top" ? "1px solid rgba(255, 255, 255, 0.12)" : "none",
        color: "#d1d1d6",
        fontFamily: "'SF Mono', Monaco, Fira Code, monospace",
        fontSize: "11px",
        zIndex: 9999,
        backdropFilter: "blur(24px)",
        transition: "height 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)",
        display: "flex",
        flexDirection: "column",
        boxShadow: position === "bottom" ? "0 -8px 32px rgba(0, 0, 0, 0.5)" : "0 8px 32px rgba(0, 0, 0, 0.5)",
      }}
    >
      {/* Timeline Toggle Bar */}
      <div
        onClick={() => setCollapsed(!collapsed)}
        style={{
          height: "32px",
          minHeight: "32px",
          background: "rgba(30, 30, 35, 0.6)",
          borderBottom: collapsed ? "none" : "1px solid rgba(255, 255, 255, 0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ color: "#E25B1C", fontWeight: "bold" }}>●</span>
          <span style={{ fontWeight: 600, letterSpacing: "1px", textTransform: "uppercase", fontSize: "10px", color: "#eee" }}>
            3D Animation Timeline & Channel Box
          </span>
          <span
            ref={beatTextRef}
            style={{
              background: "rgba(255, 255, 255, 0.06)",
              padding: "2px 6px",
              borderRadius: "4px",
              fontSize: "10px",
              color: "#a1a1a6",
              marginLeft: "12px",
            }}
          >
            Frame 0 | Beat 1 (0%)
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setPosition(position === "bottom" ? "top" : "bottom");
            }}
            style={{
              background: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              borderRadius: "4px",
              padding: "2px 8px",
              color: "#fff",
              fontSize: "10px",
              cursor: "pointer",
              fontFamily: "'SF Mono', Monaco, Fira Code, monospace",
            }}
          >
            {position === "bottom" ? "⇅ Move to Top" : "⇅ Move to Bottom"}
          </button>
          <span ref={frameTextRef} style={{ color: "#4DA3FF", fontWeight: "bold" }}>f: 0</span>
          <span ref={progressTextRef} style={{ color: "#999" }}>0.0%</span>
          <span style={{ color: "#777", fontSize: "12px" }}>{collapsed ? "▲ Expand" : "▼ Collapse"}</span>
        </div>
      </div>

      {!collapsed && (
        <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>
          {/* LEFT SIDEBAR - Channel Inspector (Parameters) */}
          <div
            style={{
              width: "360px",
              borderRight: "1px solid rgba(255, 255, 255, 0.08)",
              background: "rgba(14, 14, 16, 0.5)",
              display: "flex",
              flexDirection: "column",
              overflowY: "auto",
              padding: "12px",
            }}
          >
            <div style={{ fontWeight: "bold", textTransform: "uppercase", fontSize: "10px", color: "#8e8e93", marginBottom: "8px", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "4px" }}>
              Channels & Properties
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

          {/* RIGHT MAIN SECTION - Timeline, Transport & Keyframes */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "12px", overflow: "hidden" }}>
            {/* Top Toolbar */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px", gap: "10px" }}>
              {/* Transport buttons */}
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
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
                    const prev = sorted.reverse().find((f) => f < values.activeFrame);
                    if (prev !== undefined) onSelectBeat(prev);
                    else onSelectBeat(0);
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
                    else onSelectBeat(150);
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

                <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={values.live}
                    onChange={(e) => onToggleLive(e.target.checked)}
                    style={{ accentColor: "#4DA3FF" }}
                  />
                  <span style={{ color: values.live ? "#4DA3FF" : "#aaa", fontSize: "10px" }}>LIVE OVERRIDE</span>
                </label>
              </div>

              {/* Keyframe Operations */}
              <div style={{ display: "flex", gap: "6px" }}>
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
                <button
                  onClick={handleSaveTimelineToCode}
                  style={{
                    background: "rgba(226, 91, 28, 0.2)",
                    border: "1px solid rgba(226, 91, 28, 0.4)",
                    borderRadius: "4px",
                    padding: "4px 10px",
                    color: "#ff7b39",
                    cursor: "pointer",
                    fontSize: "10px",
                    fontWeight: "bold",
                  }}
                  title="Write all timeline keyframes and settings directly into the RingHero.jsx file"
                >
                  💾 SAVE TIMELINE
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
                style={{
                  height: "36px",
                  position: "relative",
                  background: "rgba(20, 20, 25, 0.4)",
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

                {/* 1. Guide markers evenly spaced across totalFrames */}
                {Array.from({ length: 7 }, (_, i) => Math.round((i / 6) * totalFrames)).map((f) => {
                  const isCurrent = values.activeFrame === f;
                  return (
                    <div
                      key={`guide-${f}`}
                      onClick={() => onSelectBeat(f)}
                      style={{
                        position: "absolute",
                        left: `${(f / totalFrames) * 100}%`,
                        top: "50%",
                        transform: "translate(-50%, -50%)",
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        background: "rgba(255, 255, 255, 0.25)",
                        border: isCurrent ? "1px solid #4DA3FF" : "none",
                        cursor: "pointer",
                      }}
                      title={`Frame ${f}`}
                    />
                  );
                })}

                {/* 2. Keyframe Diamonds for every saved frame */}
                {Array.from(savedBeats || []).map((frame) => {
                  const isCurrent = values.activeFrame === frame;
                  return (
                    <button
                      key={`kf-${frame}`}
                      onMouseDown={(e) => handleKeyframeMouseDown(e, frame)}
                      title={`Keyframe at frame ${frame} (Drag to move)`}
                      style={{
                        position: "absolute",
                        left: `${(frame / totalFrames) * 100}%`,
                        top: "50%",
                        transform: "translate(-50%, -50%) rotate(45deg)",
                        width: isCurrent ? "11px" : "8px",
                        height: isCurrent ? "11px" : "8px",
                        background: "#39FF14", // neon green
                        border: isCurrent ? "1.5px solid #fff" : "1px solid rgba(0,0,0,0.5)",
                        cursor: "pointer",
                        zIndex: isCurrent ? 12 : 8,
                        boxShadow: isCurrent ? "0 0 12px rgba(57, 255, 20, 1)" : "0 0 8px rgba(57, 255, 20, 0.7)",
                        padding: 0,
                        transition: "all 0.15s ease",
                      }}
                    />
                  );
                })}

                {/* 3. Blue marker if current active frame does not have a keyframe */}
                {!savedBeats?.has(values.activeFrame) && (
                  <div
                    style={{
                      position: "absolute",
                      left: `${(values.activeFrame / totalFrames) * 100}%`,
                      top: "50%",
                      transform: "translate(-50%, -50%) rotate(45deg)",
                      width: "8px",
                      height: "8px",
                      background: "transparent",
                      border: "2px solid #4DA3FF", // electric blue
                      boxShadow: "0 0 8px rgba(77, 163, 255, 0.8)",
                      pointerEvents: "none",
                      zIndex: 10,
                    }}
                  />
                )}

                {/* Beat Labels */}
                {Array.from({ length: 7 }, (_, i) => Math.round((i / 6) * totalFrames)).map((f, i) => (
                  <div
                    key={`lbl-${i}`}
                    onClick={() => onSelectBeat(f)}
                    style={{
                      position: "absolute",
                      left: `${(f / totalFrames) * 100}%`,
                      bottom: "2px",
                      transform: "translateX(-50%)",
                      fontSize: "8px",
                      color: values.activeFrame === f ? "#fff" : "rgba(255, 255, 255, 0.3)",
                      fontWeight: values.activeFrame === f ? "bold" : "normal",
                      cursor: "pointer",
                    }}
                  >
                    f:{f}
                  </div>
                ))}
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
        </div>
      )}
    </div>
  );
});

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
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", color: "#a1a1a6" }}>
        <span>{label}</span>
        <span
          ref={readoutRef}
          style={{ fontFamily: "monospace", color: "#4DA3FF", fontWeight: "bold" }}
        >
          {value.toFixed(2)}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <input
          ref={inputRef}
          type="range"
          min={min}
          max={max}
          step={0.01}
          value={value}
          onChange={(e) => onChange(valKey, Number(e.target.value))}
          style={{ flex: 1, accentColor: "#4DA3FF", height: "4px", background: "#333", borderRadius: "2px" }}
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