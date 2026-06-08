/**
 * gallery.js — Image data for every service page.
 *
 * HOW TO ADD IMAGES:
 *   1. Drop your image into /public/images/<service>/
 *   2. Add an entry to the relevant array below:
 *      { src: '/images/still/my-new-image.jpg', alt: 'Description', label: 'Caption' }
 *
 * The page components read from these arrays automatically — no other code changes needed.
 */

// ─── Still Images ──────────────────────────────────────────────────────────
export const STILL_IMAGES = {
  hero: {
    src: 'https://lh3.googleusercontent.com/aida/ADBb0ujiooClJ_VzZX2-b54tRs6sRUW2cz7d-9uLZvGN_xC5V9FAVCjbtqwLSYeL8SX_UynR_yh7NK4pOry4f1sH9nUOuohNpR0cUtaeffjxcXLyfAWMX9HL36CsglS0q5Ysk9JjlD_2YF1huOJbNhIfYQbGVIFmw4PW6nHGDYmi8HDBeEabPylY7XIly2D90Zhc0rO7Jj5swx6EGbzyP0klCcE_ZIHkiYn5hCzwst8kfwXgw9faf4URBggeaA',
    alt: 'Hero still render — jewellery suspended in pure light',
    chips: ['8K Resolution', 'Raytraced'],
  },
  // To add images: append objects here ↓
  gallery: [
    {
      src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC0Tc7i2mEJj2Aie7usQQBNK2jiIcwkzB8pgnSa3D9kAIjhaGWVz9homlQmZTh9D6uywm4rUfWVttwZh3Sdn15iOcuTofKXUYBnzd_2Kn7FAAhvuXEC_NzJkyT379MwmRRk8DczOeGnoNu94kGimLDYlBlyau8y3K38SScC_d-6EqgIUbyAcBC5-xR5Q2FjiOVSeOFd1CaCjYzylvTJo-Y_STku8ta51d0Wi6hSLIe-vKbSFoiv59rR79VIDNBIKrWU6oP8yFwJh1o',
      alt: 'Sapphire ring macro render with studio lighting',
      label: 'Sapphire Study',
    },
    {
      src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDsafTdCoiYrBgrNi769RD1KgPHYnJDSzRdGrGJt1aCKuPm7asSL3ioXej2GVfXDUEUjdgu-25fyfD_S-1Ya1SKAwNSfJK68jue5KGNPnChd_jKj1OfDfXGFr-V2N7nc7_vbQ9sEwB_wj1645WCFdGx1sMq0V8WAA25B7Nrbptk0bzCQMrMQtW808kko6E8uQdUiyCDm28R2xRnONI3ZX5qJfq014w352EASAP9SsDUU7cbUt-Xbb8v7RcB5II3Yl8_tFgweae77Fo',
      alt: 'Minimalist gold ring on dark slate surface',
      label: 'Minimalist Gold',
    },
    {
      src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBJ2w7uyxMVEy7PP-TM4sEdiMM8JY7lqglz2fEAQI3buE8dSV5RlqlxWCHEmzrNBJpAgHh7KCf7AAi4cGU40TwEZh4hSXcmi_v9rHHH0t63LDMRCf4Scy1CYwLBd35vF4viI8aasf-_-Sb6fOLYiqFuQc1kUX6QK0TEqn9s5l9vtNzyP3PB0ZLHOo6Lh0QfJPfUPFs7i721yMmJIEvdgvAatcNiJ77aMhfCGh5bFJJVN3MuE_grYZlA1XtEjpyz3WU7MwZR7Y3FWAU',
      alt: 'Diamond necklace clasp macro detail with shallow depth of field',
      label: 'Macro Detail',
    },
    {
      src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDm5EsqKjVjDwNCLkd7zO1jyXeYfYc18Rig2lvwFEoVxs5I5SCqEPsRO9yjYQHBsYVldyjgs6IXDJikSWiUlpNT32JhbeHmdvc8Er1DGDp0ap6vFRfIevcA83WkrqMs83UDHNkb75JxlMqo2E_BRV3LUV3vb5P7C9FCHtYhJ03RuwmAprhoarkzsAFaa1TFCRNsMpN1fGG5j4zsgTAhYp4eksyEvu7W7P2OqGY_9Gqa306lkU43UZZq4xu2bAd7OnAnJWg8Od4hQho',
      alt: 'Jewellery display case in a vast minimalist gallery',
      label: 'Environment Concept',
    },
  ],
}

// ─── Creative Images ───────────────────────────────────────────────────────
export const CREATIVE_IMAGES = {
  hero: {
    src: 'https://lh3.googleusercontent.com/aida/ADBb0uh8qyUZ--KdaAkdIzNvLUjETco8OrQkLGIBQpb2I8Gsd3bk5jwiY5BHpZ007R70xdoS47J5UlIFM-IcXh6IPtcHBG4c1_2oxwfJdzLn2B9mPzfjKzF-MhPkP-P2RnTE0u8aDu3LCwtuQC6wnQTrzyzA5DUDwOsoaGkEzJ8Jt6Obf6o9-_CMrI4fnUtV1YWtjj4ylmwcVWv8GlsKEd-sVmqI_-Do_BBMGL-BNehT9p9-fbiJbDdlTb34eW0',
    alt: 'Hero creative render — Liquid Emerald campaign',
    title: 'Liquid Emerald',
    subtitle: 'Exhibit 01',
  },
  gallery: [
    {
      src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAQvBe037qoIr0S4wq7SVMxkmX6I2latfPSZoprsdt4M0obhFWC3qHZpXKXnBm1_cih5DNJpZsqxoPN1-YoOnmrpZF3s7xTxzzMfkiqfgLl7DWLgnu7lssS_tbyLwvn9rMW7B2QwCSPdCrOTW71KFlk7EwoyXnnRkfQXF2GEipqAvIvdNYmIhOuMi7VgTpmtXEC0pyLz4lRivTRvEZyRU-7tPBg5vzGrhdMqQhzlEmfxtc1iEi-_yJiiuK8mOH7VmBNd2QhuocaTzc',
      alt: 'Gallery image collection — creative editorial',
      label: 'Editorial Collection',
    },
    {
      src: 'https://lh3.googleusercontent.com/aida/ADBb0uh8qyUZ--KdaAkdIzNvLUjETco8OrQkLGIBQpb2I8Gsd3bk5jwiY5BHpZ007R70xdoS47J5UlIFM-IcXh6IPtcHBG4c1_2oxwfJdzLn2B9mPzfjKzF-MhPkP-P2RnTE0u8aDu3LCwtuQC6wnQTrzyzA5DUDwOsoaGkEzJ8Jt6Obf6o9-_CMrI4fnUtV1YWtjj4ylmwcVWv8GlsKEd-sVmqI_-Do_BBMGL-BNehT9p9-fbiJbDdlTb34eW0',
      alt: 'Creative campaign hero detail — greyscale reveal',
      label: 'Campaign Detail',
      grayscale: true,
    },
    {
      src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC0Tc7i2mEJj2Aie7usQQBNK2jiIcwkzB8pgnSa3D9kAIjhaGWVz9homlQmZTh9D6uywm4rUfWVttwZh3Sdn15iOcuTofKXUYBnzd_2Kn7FAAhvuXEC_NzJkyT379MwmRRk8DczOeGnoNu94kGimLDYlBlyau8y3K38SScC_d-6EqgIUbyAcBC5-xR5Q2FjiOVSeOFd1CaCjYzylvTJo-Y_STku8ta51d0Wi6hSLIe-vKbSFoiv59rR79VIDNBIKrWU6oP8yFwJh1o',
      alt: 'Surreal jewellery composition with emerald tones',
      label: 'Surreal Study',
    },
    {
      src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDsafTdCoiYrBgrNi769RD1KgPHYnJDSzRdGrGJt1aCKuPm7asSL3ioXej2GVfXDUEUjdgu-25fyfD_S-1Ya1SKAwNSfJK68jue5KGNPnChd_jKj1OfDfXGFr-V2N7nc7_vbQ9sEwB_wj1645WCFdGx1sMq0V8WAA25B7Nrbptk0bzCQMrMQtW808kko6E8uQdUiyCDm28R2xRnONI3ZX5qJfq014w352EASAP9SsDUU7cbUt-Xbb8v7RcB5II3Yl8_tFgweae77Fo',
      alt: 'Artistic black jewellery against dark textured surface',
      label: 'Dark Matter',
    },
  ],
}

// ─── On-Body Visualization ─────────────────────────────────────────────────
export const ONBODY_IMAGES = {
  hero: {
    src: 'https://lh3.googleusercontent.com/aida/ADBb0ugAGdiE8mijsvrLKy9AHIFYh1XtBq-pIoFNUUh3r518HaV_3HGEeIDLcNgvU5ak55yOxRIOtj22Ewhe3Eyd_zXJjScnMagNu-2waqkmp4VNa1BBK9MnE3mTyX1dqtw0ZOikBdiqMsU6b5sgNCAXyYdZEO10d4PUIgTxan_KFKbUNzeYUbhOR6f13vl2GPs0dHARkC-Ab0Ufc8WxFU-7Lsp6sGGENH5axzbjMDPvvVgHjkhLT7Vx0TAb1Z4',
    alt: 'Diamond earring on human ear — hyper-realistic on-body render',
    chips: ['Skin-Accurate', 'Photorealistic'],
  },
  editorial: {
    src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCSt7maIUGuU8JaH4udv3RVX8-ZzjtnHfHYKVAFYDq9MUFNhZ9HOnmTArjrgJQcLAWf4_e03WtACCBD4swoduNNYHitRxcISpwUQxGXRb7zQO-MuhFqgdCLrgHeO19OskhempAlGfBOdQo5bpoX5sUBY5AWgV8Iszs57aYCr8-xwksQQvZkGsmXlf1f7V0V-oM_PSG4wfFvCamrnPCLlEFJ3EAsvsTTC1O1NvN20G-RRFX0t0slMrXQ5mR8v_AYZvrLJl6iX1__PLw',
    alt: 'Luxury watch and diamond necklace on-body editorial grid',
  },
  gallery: [
    {
      src: 'https://lh3.googleusercontent.com/aida/ADBb0ugAGdiE8mijsvrLKy9AHIFYh1XtBq-pIoFNUUh3r518HaV_3HGEeIDLcNgvU5ak55yOxRIOtj22Ewhe3Eyd_zXJjScnMagNu-2waqkmp4VNa1BBK9MnE3mTyX1dqtw0ZOikBdiqMsU6b5sgNCAXyYdZEO10d4PUIgTxan_KFKbUNzeYUbhOR6f13vl2GPs0dHARkC-Ab0Ufc8WxFU-7Lsp6sGGENH5axzbjMDPvvVgHjkhLT7Vx0TAb1Z4',
      alt: 'Collarbone interaction — diamond necklace on skin',
      label: 'Collarbone Focus',
    },
    {
      src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCSt7maIUGuU8JaH4udv3RVX8-ZzjtnHfHYKVAFYDq9MUFNhZ9HOnmTArjrgJQcLAWf4_e03WtACCBD4swoduNNYHitRxcISpwUQxGXRb7zQO-MuhFqgdCLrgHeO19OskhempAlGfBOdQo5bpoX5sUBY5AWgV8Iszs57aYCr8-xwksQQvZkGsmXlf1f7V0V-oM_PSG4wfFvCamrnPCLlEFJ3EAsvsTTC1O1NvN20G-RRFX0t0slMrXQ5mR8v_AYZvrLJl6iX1__PLw',
      alt: 'Skin texture and facet reflection detail',
      label: 'Skin & Facet Study',
    },
    {
      src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBJ2w7uyxMVEy7PP-TM4sEdiMM8JY7lqglz2fEAQI3buE8dSV5RlqlxWCHEmzrNBJpAgHh7KCf7AAi4cGU40TwEZh4hSXcmi_v9rHHH0t63LDMRCf4Scy1CYwLBd35vF4viI8aasf-_-Sb6fOLYiqFuQc1kUX6QK0TEqn9s5l9vtNzyP3PB0ZLHOo6Lh0QfJPfUPFs7i721yMmJIEvdgvAatcNiJ77aMhfCGh5bFJJVN3MuE_grYZlA1XtEjpyz3WU7MwZR7Y3FWAU',
      alt: 'Metallic watch integration on realistic wrist',
      label: 'Metallic Integration',
    },
  ],
}

// ─── Creative Animation ────────────────────────────────────────────────────
export const CREATIVE_ANIM_IMAGES = {
  hero: {
    src: 'https://player.vimeo.com/external/283279530.hd.mp4?s=56aaf14aead8029dfc74ca224d0c984009989d24&profile_id=174',
    alt: 'Creative animation hero frame — Solitaire Diamond Engagement Ring',
    isVideo: true,
    chips: ['60fps', 'Cinematic Grading', '4K Output'],
    title: 'Solitaire Orbit',
    subtitle: 'Exhibit 01',
  },
  gallery: [
    {
      src: 'https://assets.mixkit.co/videos/preview/mixkit-machinery-of-a-very-close-watch-3673-large.mp4',
      thumb: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=cover',
      alt: 'Luxury watch movement detail close-up loop',
      label: 'Watch Mechanism',
      isVideo: true,
      aspectRatio: '3/4',
    },
    {
      src: 'https://assets.mixkit.co/videos/preview/mixkit-water-swirling-in-slow-motion-43026-large.mp4',
      thumb: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600&auto=format&fit=cover',
      alt: 'Creative swirling emerald fluid simulation loop',
      label: 'Emerald Flow',
      isVideo: true,
      aspectRatio: '4/5',
    },
    {
      src: 'https://assets.mixkit.co/videos/preview/mixkit-yellow-fluid-flow-39908-large.mp4',
      thumb: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=600&auto=format&fit=cover',
      alt: 'Flowing molten gold abstract animation loop',
      label: 'Liquid Gold',
      isVideo: true,
      aspectRatio: '16/9',
    },
    {
      src: 'https://assets.mixkit.co/videos/preview/mixkit-glass-spheres-in-motion-39824-large.mp4',
      thumb: 'https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?w=600&auto=format&fit=cover',
      alt: 'Refractive crystal glass spheres moving slowly loop',
      label: 'Crystal Spheres',
      isVideo: true,
      aspectRatio: '3/4',
    },
    {
      src: 'https://assets.mixkit.co/videos/preview/mixkit-red-and-yellow-liquid-mix-42289-large.mp4',
      thumb: 'https://images.unsplash.com/photo-1603561591411-07134e71a2a9?w=600&auto=format&fit=cover',
      alt: 'Asymmetric creative fluid colors mixing animation loop',
      label: 'Abstract Mix',
      isVideo: true,
      aspectRatio: '1/1',
    },
    {
      src: 'https://assets.mixkit.co/videos/preview/mixkit-abstract-glowing-gold-particles-41580-large.mp4',
      thumb: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=600&auto=format&fit=cover',
      alt: 'Luxury gold dust particles suspended in deep space loop',
      label: 'Gold Particles',
      isVideo: true,
      aspectRatio: '4/5',
    },
    {
      src: 'https://assets.mixkit.co/videos/preview/mixkit-curvy-lines-of-light-31804-large.mp4',
      thumb: 'https://images.unsplash.com/photo-1602751584552-8ba73aad10e1?w=600&auto=format&fit=cover',
      alt: 'Studio lighting reflection rigs dynamic curves loop',
      label: 'Reflection Curves',
      isVideo: true,
      aspectRatio: '3/4',
    },
    {
      src: 'https://assets.mixkit.co/videos/preview/mixkit-stars-in-space-background-1611-large.mp4',
      thumb: 'https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=600&auto=format&fit=cover',
      alt: 'Sparkling diamond-like stellar background loop',
      label: 'Stellar Sparkle',
      isVideo: true,
      aspectRatio: '1/1',
    },
    {
      src: 'https://assets.mixkit.co/videos/preview/mixkit-abstract-laser-lights-background-32120-large.mp4',
      thumb: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=600&auto=format&fit=cover',
      alt: 'Laser projection reflection abstract animation loop',
      label: 'Laser Raytrace',
      isVideo: true,
      aspectRatio: '4/5',
    },
    {
      src: 'https://assets.mixkit.co/videos/preview/mixkit-machinery-of-a-very-close-watch-3673-large.mp4',
      thumb: 'https://images.unsplash.com/photo-1509048191080-d2984bad6ae5?w=600&auto=format&fit=cover',
      alt: 'Precision gears rotating macro detail loop',
      label: 'Gear Rotation',
      isVideo: true,
      aspectRatio: '3/4',
    },
    {
      src: 'https://assets.mixkit.co/videos/preview/mixkit-water-swirling-in-slow-motion-43026-large.mp4',
      thumb: 'https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=600&auto=format&fit=cover',
      alt: 'Liquid fluid dynamics emerald animation loop',
      label: 'Fluid Study II',
      isVideo: true,
      aspectRatio: '4/5',
    },
    {
      src: 'https://assets.mixkit.co/videos/preview/mixkit-yellow-fluid-flow-39908-large.mp4',
      thumb: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=600&auto=format&fit=cover',
      alt: 'Liquid metal gold flow campaign sequence loop',
      label: 'Molten Shine',
      isVideo: true,
      aspectRatio: '16/9',
    },
    {
      src: 'https://assets.mixkit.co/videos/preview/mixkit-glass-spheres-in-motion-39824-large.mp4',
      thumb: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600&auto=format&fit=cover',
      alt: 'Crystal drop refraction close-up loop',
      label: 'Crystal Focus',
      isVideo: true,
      aspectRatio: '3/4',
    },
    {
      src: 'https://assets.mixkit.co/videos/preview/mixkit-red-and-yellow-liquid-mix-42289-large.mp4',
      thumb: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=600&auto=format&fit=cover',
      alt: 'Vibrant fluid simulation creative backdrop loop',
      label: 'Colour Wave',
      isVideo: true,
      aspectRatio: '1/1',
    },
    {
      src: 'https://assets.mixkit.co/videos/preview/mixkit-abstract-glowing-gold-particles-41580-large.mp4',
      thumb: 'https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?w=600&auto=format&fit=cover',
      alt: 'Luxury glitter particle fields slow motion loop',
      label: 'Stardust Orbit',
      isVideo: true,
      aspectRatio: '4/5',
    },
  ],
}

// ─── 360° Animation ────────────────────────────────────────────────────────
export const ANIMATION_360_IMAGES = {
  hero: {
    src: 'https://player.vimeo.com/external/283279530.hd.mp4?s=56aaf14aead8029dfc74ca224d0c984009989d24&profile_id=174',
    alt: '360 turntable animation — Solitaire Diamond Engagement Ring',
    isVideo: true,
    chips: ['Seamless Loop', 'Web Optimised', 'HDR Lit'],
  },
  gallery: [
    {
      src: 'https://assets.mixkit.co/videos/preview/mixkit-spinning-around-the-earth-29351-large.mp4',
      thumb: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=600&auto=format&fit=cover',
      alt: '360° seamless turntable orbit sequence loop',
      label: 'Full Turntable Orbit',
      isVideo: true,
      aspectRatio: '1/1',
    },
    {
      src: 'https://assets.mixkit.co/videos/preview/mixkit-machinery-of-a-very-close-watch-3673-large.mp4',
      thumb: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=cover',
      alt: 'Watch dial rotation studio lighting loop',
      label: 'Mechanical Rotate',
      isVideo: true,
      aspectRatio: '3/4',
    },
    {
      src: 'https://assets.mixkit.co/videos/preview/mixkit-curvy-lines-of-light-31804-large.mp4',
      thumb: 'https://images.unsplash.com/photo-1602751584552-8ba73aad10e1?w=600&auto=format&fit=cover',
      alt: 'Studio reflections light dome sweep loop',
      label: 'Light Dome Orbit',
      isVideo: true,
      aspectRatio: '4/5',
    },
    {
      src: 'https://assets.mixkit.co/videos/preview/mixkit-glass-spheres-in-motion-39824-large.mp4',
      thumb: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600&auto=format&fit=cover',
      alt: 'Refracted gemstone orbit sequence loop',
      label: 'Gemstone Refraction',
      isVideo: true,
      aspectRatio: '1/1',
    },
    {
      src: 'https://assets.mixkit.co/videos/preview/mixkit-yellow-fluid-flow-39908-large.mp4',
      thumb: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=600&auto=format&fit=cover',
      alt: 'Fluid gold pour turntable sweep loop',
      label: 'Gold Turntable',
      isVideo: true,
      aspectRatio: '16/9',
    },
    {
      src: 'https://assets.mixkit.co/videos/preview/mixkit-abstract-glowing-gold-particles-41580-large.mp4',
      thumb: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=600&auto=format&fit=cover',
      alt: 'Swirling star dust jewelry atmosphere loop',
      label: 'Glitter Orbit',
      isVideo: true,
      aspectRatio: '4/5',
    },
    {
      src: 'https://assets.mixkit.co/videos/preview/mixkit-water-swirling-in-slow-motion-43026-large.mp4',
      thumb: 'https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=600&auto=format&fit=cover',
      alt: 'Fluid dynamics sweep loop',
      label: 'Hydraulic Turn',
      isVideo: true,
      aspectRatio: '3/4',
    },
    {
      src: 'https://assets.mixkit.co/videos/preview/mixkit-red-and-yellow-liquid-mix-42289-large.mp4',
      thumb: 'https://images.unsplash.com/photo-1603561591411-07134e71a2a9?w=600&auto=format&fit=cover',
      alt: 'Liquid metal color rotation loop',
      label: 'Fluidic Sweep',
      isVideo: true,
      aspectRatio: '1/1',
    },
    {
      src: 'https://assets.mixkit.co/videos/preview/mixkit-stars-in-space-background-1611-large.mp4',
      thumb: 'https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?w=600&auto=format&fit=cover',
      alt: 'Sparkling diamond halo orbit space loop',
      label: 'Sparkle Sweep',
      isVideo: true,
      aspectRatio: '4/5',
    },
    {
      src: 'https://assets.mixkit.co/videos/preview/mixkit-abstract-laser-lights-background-32120-large.mp4',
      thumb: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=600&auto=format&fit=cover',
      alt: 'Laser scan orbit loop',
      label: 'Laser Sweep',
      isVideo: true,
      aspectRatio: '3/4',
    },
    {
      src: 'https://assets.mixkit.co/videos/preview/mixkit-machinery-of-a-very-close-watch-3673-large.mp4',
      thumb: 'https://images.unsplash.com/photo-1509048191080-d2984bad6ae5?w=600&auto=format&fit=cover',
      alt: 'Watch dial orbit rotation loop',
      label: 'Turntable Dial',
      isVideo: true,
      aspectRatio: '1/1',
    },
    {
      src: 'https://assets.mixkit.co/videos/preview/mixkit-spinning-around-the-earth-29351-large.mp4',
      thumb: 'https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=600&auto=format&fit=cover',
      alt: 'Asymmetric 360° orbit sweep loop',
      label: 'Turntable Spherical',
      isVideo: true,
      aspectRatio: '4/5',
    },
  ],
}
