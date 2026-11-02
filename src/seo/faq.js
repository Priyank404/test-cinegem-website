// faq.js — Clean 2-Tier FAQ Knowledge Base for Cinegem Studio (Category -> Question)
// Plain ESM: NO JSX, NO `@/` alias, NO `import.meta.env`.
// Shared between src/pages/FaqPage.jsx and scripts/seo-postbuild.mjs.

export const FAQ_CATEGORIES = [
  {
    id: 'studio',
    title: 'Studio & Rendering Technology',
    summary: 'GPU path-tracing, optical diamond dispersion, and our studio production philosophy.',
    items: [
      {
        id: 'what-is-cinegem-studio',
        question: 'What does Cinegem Studio specialize in, and how does 3D CGI compare to traditional photography?',
        answer: 'Cinegem Studio is a dedicated high jewellery 3D CGI and digital visualization atelier. We engineer photorealistic catalog stills, smooth 360° turntable loops, cinematic campaign films, and anatomical on-body visuals directly from CAD geometry. Traditional jewelry photography frequently struggles with camera lens depth-of-field limitations, micro-dust, reflection glare, and costly physical sample manufacturing delays. In contrast, our 3D path-tracing pipeline delivers microscopic clarity across every prong and diamond facet, perfectly controlled studio lighting, and zero physical sample risk.',
        status: 'confirmed',
      },
      {
        id: 'who-does-cinegem-serve',
        question: 'Which types of jewelry brands and maisons benefit most from Cinegem’s visualization services?',
        answer: 'We partner with bespoke high jewellery maisons, diamond retailers, independent designers, and direct-to-consumer fine jewelry brands worldwide. Whether launching an unmanufactured bridal collection for pre-orders, refreshing an entire 500-piece e-commerce catalog with unified lighting, or producing 4K campaign motion for flagship boutique video walls, our digital pipeline scales seamlessly to meet luxury standards without requiring physical inventory logistics.',
        status: 'confirmed',
      },
      {
        id: 'what-rendering-engine-do-you-use',
        question: 'What visual pipeline powers Cinegem’s photorealistic jewelry imagery?',
        answer: 'Our studio operates a proprietary, physically calibrated optical rendering pipeline engineered specifically for high jewellery. It accurately simulates true photon transport, dispersion caustics, and multi-bounce light interaction within precious metals and gemstones. By combining specialized optical physics with gemological expertise, we reproduce authentic metal micro-surfacing, true anisotropy, and the intricate internal reflection unique to fine diamond cuts.',
        status: 'confirmed',
      },
      {
        id: 'how-do-you-achieve-realistic-gemstone-fire',
        question: 'How do you replicate authentic diamond brilliance, fire, and gemstone dispersion in digital renders?',
        answer: 'Authentic gemstone realism requires physically accurate spectral dispersion — the mathematical separation of white light into spectral rainbow flashes as rays refract through the pavilion and table of a faceted stone. We compute exact refractive indices (such as Diamond at 2.417 with Cauchy dispersion values), total internal reflection, and facet edge beveling to ensure that solitaire marquise, oval, brilliant, and pavé cuts emit the unmistakable scintillating fire of genuine stones.',
        status: 'confirmed',
      },
    ],
  },
  {
    id: 'classic',
    title: 'Classic E-Commerce & 360° Visuals',
    summary: 'Catalog-ready multi-angle suites, turntable video loops, and material swapping for digital boutiques.',
    items: [
      {
        id: 'what-deliverables-are-included-classic',
        question: 'What exact deliverables are included in a standard Classic E-Commerce visual package?',
        answer: 'Each piece commissioned under [Classic E-Commerce](/classic) receives a comprehensive digital asset suite: pure front elevation, side silhouette, 45° perspective showcase, and extreme macro crown/prong detail frames delivered in crisp 4K resolution (PNG with transparent alpha or solid pure white/neutral backdrops). In addition, every suite can be complemented by seamless 360° turntable loops formatted for direct Shopify, WooCommerce, and luxury boutique integration.',
        status: 'confirmed',
      },
      {
        id: 'do-you-provide-360-degree-turntable-videos',
        question: 'Do you provide 360-degree turntable video loops for e-commerce product pages?',
        answer: 'Yes. We deliver smooth, continuous 360° turntable animations with balanced studio lighting that illuminates every facet and hallmark continuously as the piece rotates. Delivered in lightweight, web-optimized MP4 and WebM formats (H.264 / H.265 compression), these loops autoplay flawlessly on mobile browsers and desktop storefronts with instantaneous load times.',
        status: 'confirmed',
      },
      {
        id: 'which-3d-cad-formats-do-you-accept',
        question: 'Which 3D CAD formats and geometry files do you accept for e-commerce rendering?',
        answer: 'We accept all industry-standard jewelry CAD formats, including Rhino (.3dm), Gemvision Matrix / MatrixGold, raw STL, STEP (.stp), and IGES (.igs) files. Our studio technicians inspect every mesh geometry, smoothing microscopic faceting curves, beveling sharp digital edges, and applying authentic prong seat geometry prior to shader assignment.',
        status: 'confirmed',
      },
      {
        id: 'can-we-render-multiple-metal-and-gemstone-variations',
        question: 'Can we generate metal alloy and gemstone variations from a single CAD file without rebuilding the scene?',
        answer: 'Yes, this is one of the greatest economic advantages of digital jewelry CGI. Once your master CAD file is prepared and illuminated in our digital studio, we can render 18K Yellow Gold, Rose Gold, White Gold, and 950 Platinum variations, as well as interchangeable center stones (such as Diamond, Sapphire, Emerald, or Ruby), in a fraction of the time and cost required for physical sample production.',
        status: 'confirmed',
      },
    ],
  },
  {
    id: 'creative',
    title: 'Cinematic Creative Visuals & Motion CGI',
    summary: 'Editorial stills, choreographed camera movements, and atmospheric campaign films.',
    items: [
      {
        id: 'what-are-creative-visuals-and-campaign-films',
        question: 'What distinguishes Creative Visuals from standard catalog rendering?',
        answer: 'While Classic E-Commerce focuses on crisp product documentation, [Creative Visuals](/creative-visuals) elevates fine jewelry into high-fashion cinema. We design bespoke narrative lighting environments, choreograph sweeping macro camera trajectories, and simulate shallow depth-of-field, volumetric haze, and dynamic raytraced reflections. These assets are built specifically for brand hero banners, digital billboards, seasonal collection launches, and social media storytelling.',
        status: 'confirmed',
      },
      {
        id: 'what-creative-direction-is-required-to-start',
        question: 'What is required from a jewelry brand to begin a creative CGI campaign project?',
        answer: 'To initiate a creative commission, you share your master 3D CAD files alongside your collection brief, moodboard, or reference deck (such as target color palettes, musical cadence, or editorial themes). Our art directors storyboard camera moves and lighting angles, providing preview animatics for your review and sign-off before full-resolution path-tracing begins.',
        status: 'confirmed',
      },
      {
        id: 'what-aspect-ratios-and-video-formats-are-delivered',
        question: 'Can creative CGI animations be tailored for luxury social media reels, digital boutique screens, and web heroes?',
        answer: 'Yes. We deliver multi-ratio production masters tailored for all omnichannel touchpoints: vertical 9:16 for Instagram Reels and TikTok, 1:1 square for feed campaigns, 16:9 widescreen for desktop hero headers and YouTube, and ultra-high resolution panoramic formats for in-store boutique LED walls and exhibition displays.',
        status: 'confirmed',
      },
    ],
  },
  {
    id: 'onbody',
    title: 'On-Body Digital Visualization',
    summary: 'Photorealistic on-model composites with accurate metric scale, natural skin tones, and contact shadows.',
    items: [
      {
        id: 'what-is-on-body-visualization-and-compositing',
        question: 'What is on-body jewelry visualization and how does digital compositing work?',
        answer: '[On-Body Visualization](/onbody) seamlessly places your 3D jewelry designs onto real human models without coordinating an in-person photoshoot. We calculate precise metric millimeter proportions from your CAD data and composite the rendered piece onto high-fashion model photography, matching focal perspective, ambient occlusion, and subsurface skin lighting so that the jewelry appears naturally worn.',
        status: 'confirmed',
      },
      {
        id: 'how-do-you-guarantee-accurate-scale-on-models',
        question: 'How do you guarantee anatomically accurate scale and natural skin contact shadows for rings and necklaces?',
        answer: 'We calibrate jewelry dimensions against anatomical biometric standards — calculating exact ring inner circumferences for finger diameters, pendant drop lengths across collarbones, and earlobe anchor points for huggies and drop earrings. Soft contact shadows and diffuse skin reflections are digitally simulated so the piece never appears artificially pasted on.',
        status: 'confirmed',
      },
      {
        id: 'why-choose-digital-on-body-visuals-over-a-live-photoshoot',
        question: 'Why should a jewelry brand choose digital on-body visualization over a live model photoshoot?',
        answer: 'A traditional fine jewelry photoshoot introduces extensive overhead: model agency fees, stylist booking, studio rental, armored courier shipping, high-value insurance policies, and post-production retouching. Digital on-body visualization eliminates sample risk, avoids expensive travel logistics, allows instant metal or stone swaps months later, and delivers pristine editorial imagery at a predictable project cost.',
        status: 'confirmed',
      },
    ],
  },
  {
    id: 'others',
    title: 'Others',
    summary: 'Interactive 3D engine, turnaround timelines, confidentiality NDAs, and project commissioning.',
    items: [
      {
        id: 'what-is-the-cinegem-interactive-3d-viewer',
        question: 'What is the upcoming Cinegem Interactive 3D viewer and how will it work?',
        answer: 'Our in-development [Interactive 3D Viewer](/3d-viewer) brings studio-grade jewelry visualization directly into mobile and desktop web browsers without external plugins or downloads. Clients and collectors can smoothly rotate creations in real-time 360° space, toggle between 18K yellow gold, rose gold, and platinum, and observe authentic diamond refractions with instant tactile responsiveness.',
        status: 'confirmed',
      },
      {
        id: 'how-can-brands-access-or-pilot-the-3d-viewer',
        question: 'How can jewelry brands test or request early access for the interactive 3D viewer?',
        answer: 'We are currently onboarding select jewelry maisons and e-commerce partners for private beta demonstrations and pilot integrations. If you would like to showcase your flagship collection through an interactive real-time configurator, please reach out via our [Inquiry Form](/inquire) and note your interest in the 3D Engine.',
        status: 'confirmed',
      },
      {
        id: 'how-do-we-start-a-jewelry-rendering-project',
        question: 'How do we commission a new project with Cinegem Studio?',
        answer: 'Getting started is straightforward. Submit your project requirements through our [Inquiry Form](/inquire) or email our team directly at [info@cinegemstudio.com](mailto:info@cinegemstudio.com). Provide details regarding the number of pieces, desired services (Classic E-Commerce, Creative Campaign, or On-Body), timeline targets, and available CAD assets. We will respond with a tailored proposal and production roadmap.',
        status: 'confirmed',
      },
      {
        id: 'what-is-the-standard-production-timeline',
        question: 'What is the typical production timeline for an e-commerce catalog or creative campaign?',
        answer: 'Typically, a standard Classic E-Commerce suite for 5–10 pieces is delivered within 4 to 7 business days from CAD validation. Creative campaign films and bespoke motion choreography typically take 1 to 3 weeks, including animatic review, lighting approval, and final 4K rendering.',
        status: 'confirmed',
      },
      {
        id: 'do-you-sign-non-disclosure-agreements-ndas',
        question: 'Do you sign mutual Non-Disclosure Agreements (NDAs) to protect unreleased jewelry designs?',
        answer: 'Yes, unconditionally. We routinely work with unreleased high jewellery designs, proprietary mechanism patents, and upcoming seasonal collections. We sign mutual Non-Disclosure Agreements (NDAs) prior to receiving any CAD geometry or design documentation, and all project files are stored in encrypted environments accessible solely by senior artists.',
        status: 'confirmed',
      },
      {
        id: 'how-is-pricing-structured-for-jewelry-cgi',
        question: 'How is project pricing determined for jewelry rendering and animation?',
        answer: 'Pricing is structured transparently per piece or per collection scope. Factors influencing cost include the number of pieces, complexity of pave stone counts, quantity of deliverable angles, video turntable requirements, and multi-metal variations. We provide clear, itemized fixed-price quotes prior to project kickoff with zero hidden charges.',
        status: 'confirmed',
      },
    ],
  },
];

/**
 * Returns categories with only confirmed items.
 */
export function getConfirmedFaqCategories() {
  return FAQ_CATEGORIES.map((cat) => ({
    ...cat,
    items: cat.items.filter((item) => item.status === 'confirmed'),
  })).filter((cat) => cat.items.length > 0);
}

// Aliases for compatibility
export const FAQ_TREE = FAQ_CATEGORIES;
export const FAQ_SECTIONS = FAQ_CATEGORIES;
export const getConfirmedFaqSections = getConfirmedFaqCategories;
export const getConfirmedFaqTree = getConfirmedFaqCategories;

/**
 * Returns total confirmed and pending counts.
 */
export function getFaqCounts() {
  let confirmed = 0;
  let pending = 0;
  for (const cat of FAQ_CATEGORIES) {
    for (const item of cat.items) {
      if (item.status === 'confirmed') {
        confirmed += 1;
      } else {
        pending += 1;
      }
    }
  }
  return { confirmed, pending, total: confirmed + pending };
}

/**
 * Parses inline markdown-style links [text](url) into structured tokens.
 */
export function parseInlineLinks(text) {
  if (!text) return [];
  const parts = [];
  const regex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ text: text.substring(lastIndex, match.index), isLink: false });
    }
    parts.push({ text: match[1], url: match[2], isLink: true });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push({ text: text.substring(lastIndex), isLink: false });
  }
  return parts;
}
