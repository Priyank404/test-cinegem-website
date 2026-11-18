/**
 * ringBeats.js
 * -------------------------------------------------------------------------
 * Pure-data timeline beats and responsive configurations for Cinegem Ring.
 * Decoupled from Three.js so HomePage and dev editors do not pull the 3D
 * bundle during critical first-render evaluation.
 * -------------------------------------------------------------------------
 */

// ── Rollback flag for responsive v2 architecture ─────────────────────────
// Set to true for Phase 1+; rollback to false restores 100% legacy behavior.
export const RESPONSIVE_V2 = true;


// Scroll "beats" — camera + rotation. Material intensities live per-material
// below and are tweened separately so gem and metal can react differently.
//
// 6-beat storyboard:
//   1. Idle ring — no change from load.
//   2. Corner park — cinematic camera move (arc + push-in) carries the
//      ring from its idle hero pose down into the bottom-right corner
//      of the frame, where it stays parked, small, for the rest of the
//      beat.
//   3. A plain camera/ring pose beat.
//   4. Another plain camera/ring pose beat (previously the hand/on-body
//      reveal beat — that logic has been removed; this is now a normal
//      pose target like every other beat).
//   5. Ring returns to center — same camera/pose as Beat 1, giving a
//      "return to home" moment before the closing spin.
//   6. Standing spin — single ring, full 360° turn to close.
//
// Every beat is just camPos/ringRot/ringPosOffset/ringScale (plus
// cornerPark for beat 2's special corner move) — no hand or floor
// geometry involved anymore. The dev "beat coordinate" panel drives
// every beat identically via poseOverrideRef, read every tick below.
export const BEATS = [
  {
    // Keyframe at frame 0
    frame: 0,
    bgTop: "#0d0d10",
    bgBottom: "#1a1a1f",
    camPos: { x: 0.00, y: 0.20, z: 4.20, lookAtY: 0.00 },
    ringRot: { x: 1.20, y: -6.30, z: 0.00 },
    metalEnvIntensity: 4.00,
    gemEnvIntensity: 1.20,
    cornerPark: 0.00,
    ringPosOffset: { x: 0.00, y: 0.00, z: 0.00 },
    ringScale: 1.00
  },
  {
    // Keyframe at frame 44
    frame: 44,
    bgTop: "#0d0d10",
    bgBottom: "#1a1a1f",
    camPos: { x: 0.00, y: 0.06, z: 3.48, lookAtY: 0.00 },
    ringRot: { x: 0.50, y: 0.10, z: 0.70 },
    metalEnvIntensity: 8.00,
    gemEnvIntensity: 2.00,
    cornerPark: 1.00,
    ringPosOffset: { x: 0.90, y: -0.10, z: 0.50 },
    ringScale: 0.85
  },
  {
    // Keyframe at frame 52
    frame: 52,
    bgTop: "#0d0d10",
    bgBottom: "#1a1a1f",
    camPos: { x: 0.00, y: 0.06, z: 3.48, lookAtY: 0.00 },
    ringRot: { x: 0.50, y: 0.10, z: 0.70 },
    metalEnvIntensity: 8.00,
    gemEnvIntensity: 2.00,
    cornerPark: 1.00,
    ringPosOffset: { x: 0.90, y: -0.10, z: 0.50 },
    ringScale: 0.85
  },
  {
    // Keyframe at frame 63
    frame: 63,
    bgTop: "#0d0d10",
    bgBottom: "#1a1a1f",
    camPos: { x: 0.00, y: 0.77, z: 8.00, lookAtY: 0.00 },
    ringRot: { x: 0.00, y: -6.30, z: 0.00 },
    metalEnvIntensity: 8.00,
    gemEnvIntensity: 2.00,
    cornerPark: 1.00,
    ringPosOffset: { x: -0.29, y: 0.68, z: 1.34 },
    ringScale: 0.85
  },
  {
    // Keyframe at frame 83
    frame: 83,
    bgTop: "#0d0d10",
    bgBottom: "#1a1a1f",
    camPos: { x: 0.03, y: 0.00, z: 3.48, lookAtY: 0.00 },
    ringRot: { x: -0.89, y: -12.71, z: -0.47 },
    metalEnvIntensity: 8.00,
    gemEnvIntensity: 2.00,
    cornerPark: 1.00,
    ringPosOffset: { x: -1.26, y: -0.13, z: 0.92 },
    ringScale: 0.83
  },
  {
    // Keyframe at frame 105
    frame: 105,
    bgTop: "#0d0d10",
    bgBottom: "#1a1a1f",
    camPos: { x: 0.03, y: 0.00, z: 3.48, lookAtY: 0.00 },
    ringRot: { x: -0.89, y: -12.71, z: -0.47 },
    metalEnvIntensity: 8.00,
    gemEnvIntensity: 2.00,
    cornerPark: 1.00,
    ringPosOffset: { x: -1.26, y: -0.13, z: 0.92 },
    ringScale: 0.83
  },
  {
    // Keyframe at frame 113
    frame: 113,
    bgTop: "#0d0d10",
    bgBottom: "#1a1a1f",
    camPos: { x: 0.00, y: 0.77, z: 8.00, lookAtY: 0.00 },
    ringRot: { x: 0.00, y: -4.78, z: 0.00 },
    metalEnvIntensity: 8.00,
    gemEnvIntensity: 2.00,
    cornerPark: 1.00,
    ringPosOffset: { x: -0.18, y: 0.68, z: 0.00 },
    ringScale: 0.85
  },
  {
    // Keyframe at frame 131
    frame: 131,
    bgTop: "#0d0d10",
    bgBottom: "#19191e",
    camPos: { x: 0.00, y: 0.77, z: 8.00, lookAtY: 0.00 },
    ringRot: { x: 1.06, y: -2.94, z: -0.09 },
    metalEnvIntensity: 7.84,
    gemEnvIntensity: 1.97,
    cornerPark: 0.99,
    ringPosOffset: { x: -0.18, y: 0.68, z: 0.00 },
    ringScale: 0.38
  },
  {
    // Keyframe at frame 156
    frame: 156,
    bgTop: "#0d0d10",
    bgBottom: "#19191e",
    camPos: { x: 0.00, y: 0.77, z: 8.00, lookAtY: 0.00 },
    ringRot: { x: 1.06, y: -2.94, z: -0.09 },
    metalEnvIntensity: 7.84,
    gemEnvIntensity: 1.97,
    cornerPark: 0.99,
    ringPosOffset: { x: -0.18, y: 0.68, z: 0.00 },
    ringScale: 0.38
  },
  {
    // Keyframe at frame 214
    frame: 214,
    bgTop: "#0d0d10",
    bgBottom: "#19191e",
    camPos: { x: 0.00, y: 0.77, z: 8.00, lookAtY: 0.00 },
    ringRot: { x: 0.00, y: 4.84, z: 0.00 },
    metalEnvIntensity: 7.84,
    gemEnvIntensity: 1.97,
    cornerPark: 0.99,
    ringPosOffset: { x: -0.18, y: 0.21, z: 0.00 },
    ringScale: 1.44
  },
  {
    // Keyframe at frame 260
    frame: 260,
    bgTop: "#0d0d10",
    bgBottom: "#19191e",
    camPos: { x: 0.00, y: 0.77, z: 8.00, lookAtY: 0.00 },
    ringRot: { x: 0.00, y: 4.84, z: 0.00 },
    metalEnvIntensity: 7.84,
    gemEnvIntensity: 1.97,
    cornerPark: 0.99,
    ringPosOffset: { x: -0.18, y: 0.21, z: 0.00 },
    ringScale: 1.44
  }
];

// Helper function to clone a beats timeline array (so mobile timeline inherits directly from main timeline)
export function cloneBeatsTimeline(sourceBeats = BEATS) {
  return sourceBeats.map((beat) => ({
    ...beat,
    camPos: { ...beat.camPos },
    ringRot: { ...beat.ringRot },
    ringPosOffset: beat.ringPosOffset ? { ...beat.ringPosOffset } : { x: 0, y: 0, z: 0 },
  }));
}

/**
 * @deprecated (dev panel only)
 * Mobile Timeline — retained for dev-panel manual tuning only.
 * Production uses the single unified BEATS timeline retargeted via viewportProfile.
 */
export const MOBILE_BEATS = [
  {
    frame: 0,
    bgTop: "#0d0d10",
    bgBottom: "#1a1a1f",
    camPos: { x: 0.0, y: 0.2, z: 4.2, lookAtY: 0.0 },
    ringRot: { x: 1.2, y: -6.3, z: 0.0 },
    metalEnvIntensity: 4.0,
    gemEnvIntensity: 1.2,
    cornerPark: 0.0,
    ringPosOffset: { x: 0.0, y: 0.0, z: 0.0 },
    ringScale: 0.85,
  },
  {
    frame: 44,
    bgTop: "#0d0d10",
    bgBottom: "#1a1a1f",
    camPos: { x: 0.0, y: 0.06, z: 3.48, lookAtY: 0.0 },
    ringRot: { x: 0.3, y: -0.11, z: 0.87 },
    metalEnvIntensity: 8.0,
    gemEnvIntensity: 2.0,
    cornerPark: 1.0,
    ringPosOffset: { x: 0.72, y: -0.38, z: 0.42 },
    ringScale: 0.80,
  },
  {
    frame: 260,
    bgTop: "#101014",
    bgBottom: "#000000",
    camPos: { x: 0.0, y: 0.0, z: 3.4, lookAtY: 0.0 },
    ringRot: { x: 0.12, y: 6.28, z: 0.0 },
    metalEnvIntensity: 5.0,
    gemEnvIntensity: 1.4,
    cornerPark: 0.0,
    ringPosOffset: { x: 0.0, y: 0.0, z: 0.0 },
    ringScale: 0.90,
  },
];


