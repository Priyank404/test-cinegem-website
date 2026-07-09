/**
 * cursorDOF.js
 * -------------------------------------------------------------------------
 * Real camera depth-of-field (bokeh-style circle-of-confusion blur), with
 * the focus DISTANCE driven by a raycast under the cursor — whatever 3D
 * object is under your mouse stays sharp, everything nearer/farther from
 * that point defocuses. This is a proper 3D DOF pass (uses the scene's
 * depth buffer), not a 2D screen-space blur — so it respects actual
 * distance-from-camera, correctly blurs foreground AND background, and
 * reacts to camera movement/parallax the way a real lens would.
 *
 * Uses `postprocessing`'s DepthOfFieldEffect (already a dependency in
 * this project — see package.json). No extra installs needed.
 *
 * -------------------------------------------------------------------------
 * USAGE
 * -------------------------------------------------------------------------
 *
 *   import { setupCursorDOF } from "./cursorDOF";
 *
 *   // after you have renderer, scene, camera, and your render-target objects:
 *   const dof = setupCursorDOF({
 *     renderer,
 *     scene,
 *     camera,
 *     canvas,                 // the <canvas> element mouse events bind to
 *     focusTargets: [ringGroup], // objects the raycaster should hit-test
 *                                 // against; omit to raycast the whole scene
 *   });
 *
 *   // in your render loop, REPLACE renderer.render(scene, camera) with:
 *   dof.render(deltaSeconds);
 *
 *   // on resize:
 *   dof.setSize(width, height);
 *
 *   // on unmount:
 *   dof.dispose();
 *
 * -------------------------------------------------------------------------
 * HOW THE FOCUS-FOLLOWS-CURSOR PART WORKS
 * -------------------------------------------------------------------------
 * On every pointermove we raycast from the camera through the cursor's NDC
 * position into the scene. If we hit one of `focusTargets` (or anything,
 * if none given), we take that hit's distance from the camera and smoothly
 * lerp the DOF's `target` (world-space focus point) toward it — this is
 * exactly the "hover an object -> it gets sharp, rest blurs" behavior in
 * your reference screenshots. If the raycast misses (cursor over empty
 * background), we keep the last good focus distance instead of snapping to
 * some huge/undefined depth, so nothing suddenly blurs to mush when the
 * mouse leaves the glass shapes.
 * -------------------------------------------------------------------------
 */

import * as THREE from "three";
import {
  EffectComposer,
  RenderPass,
  EffectPass,
  DepthOfFieldEffect,
} from "postprocessing";

export function setupCursorDOF({
  renderer,
  scene,
  camera,
  canvas,
  focusTargets = null, // array of Object3D to raycast against; null = whole scene
  // Bokeh tuning — defaults aim for a subtle, premium look like the
  // peachweb reference (soft background blur, sharp focal subject, no
  // heavy artifacting). Increase bokehScale for a stronger effect.
  focalLength = 0.05,
  bokehScale = 3.0,
  // How fast the focus point eases toward the new raycast hit, in
  // 1/seconds — lower = dreamier/slower rack-focus, higher = snappier.
  focusLerpSpeed = 4.0,
}) {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  const dofEffect = new DepthOfFieldEffect(camera, {
    focusDistance: 0.02, // placeholder, overwritten by first raycast hit
    focalLength,
    bokehScale,
  });

  composer.addPass(new EffectPass(camera, dofEffect));

  // ── Cursor raycasting ────────────────────────────────────────────────
  const raycaster = new THREE.Raycaster();
  const pointerNDC = new THREE.Vector2(0, 0);
  const worldFocusPoint = new THREE.Vector3(0, 0, 0);
  let hasHitEver = false;
  let currentFocusDistance = camera.position.length() || 5;

  function onPointerMove(e) {
    const rect = canvas.getBoundingClientRect();
    pointerNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointerNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }
  canvas.addEventListener("pointermove", onPointerMove);

  function updateFocusFromCursor(dt) {
    raycaster.setFromCamera(pointerNDC, camera);
    const hitList = focusTargets
      ? raycaster.intersectObjects(focusTargets, true)
      : raycaster.intersectObjects(scene.children, true);

    let targetDistance = currentFocusDistance;
    if (hitList.length > 0) {
      worldFocusPoint.copy(hitList[0].point);
      targetDistance = hitList[0].distance;
      hasHitEver = true;
    }
    // If we've never hit anything yet, don't blur the whole scene based
    // on a guess — hold at a sensible default until the first real hit.
    if (!hasHitEver) return;

    // Exponential smoothing toward the target distance — frame-rate
    // independent via dt, avoids a hard snap/jump every time the cursor
    // crosses onto a new mesh.
    const t = 1 - Math.exp(-focusLerpSpeed * dt);
    currentFocusDistance += (targetDistance - currentFocusDistance) * t;

    // DepthOfFieldEffect wants normalized [0,1] focus distance relative
    // to camera near/far, OR you can feed it world distance directly via
    // .target — using .target is more intuitive since it's just "the
    // point in space that should be sharp."
    dofEffect.target = worldFocusPoint;
  }

  function render(dt = 1 / 60) {
    updateFocusFromCursor(dt);
    composer.render(dt);
  }

  function setSize(w, h) {
    composer.setSize(w, h);
  }

  function dispose() {
    canvas.removeEventListener("pointermove", onPointerMove);
    dofEffect.dispose();
    composer.dispose();
  }

  return { render, setSize, dispose, composer, dofEffect };
}
