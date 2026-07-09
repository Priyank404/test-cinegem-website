// ─── Navigation ────────────────────────────────────────────────────────────
export const NAV_LINKS = [];

// ─── Vault Gallery Panels ──────────────────────────────────────────────────
// 5 service cards scattered in 3D. All isService: true and fully clickable.
// z-index is derived from position.z — no card inflates above its real depth.
// Equal dimensions keep the deck visually balanced; depth comes from translateZ only.

export const VAULT_CARD_SIZE = { width: 260, height: 188 };

export const VAULT_PANELS = [
  // ── 1. Far left — background depth, tilted inward ──────────────────────
  {
    id: "still",
    label: "Still Images",
    category: "Photorealistic Render",
    img: "Band Ring With Enamel Marquise-Y-V1.jpg", // 16:9 desktop hero
    mobileImg: "Band Ring With Enamel Marquise-Y-V1_2560x3840.jpg", // TODO: swap in your 9:16 mobile render
    route: "/still",
    position: { x: -470, y: -80, z: -100 },
    rotation: { x: 5, y: 20, z: -7 },
    size: VAULT_CARD_SIZE,
    isService: true,
    depthLayer: 1,
  },

  // ── 2. Upper center-left — mid depth ──────────────────────────────────
  {
    id: "creative",
    label: "Creative Images",
    category: "Artistic Direction",
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuAQvBe037qoIr0S4wq7SVMxkmX6I2latfPSZoprsdt4M0obhFWC3qHZpXKXnBm1_cih5DNJpZsqxoPN1-YoOnmrpZF3s7xTxzzMfkiqfgLl7DWLgnu7lssS_tbyLwvn9rMW7B2QwCSPdCrOTW71KFlk7EwoyXnnRkfQXF2GEipqAvIvdNYmIhOuMi7VgTpmtXEC0pyLz4lRivTRvEZyRU-7tPBg5vzGrhdMqQhzlEmfxtc1iEi-_yJiiuK8mOH7VmBNd2QhuocaTzc",
    mobileImg: undefined, // TODO: add 9:16 mobile render; falls back to `img` above
    route: "/creative",
    position: { x: -130, y: -195, z: -60 },
    rotation: { x: 4, y: 9, z: 6 },
    size: VAULT_CARD_SIZE,
    isService: true,
    depthLayer: 2,
  },

  // ── 3. Center — hero card, closest to viewer ──────────────────────────
  {
    id: "onbody",
    label: "On-Body Visualization",
    category: "Lifestyle Render",
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuCSt7maIUGuU8JaH4udv3RVX8-ZzjtnHfHYKVAFYDq9MUFNhZ9HOnmTArjrgJQcLAWf4_e03WtACCBD4swoduNNYHitRxcISpwUQxGXRb7zQO-MuhFqgdCLrgHeO19OskhempAlGfBOdQo5bpoX5sUBY5AWgV8Iszs57aYCr8-xwksQQvZkGsmXlf1f7V0V-oM_PSG4wfFvCamrnPCLlEFJ3EAsvsTTC1O1NvN20G-RRFX0t0slMrXQ5mR8v_AYZvrLJl6iX1__PLw",
    mobileImg: undefined, // TODO: add 9:16 mobile render; falls back to `img` above
    route: "/onbody",
    position: { x: 30, y: 30, z: 40 },
    rotation: { x: -2, y: -4, z: 1 },
    size: VAULT_CARD_SIZE,
    isService: true,
    depthLayer: 3,
  },

  // ── 4. Upper center-right — mid depth ────────────────────────────────
  {
    id: "creative-anim",
    label: "Creative Animation",
    category: "Motion Design",
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuDsafTdCoiYrBgrNi769RD1KgPHYnJDSzRdGrGJt1aCKuPm7asSL3ioXej2GVfXDUEUjdgu-25fyfD_S-1Ya1SKAwNSfJK68jue5KGNPnChd_jKj1OfDfXGFr-V2N7nc7_vbQ9sEwB_wj1645WCFdGx1sMq0V8WAA25B7Nrbptk0bzCQMrMQtW808kko6E8uQdUiyCDm28R2xRnONI3ZX5qJfq014w352EASAP9SsDUU7cbUt-Xbb8v7RcB5II3Yl8_tFgweae77Fo",
    mobileImg: undefined, // TODO: add 9:16 mobile render; falls back to `img` above
    route: "/creative-anim",
    position: { x: 275, y: -150, z: -50 },
    rotation: { x: 3, y: -15, z: -5 },
    size: VAULT_CARD_SIZE,
    isService: true,
    depthLayer: 2,
  },

  // ── 5. Far right lower — background depth ────────────────────────────
  {
    id: "360",
    label: "360° Animation",
    category: "Turntable & Fly-through",
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuDm5EsqKjVjDwNCLkd7zO1jyXeYfYc18Rig2lvwFEoVxs5I5SCqEPsRO9yjYQHBsYVldyjgs6IXDJikSWiUlpNT32JhbeHmdvc8Er1DGDp0ap6vFRfIevcA83WkrqMs83UDHNkb75JxlMqo2E_BRV3LUV3vb5P7C9FCHtYhJ03RuwmAprhoarkzsAFaa1TFCRNsMpN1fGG5j4zsgTAhYp4eksyEvu7W7P2OqGY_9Gqa306lkU43UZZq4xu2bAd7OnAnJWg8Od4hQho",
    mobileImg: undefined, // TODO: add 9:16 mobile render; falls back to `img` above
    route: "/360",
    position: { x: 460, y: 105, z: -130 },
    rotation: { x: 5, y: -21, z: 4 },
    size: VAULT_CARD_SIZE,
    isService: true,
    depthLayer: 1,
  },
];

// ─── Footer Links ──────────────────────────────────────────────────────────
export const FOOTER_LINKS = [
  { label: "Privacy", href: "#" },
  { label: "Terms", href: "#" },
  {
    label: "Instagram",
    href: "https://www.instagram.com/cinegemstudio?igsh=MXd5dzQ0OGF2enBjdg==",
    external: true,
  },
  {
    label: "Behance",
    href: "https://www.behance.net/cinegem-studio/projects",
    external: true,
  },
];
