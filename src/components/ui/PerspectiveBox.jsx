import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useEffect,
  useCallback,
} from "react";
import "./perspective-box.css";

/**
 * PerspectiveBox
 *
 * Implements an enlarged, high-precision 3D perspective display showcase box for the
 * Interactive 3D Viewer section (Beat 5).
 *
 * Requirements:
 * 1. Clean presentation without text badges in the SVG.
 * 2. Enlarged dimensions matching the user's sketch:
 *    - Outer box comfortably spans the ring area up near the logo and down near controls.
 *    - Inner border ("inner liber") is generously scaled so the ENTIRE ring (including
 *      the top diamond crown, halo, shank, and sides) sits completely inside the aperture.
 *    - Stays completely within the inner border across ALL 360° interactive rotations
 *      and tilt angles during user interaction.
 * 3. 2-Direction SVG line draw from top-center on scroll (frame 206 -> 220), meeting at bottom-center.
 * 4. Perspective assembly (frame 220 -> 224) with decreased opacity on the inner border,
 *    4 corner depth lines plunging inward, and 4 trapezoidal wall gradients.
 * 5. Smooth mouse parallax with safe bounds, and zero-react-render 60/120 FPS performance.
 */

// Timing constants (Global frame scale matching HomePage.jsx)
const BOX_START_FRAME = 205.5;
const BOX_DRAW_COMPLETE_FRAME = 220; // Matches EXPLORE_LINK_GLOBAL_FRAME
const BOX_PERSPECTIVE_START_FRAME = 216;
const BOX_PERSPECTIVE_COMPLETE_FRAME = 220;
const BOX_EXIT_START_FRAME = 245; // Matches FOOTER_REVEAL_GLOBAL_START_FRAME
const BOX_EXIT_COMPLETE_FRAME = 249.5;

// Feature Flag: Desktop Dynamic Scaling Perspective Box
// Set to true for the synchronized growth & descent effect on desktop;
// toggling to false cleanly restores the standard late-entry box animation.
export const ENABLE_DESKTOP_DYNAMIC_GROWING_BOX = true;

// Desktop Animation Timing:
// Ring exits Beat 4 at frame 156-158 and flies forward into Beat 5 (frame 214).
// On desktop, the showcase box draws around the small ring from frame 158 -> 176.
// The moment the SVG line animation gets complete (frame 176), the gradient is fully applied
// and remains active as the box expands and descends into Beat 5.
const DESKTOP_BOX_START_FRAME = 158;
const DESKTOP_BOX_DRAW_COMPLETE_FRAME = 176;
const DESKTOP_BOX_PERSPECTIVE_START_FRAME = 172;
const DESKTOP_BOX_PERSPECTIVE_COMPLETE_FRAME = 176;
const DESKTOP_BOX_LAND_FRAME = 214;

const PerspectiveBox = forwardRef(function PerspectiveBox(_props, ref) {
  const containerRef = useRef(null);
  const svgRef = useRef(null);

  // DOM / SVG Refs for direct 60/120 FPS manipulation
  const bevelRef = useRef(null);
  const leftPathRef = useRef(null);
  const rightPathRef = useRef(null);

  // Parallax / Geometry State (persisted in refs to avoid React re-renders)
  const geomRef = useRef({
    winW: 0,
    winH: 0,
    isMobile: false,
    isPortrait: false,
    cx: 0,
    cy: 0,
    outerW: 680,
    outerH: 660,
    innerW: 510,
    innerH: 550,
    radiusOut: 34,
    radiusIn: 27,
    outerLeft: 0,
    outerRight: 0,
    outerTop: 0,
    outerBottom: 0,
    inLeft: 0,
    inRight: 0,
    inTop: 0,
    inBottom: 0,
    halfPerimeter: 1340,
    diagLength: 120,
  });

  const lastStateRef = useRef({
    frame: 0,
    drawT: 0,
    perspT: 0,
    exitT: 0,
    visible: false,
  });

  // Update SVG elements geometry coordinates — stationary, stable, zero cursor jitter
  const updateGeometryDOM = useCallback(() => {
    const geom = geomRef.current;
    if (!geom.outerW) return;

    const {
      cx,
      outerW,
      outerH,
      innerW,
      innerH,
      outerLeft: left,
      outerRight: right,
      outerTop: top,
      outerBottom: bottom,
      inLeft,
      inRight,
      inTop,
      inBottom,
      radiusOut: R_out = 34,
      radiusIn: R_in = 27,
      halfPerimeter,
      diagLength,
    } = geom;

    const perspT = lastStateRef.current.perspT || 0;
    const inCx = (inLeft + inRight) / 2;

    // Outer line drawing paths with rounded corners:
    // Left branch: top-center -> top-left curve -> down left -> bottom-left curve -> bottom-center
    // Right branch: top-center -> top-right curve -> down right -> bottom-right curve -> bottom-center
    const dLeft = [
      `M ${cx} ${top}`,
      `L ${left + R_out} ${top}`,
      `A ${R_out} ${R_out} 0 0 0 ${left} ${top + R_out}`,
      `L ${left} ${bottom - R_out}`,
      `A ${R_out} ${R_out} 0 0 0 ${left + R_out} ${bottom}`,
      `L ${cx} ${bottom}`,
    ].join(" ");

    const dRight = [
      `M ${cx} ${top}`,
      `L ${right - R_out} ${top}`,
      `A ${R_out} ${R_out} 0 0 1 ${right} ${top + R_out}`,
      `L ${right} ${bottom - R_out}`,
      `A ${R_out} ${R_out} 0 0 1 ${right - R_out} ${bottom}`,
      `L ${cx} ${bottom}`,
    ].join(" ");

    if (leftPathRef.current) {
      leftPathRef.current.setAttribute("d", dLeft);
    }
    if (rightPathRef.current) {
      rightPathRef.current.setAttribute("d", dRight);
    }

    // Measure exact sub-pixel path length using the browser's SVG engine
    let actualLength = halfPerimeter;
    if (leftPathRef.current?.getTotalLength) {
      const len = leftPathRef.current.getTotalLength();
      if (len > 0) actualLength = len;
    }
    geom.halfPerimeter = actualLength;

    if (leftPathRef.current) {
      leftPathRef.current.style.strokeDasharray = `${actualLength} ${actualLength}`;
    }
    if (rightPathRef.current) {
      rightPathRef.current.style.strokeDasharray = `${actualLength} ${actualLength}`;
    }

    // Position the seamless perspective bevel with matching outer bounds & border radius
    if (bevelRef.current) {
      bevelRef.current.style.left = `${left}px`;
      bevelRef.current.style.top = `${top}px`;
      bevelRef.current.style.width = `${outerW}px`;
      bevelRef.current.style.height = `${outerH}px`;
      bevelRef.current.style.borderRadius = `${R_out}px`;
    }
  }, []);

  // Calculate dynamic box dimensions based on extreme 360° ring envelope & UI obstacles
  const calculateGeometry = useCallback(() => {
    if (typeof window === "undefined") return;
    const winW = window.innerWidth;
    const winH = window.innerHeight;
    const aspect = winW / Math.max(1, winH);
    const isMobile = winW <= 640;
    const isPortrait = !isMobile && winW <= 1024 && aspect <= 1.25;
    // Dedicated Mac / Laptop tier (MacBook Pro 1440x900, MacBook Air 1280x800, laptops <= 1536px or height < 950px):
    const isMac = !isMobile && !isPortrait && (winW <= 1536 || winH < 950);
    // Dedicated Big Desktop tier (1920x1080, 2560x1440, large monitors with winW > 1536 and winH >= 950):
    const isDesktop = !isMobile && !isPortrait && !isMac;

    // ── 1. DETERMINISTIC BEAT 5 RING POSITION & DIMENSIONS ───────────────
    // In Beat 5 (Interactive 3D Viewer), the ring's resting position is horizontally
    // centered at cx = winW * 0.5 across all screen sizes.
    const ringCx = Math.round(winW * 0.5);

    // Exact vertical centroid (cy) corresponding directly to Three.js camera projection:
    let ringCy;
    if (isMobile) {
      ringCy = Math.round(winH * 0.638);
    } else if (isPortrait) {
      ringCy = Math.round(winH * 0.628);
    } else if (isMac) {
      ringCy = Math.round(winH * 0.5 + 40 - 0.005 * winH);
    } else {
      // Big Desktop (1080p, 1440p):
      ringCy = Math.round(winH * 0.5 + 40 - 0.005 * winH);
    }

    // ── 2. OUTER & INNER BOX FRAMING (Stationary, Centered on ringCx, ringCy) ──
    let halfOuterW, halfOuterH;
    let outerLeft, outerRight, outerTop, outerBottom;

    if (isMobile) {
      // Mobile (e.g. iPhone 375x667, 390x844, Android 412x915):
      // Calculate dynamic safe clearance below the top explore card:
      let cardBottom = 0;
      if (typeof document !== "undefined") {
        const cardEl = document.querySelector(".hero2-explore-link .glassy-title-card");
        if (cardEl) {
          const rect = cardEl.getBoundingClientRect();
          if (rect.bottom > 0) cardBottom = Math.round(rect.bottom);
        }
      }
      if (!cardBottom || cardBottom < 100) {
        const estCardTop = Math.max(104, Math.min(Math.round(winH * 0.125), 114));
        cardBottom = estCardTop + 160;
      }

      const minClearanceGap = 16; // luxury breathing clearance below top explore card
      const minSafeBoxTop = Math.round(cardBottom + minClearanceGap);

      halfOuterW = Math.min(Math.round((winW - 24) / 2), 190);

      const maxBottomAllowance = Math.round((winH - ringCy) - 48); // keep at least 48px clearance from viewport bottom
      const maxTopAllowance = Math.round(ringCy - minSafeBoxTop);
      const maxSafeHalfH = Math.min(maxTopAllowance, maxBottomAllowance);

      const desiredHalfH = Math.min(Math.round(winH * 0.26), 230);
      halfOuterH = Math.max(145, Math.min(desiredHalfH, maxSafeHalfH));

      // Guarantee outerTop is strictly >= minSafeBoxTop on all screens (prevents card intersection)
      if (ringCy - halfOuterH < minSafeBoxTop) {
        ringCy = minSafeBoxTop + halfOuterH;
      }

      outerLeft = Math.round(ringCx - halfOuterW);
      outerRight = Math.round(ringCx + halfOuterW);
      outerTop = Math.round(ringCy - halfOuterH);
      outerBottom = Math.round(ringCy + halfOuterH);
    } else if (isPortrait) {
      // Tablet portrait (e.g. iPad 768x1024):
      // Pure 1:1 square clearing both the top card and the bottom drag hint pill
      const halfSize = Math.min(Math.round((winW - 80) / 2), 270);
      halfOuterH = halfSize;
      halfOuterW = halfSize;
      outerLeft = Math.round(ringCx - halfOuterW);
      outerRight = Math.round(ringCx + halfOuterW);
      outerTop = Math.round(ringCy - halfOuterH);
      outerBottom = Math.round(ringCy + halfOuterH);
    } else if (isMac) {
      // Dedicated Mac / Laptop tier (1440x900, 1280x800):
      halfOuterH = Math.min(Math.round(winH * 0.344), 310);
      halfOuterW = Math.min(Math.round(winW * 0.225), 325);
      outerLeft = Math.round(ringCx - halfOuterW);
      outerRight = Math.round(ringCx + halfOuterW);
      outerTop = Math.round(ringCy - halfOuterH);
      outerBottom = Math.round(ringCy + halfOuterH);
    } else {
      // Dedicated Big Desktop tier (1920x1080, 2560x1440):
      // Pure 1:1 square box centered on the ring, clearing the top logo and bottom drag pill
      const maxTopClearance = ringCy - 134;
      const maxBottomClearance = (winH - 66) - ringCy;
      const halfSize = Math.floor(Math.min(maxTopClearance, maxBottomClearance, winH * 0.42));
      halfOuterH = halfSize;
      halfOuterW = halfSize;
      outerLeft = Math.round(ringCx - halfOuterW);
      outerRight = Math.round(ringCx + halfOuterW);
      outerTop = Math.round(ringCy - halfOuterH);
      outerBottom = Math.round(ringCy + halfOuterH);
    }

    const outerW = outerRight - outerLeft;
    const outerH = outerBottom - outerTop;
    const outerCx = ringCx;
    const outerCy = Math.round((outerTop + outerBottom) / 2);

    // ── 3. PROPORTIONAL INNER BOX (Harmonic 3D Perspective Depth & FOV) ────────
    const depthRatioX = 0.70;
    const depthRatioY = 0.72;

    let innerW = Math.round(outerW * depthRatioX);
    let innerH = Math.round(outerH * depthRatioY);

    // The inner box is strictly centered around (ringCx, ringCy) for 100% perspective symmetry:
    const inLeft = Math.round(ringCx - innerW / 2);
    const inRight = inLeft + innerW;
    const inTop = Math.round(ringCy - innerH / 2);
    const inBottom = inTop + innerH;

    // Derived geometry
    const finalOuterW = outerW;
    const finalOuterH = outerH;
    const finalInnerW = innerW;
    const finalInnerH = innerH;
    const cx = outerCx;
    const cy = outerCy;

    // Dedicated border radius per device tier for sleek, curved corners across all views
    const radiusOut = isMobile ? 22 : isPortrait ? 24 : isMac ? 28 : 34;
    const radiusIn = Math.max(8, Math.round(radiusOut * (innerW / outerW)));

    // Half perimeter of rounded rect with 2 quarter-circle corners:
    // (outerW + outerH) - (4 - PI) * radiusOut
    const halfPerimeter = Math.round(
      finalOuterW + finalOuterH - (4 - Math.PI) * radiusOut
    );

    // 45-degree corner offset (c = 1 - cos(45deg) = 1 - sqrt(2)/2)
    const c45 = 0.292893;
    const kOut = radiusOut * c45;
    const kIn = radiusIn * c45;

    const xOutTL = outerLeft + kOut;
    const yOutTL = outerTop + kOut;
    const xInTL = inLeft + kIn;
    const yInTL = inTop + kIn;

    const diagLength = Math.hypot(xOutTL - xInTL, yOutTL - yInTL) || 120;

    geomRef.current = {
      winW,
      winH,
      isMobile,
      isPortrait,
      isMac,
      isDesktop,
      cx,
      cy,
      outerW: finalOuterW,
      outerH: finalOuterH,
      innerW: finalInnerW,
      innerH: finalInnerH,
      radiusOut,
      radiusIn,
      outerLeft,
      outerRight,
      outerTop,
      outerBottom,
      inLeft,
      inRight,
      inTop,
      inBottom,
      halfPerimeter,
      diagLength,
    };

    // Keep the interaction hint button dynamically positioned inside the bottom of the box across all screen sizes
    if (typeof document !== "undefined") {
      const bottomOffset = Math.max(0, winH - outerBottom);
      const btnPad = isMobile ? 14 : isPortrait ? 18 : isMac ? 20 : 22;
      document.documentElement.style.setProperty(
        "--pbox-bottom-offset",
        `${bottomOffset}px`
      );
      document.documentElement.style.setProperty(
        "--pbox-btn-pad",
        `${btnPad}px`
      );
      document.documentElement.style.setProperty(
        "--pbox-outer-right",
        `${outerRight}px`
      );
      document.documentElement.style.setProperty(
        "--pbox-outer-left",
        `${outerLeft}px`
      );
      document.documentElement.style.setProperty(
        "--pbox-outer-top",
        `${outerTop}px`
      );
      document.documentElement.style.setProperty(
        "--pbox-outer-width",
        `${outerW}px`
      );
      document.documentElement.style.setProperty(
        "--pbox-outer-height",
        `${outerH}px`
      );
    }

    updateGeometryDOM();
  }, [updateGeometryDOM]);


  // Window resize handler
  useEffect(() => {
    calculateGeometry();
    window.addEventListener("resize", calculateGeometry, { passive: true });
    return () => window.removeEventListener("resize", calculateGeometry);
  }, [calculateGeometry]);

  // Expose imperative update method for 60/120 FPS scroll loop
  useImperativeHandle(
    ref,
    () => ({
      update: (frame, _progress) => {
        const container = containerRef.current;
        if (!container) return;

        const isDesktopTier = ENABLE_DESKTOP_DYNAMIC_GROWING_BOX && !geomRef.current.isMobile && !geomRef.current.isPortrait;
        const boxStartFrame = isDesktopTier ? DESKTOP_BOX_START_FRAME : BOX_START_FRAME;
        const boxDrawCompleteFrame = isDesktopTier ? DESKTOP_BOX_DRAW_COMPLETE_FRAME : BOX_DRAW_COMPLETE_FRAME;

        // Visibility range gating
        const inWindow =
          frame >= boxStartFrame && frame < BOX_EXIT_COMPLETE_FRAME;

        if (!inWindow) {
          if (lastStateRef.current.visible) {
            container.style.display = "none";
            lastStateRef.current.visible = false;
          }
          return;
        }

        if (!lastStateRef.current.visible) {
          container.style.display = "block";
          lastStateRef.current.visible = true;
          calculateGeometry();
        }

        // 1. Line Drawing Progress:
        // Desktop: draws around small ring from frame 158 -> 176
        // Mobile/Tablet: draws from frame 205.5 -> 220
        const rawDrawProgress = Math.min(
          1,
          Math.max(
            0,
            (frame - boxStartFrame) /
              (boxDrawCompleteFrame - boxStartFrame)
          )
        );
        // Smooth cubic ease for the drawing stroke
        const drawT =
          rawDrawProgress * rawDrawProgress * (3 - 2 * rawDrawProgress);

        // 2. Perspective Assembly & Gradient Bloom:
        // The moment the SVG line drawing completes, the gradient blooms in immediately
        // and stays active as the box expands and descends into Beat 5.
        const perspStartFrame = isDesktopTier
          ? DESKTOP_BOX_PERSPECTIVE_START_FRAME
          : BOX_PERSPECTIVE_START_FRAME;
        const perspEndFrame = isDesktopTier
          ? DESKTOP_BOX_PERSPECTIVE_COMPLETE_FRAME
          : BOX_PERSPECTIVE_COMPLETE_FRAME;

        const rawPerspProgress = Math.min(
          1,
          Math.max(
            0,
            (frame - perspStartFrame) /
              (perspEndFrame - perspStartFrame)
          )
        );
        let perspT =
          rawPerspProgress * rawPerspProgress * (3 - 2 * rawPerspProgress);

        // Perspective Gradient Exit Bloom:
        // Fades out completely ahead of the line un-draw (frame 241 -> 245),
        // ensuring zero gradient remains when the line begins retracting.
        if (frame >= 241) {
          const rawPerspFade = Math.min(
            1,
            Math.max(0, (frame - 241) / (BOX_EXIT_START_FRAME - 241))
          );
          const easePerspFade =
            rawPerspFade * rawPerspFade * (3 - 2 * rawPerspFade);
          perspT = perspT * (1 - easePerspFade);
        }

        // 3. Exit Transition (frame 245 -> 250)
        let exitT = 0;
        if (frame >= BOX_EXIT_START_FRAME) {
          const rawExit = Math.min(
            1,
            Math.max(
              0,
              (frame - BOX_EXIT_START_FRAME) /
                (BOX_EXIT_COMPLETE_FRAME - BOX_EXIT_START_FRAME)
            )
          );
          exitT = rawExit * rawExit * (3 - 2 * rawExit);
        }

        // Update stroke-dasharray & stroke-dashoffset for entry drawing and reverse exit retract
        const halfPerimeter = geomRef.current.halfPerimeter || 1340;

        if (exitT > 0) {
          // Exit Animation: Breaks open at top-center (where it started) and retracts
          // downwards along both sides toward bottom-center, exactly reversing the entry.
          const gapLen = halfPerimeter * exitT;
          const dashLen = Math.max(0, halfPerimeter * (1 - exitT));
          const exitDashArray = `0 ${gapLen} ${dashLen} ${halfPerimeter}`;

          // Smoothly dissolve the last 15% of the stroke into bottom-center
          // so the line vanishes into thin air before reaching the final pixel
          const exitStrokeOpacity =
            exitT >= 1 ? 0 : exitT > 0.85 ? (1 - exitT) / 0.15 : 1;

          if (leftPathRef.current) {
            leftPathRef.current.style.strokeDasharray = exitDashArray;
            leftPathRef.current.style.strokeDashoffset = "0";
            leftPathRef.current.style.opacity = `${exitStrokeOpacity}`;
          }
          if (rightPathRef.current) {
            rightPathRef.current.style.strokeDasharray = exitDashArray;
            rightPathRef.current.style.strokeDashoffset = "0";
            rightPathRef.current.style.opacity = `${exitStrokeOpacity}`;
          }
        } else {
          // Normal Entry / Active state:
          const dashOffset = halfPerimeter * (1 - drawT);
          if (leftPathRef.current) {
            leftPathRef.current.style.strokeDasharray = `${halfPerimeter} ${halfPerimeter}`;
            leftPathRef.current.style.strokeDashoffset = `${dashOffset}`;
            leftPathRef.current.style.opacity = drawT > 0.008 ? "1" : "0";
          }
          if (rightPathRef.current) {
            rightPathRef.current.style.strokeDasharray = `${halfPerimeter} ${halfPerimeter}`;
            rightPathRef.current.style.strokeDashoffset = `${dashOffset}`;
            rightPathRef.current.style.opacity = drawT > 0.008 ? "1" : "0";
          }
        }

        // Update seamless perspective bevel opacity:
        // Must be strictly 0 once exit begins (exitT > 0), eliminating all lingering gradients
        if (bevelRef.current) {
          const bevelOpacity = exitT > 0 ? 0 : Math.max(0, perspT);
          bevelRef.current.style.opacity = `${bevelOpacity}`;
        }

        // Overall container opacity stays crisp while strokes un-draw, vanishing when complete
        const containerOpacity = exitT >= 1 ? 0 : 1;
        container.style.opacity = `${containerOpacity}`;

        // Dynamic vertical translation and scale:
        let currentScale = 1.0;
        let translateY = 0;

        if (isDesktopTier) {
          // ── DESKTOP EXPERIMENTAL EFFECT ──────────────────────────────────
          // When the ring exits Beat 4 (frame 158) and flies forward into Beat 5 (frame 214):
          // The box appears early at scale ~0.33, then scales up and descends in lockstep
          // with the approaching ring, creating a seamless simultaneous appearance effect.
          const winH = geomRef.current.winH || 900;
          // In Three.js, ringPosOffset.y changes from 0.68 (Beat 4) to 0.21 (Beat 5) = 0.47 world units.
          // At camera z=8.0 and FOV=45°, 0.47 units projects to exactly (0.47 / 6.627) * winH = 0.0709 * winH.
          const maxShiftY = Math.round(winH * 0.0709);
          const minScale = 0.33;

          if (frame < DESKTOP_BOX_LAND_FRAME) {
            const rawFlight = Math.min(
              1,
              Math.max(
                0,
                (frame - DESKTOP_BOX_START_FRAME) /
                  (DESKTOP_BOX_LAND_FRAME - DESKTOP_BOX_START_FRAME)
              )
            );
            // Quadratic in-out matching Three.js GSAP power1.inOut keyframe flight:
            const flightEase =
              rawFlight < 0.5
                ? 2 * rawFlight * rawFlight
                : 1 - Math.pow(-2 * rawFlight + 2, 2) / 2;

            currentScale = minScale + (1.0 - minScale) * flightEase;
            translateY = Math.round(-maxShiftY * (1 - flightEase));
          } else {
            currentScale = 1.0;
            translateY = 0;
          }
        } else {
          // Mobile & tablet portrait: frames 205-218 ring descent tracking
          if (frame < 218) {
            const tDescend = Math.min(1, Math.max(0, (frame - 205) / (218 - 205)));
            const easeDescend = tDescend * tDescend * (3 - 2 * tDescend);
            const winH = geomRef.current.winH;
            const beat4Cy = Math.round(winH * 0.50);
            const beat5Cy = Math.round(winH * (geomRef.current.isMobile ? 0.638 : 0.628));
            const totalShift = beat4Cy - beat5Cy; // negative (~ -116px on mobile, ~ -131px on tablet)
            translateY = Math.round(totalShift * (1 - easeDescend));
          }
        }

        // Footer Clearance during exit (frame >= 245):
        // Provide gentle clearance above the rising footer, while strictly keeping
        // the bottom of the box and the convergence point safely below the ring shank across all viewports.
        if (frame >= BOX_EXIT_START_FRAME) {
          const maxAllowedLift = geomRef.current.isMobile
            ? 16
            : geomRef.current.isPortrait
            ? 22
            : geomRef.current.isMac
            ? 28
            : 36;
          const footerProgress = Math.min(
            1,
            Math.max(
              0,
              (frame - BOX_EXIT_START_FRAME) /
                (BOX_EXIT_COMPLETE_FRAME - BOX_EXIT_START_FRAME)
            )
          );
          const easeLift =
            footerProgress * footerProgress * (3 - 2 * footerProgress);
          translateY -= Math.round(maxAllowedLift * easeLift);
        }

        // Apply hardware-accelerated transform centered on the ring's resting anchor
        const cx = geomRef.current.cx;
        const cy = geomRef.current.cy;
        container.style.transformOrigin = `${cx}px ${cy}px`;

        const scaleStr = currentScale !== 1.0 ? ` scale(${currentScale.toFixed(4)})` : "";
        const transStr = translateY !== 0 ? ` translateY(${translateY}px)` : "";
        container.style.transform = (transStr || scaleStr) ? `${transStr}${scaleStr}`.trim() : "";

        if (typeof document !== "undefined") {
          document.documentElement.style.setProperty(
            "--pbox-translate-y",
            `${translateY}px`
          );
        }

        lastStateRef.current = {
          frame,
          drawT,
          perspT,
          exitT,
          visible: true,
        };
      },
      refreshGeometry: () => {
        calculateGeometry();
      },
    }),
    [calculateGeometry, updateGeometryDOM]
  );

  return (
    <div
      ref={containerRef}
      className="pbox-container"
      style={{ display: "none", opacity: 0 }}
      aria-hidden="true"
    >
      {/* Seamless Perspective Bevel with Zero Corner Seams & Smooth Optical Falloff */}
      <div
        ref={bevelRef}
        className="pbox-bevel"
        style={{ opacity: 0 }}
      />

      <svg
        ref={svgRef}
        className="pbox-svg"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs />

        {/* ── Outer Layer: 2-Direction SVG Path Animation ─── */}
        {/* Left branch: draws from top-center -> top-left -> down left -> bottom-center */}
        <path
          ref={leftPathRef}
          className="pbox-outer-stroke"
          fill="none"
          stroke="rgba(255, 255, 255, 0.28)"
          strokeWidth="1.0"
          strokeLinecap="butt"
          strokeLinejoin="miter"
        />

        {/* Right branch: draws from top-center -> top-right -> down right -> bottom-center */}
        <path
          ref={rightPathRef}
          className="pbox-outer-stroke"
          fill="none"
          stroke="rgba(255, 255, 255, 0.28)"
          strokeWidth="1.0"
          strokeLinecap="butt"
          strokeLinejoin="miter"
        />
      </svg>
    </div>
  );
});

export default PerspectiveBox;
