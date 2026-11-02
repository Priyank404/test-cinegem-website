import fs from "node:fs";

const baselineFile = "responsive-report/baseline/results.json";
const afterFile = "responsive-report/after/results.json";

if (!fs.existsSync(baselineFile) || !fs.existsSync(afterFile)) {
  console.error("Missing baseline or after results.json!");
  process.exit(1);
}

const baseline = JSON.parse(fs.readFileSync(baselineFile, "utf-8"));
const after = JSON.parse(fs.readFileSync(afterFile, "utf-8"));

console.log("=== COMPARING BASELINE VS AFTER RESULTS ===");

// 1. Acceptance Criterion A: Desktop Regression (aspect >= 1.6: 1920x1080, 1440x900, 1366x768, 2560x1080)
const desktopViewports = ["desktop-1920x1080", "desktop-1440x900", "laptop-1366x768", "ultrawide-2560x1080"];
let critAPass = true;
let critAMaxDeltaCx = 0;
let critAMaxDeltaCy = 0;
let critAMaxDeltaW = 0;
let critAMaxDeltaH = 0;
const critAFailures = [];

for (const vp of desktopViewports) {
  const baseFrames = baseline.filter((r) => r.viewport === vp);
  const afterFrames = after.filter((r) => r.viewport === vp);
  for (const b of baseFrames) {
    const a = afterFrames.find((r) => r.targetFrame === b.targetFrame);
    if (!a) continue;
    const dCx = Math.abs(a.cx - b.cx);
    const dCy = Math.abs(a.cy - b.cy);
    const dW = Math.abs(a.widthPct - b.widthPct);
    const dH = Math.abs(a.heightPct - b.heightPct);
    critAMaxDeltaCx = Math.max(critAMaxDeltaCx, dCx);
    critAMaxDeltaCy = Math.max(critAMaxDeltaCy, dCy);
    critAMaxDeltaW = Math.max(critAMaxDeltaW, dW);
    critAMaxDeltaH = Math.max(critAMaxDeltaH, dH);
    if (dCx > 0.005 || dCy > 0.005 || dW > 0.5 || dH > 0.5) {
      critAPass = false;
      critAFailures.push({ vp, frame: b.targetFrame, dCx, dCy, dW, dH });
    }
  }
}

// 2. Acceptance Criterion B: Landscape Fit (1280x1024, 1024x768, 1180x820)
// cx within +-0.04 NDC of aspect-1.6 baseline, visibleFraction not worse than baseline by > 0.02
const landscapeViewports = ["desktop-1280x1024", "ipad-land-1024x768", "ipadair-land-1180x820"];
const ref16Baseline = baseline.filter((r) => r.viewport === "desktop-1440x900");
let critBPass = true;
let critBMaxDeltaCx = 0;
let critBMaxVisLoss = 0;
const critBDetails = [];

for (const vp of landscapeViewports) {
  const afterFrames = after.filter((r) => r.viewport === vp);
  for (const a of afterFrames) {
    const ref = ref16Baseline.find((r) => r.targetFrame === a.targetFrame);
    const baseThis = baseline.find((r) => r.viewport === vp && r.targetFrame === a.targetFrame);
    if (!ref) continue;
    const dCx = Math.abs(a.cx - ref.cx);
    const visLoss = (baseThis ? baseThis.visibleFraction : 1) - a.visibleFraction;
    critBMaxDeltaCx = Math.max(critBMaxDeltaCx, dCx);
    critBMaxVisLoss = Math.max(critBMaxVisLoss, visLoss);
    if (dCx > 0.04 || visLoss > 0.02) {
      critBPass = false;
    }
    critBDetails.push({ vp, frame: a.targetFrame, cx: a.cx, refCx: ref.cx, dCx, vis: a.visibleFraction });
  }
}

// 3. Acceptance Criterion C: Portrait in-frame (820x1180, 768x1024, 412x915, 390x844, 360x640)
// All overflow.* <= 0.001 and visibleFraction >= 0.99
const portraitViewports = ["ipadair-port-820x1180", "ipad-port-768x1024", "phone-412x915", "phone-390x844", "phone-360x640"];
let critCPass = true;
let critCMaxOverflow = 0;
let critCMinVisible = 1.0;
const critCFailures = [];

for (const vp of portraitViewports) {
  const afterFrames = after.filter((r) => r.viewport === vp);
  for (const a of afterFrames) {
    const maxOver = Math.max(a.overflow.l, a.overflow.r, a.overflow.b, a.overflow.t);
    critCMaxOverflow = Math.max(critCMaxOverflow, maxOver);
    critCMinVisible = Math.min(critCMinVisible, a.visibleFraction);
    if (maxOver > 0.001 || a.visibleFraction < 0.99) {
      critCPass = false;
      critCFailures.push({ vp, frame: a.targetFrame, maxOver, vis: a.visibleFraction });
    }
  }
}

// 4. Acceptance Criterion D: Portrait Size
// Hero beat (frame 0): widthPct between 45 and 70. Smallest beat (131-156): widthPct >= 15. No frame has heightPct > 85.
let critDPass = true;
let heroWidths = [];
let smallestWidths = [];
let maxHeights = [];

for (const vp of portraitViewports) {
  const afterFrames = after.filter((r) => r.viewport === vp);
  for (const a of afterFrames) {
    if (a.targetFrame === 0 || a.targetFrame === 22) {
      heroWidths.push({ vp, frame: a.targetFrame, w: a.widthPct });
      if (a.widthPct < 45 || a.widthPct > 70) critDPass = false;
    }
    if (a.targetFrame === 131 || a.targetFrame === 156) {
      smallestWidths.push({ vp, frame: a.targetFrame, w: a.widthPct });
      if (a.widthPct < 15) critDPass = false;
    }
    maxHeights.push({ vp, frame: a.targetFrame, h: a.heightPct });
    if (a.heightPct > 85) critDPass = false;
  }
}

// 5. Acceptance Criterion F: First-load FOV
const phone390First = after.find((r) => r.viewport === "phone-390x844" && r.firstLoad);
const desk1920First = after.find((r) => r.viewport === "desktop-1920x1080" && r.firstLoad);
const phoneFov = phone390First?.firstLoad?.fov;
const deskFov = desk1920First?.firstLoad?.fov;
const critFPass = phoneFov === 40 && deskFov === 35;

const report = {
  criteriaA: { pass: critAPass, maxDeltaCx: critAMaxDeltaCx, maxDeltaCy: critAMaxDeltaCy, maxDeltaW: critAMaxDeltaW, maxDeltaH: critAMaxDeltaH, failures: critAFailures },
  criteriaB: { pass: critBPass, maxDeltaCx: critBMaxDeltaCx, maxVisLoss: critBMaxVisLoss },
  criteriaC: { pass: critCPass, maxOverflow: critCMaxOverflow, minVisible: critCMinVisible, failures: critCFailures },
  criteriaD: { pass: critDPass, heroWidths, smallestWidths, maxHeights: maxHeights.sort((a,b)=>b.h-a.h).slice(0,5) },
  criteriaF: { pass: critFPass, phoneFov, deskFov },
};

fs.writeFileSync("responsive-report/criteria-evaluation.json", JSON.stringify(report, null, 2));
console.log("=== EVALUATION SUMMARY ===");
console.log("Criterion A (Desktop Regression):", critAPass ? "PASS" : "FAIL", report.criteriaA);
console.log("Criterion B (Landscape Fit):", critBPass ? "PASS" : "FAIL", report.criteriaB);
console.log("Criterion C (Portrait In-Frame):", critCPass ? "PASS" : "FAIL", report.criteriaC);
console.log("Criterion D (Portrait Size):", critDPass ? "PASS" : "FAIL");
console.log("Criterion F (First-load FOV):", critFPass ? "PASS" : "FAIL", report.criteriaF);
