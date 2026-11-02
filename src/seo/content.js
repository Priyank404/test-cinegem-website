// content.js — Light SEO copy definitions for service pages
// Plain ESM: safe for both client components and scripts/seo-postbuild.mjs.

export const SEO_CONTENT = {
  classic: {
    kicker: 'Studio Notes',
    h1Text: 'Classic E-Commerce Visuals',
    heading: 'Jewellery Rendering for E-Commerce & 360° Turntable Visuals',
    intro: 'Precision catalog renders crafted directly from your CAD files. We sculpt studio lighting to reveal metal purity, prong architecture, and gemstone cut symmetry for digital boutiques and wholesale presentations.',
    deliverablesTitle: 'What You Receive',
    deliverables: [
      'Pure white and neutral backdrop catalog stills for e-commerce listings',
      'Smooth 360° video turntable loops ready for web stores and social media',
      'Extreme macro detail frames showing hallmarks, settings, and stone facets',
      'Consistent multi-piece angle suites for cohesive jewelry collection displays',
    ],
    processTitle: 'How It Works',
    process: 'Send your master 3D CAD files (.3dm, STL). We refine geometry bevels, apply physically based gold, platinum, and gemstone materials, configure balanced studio illumination, and deliver production-ready imagery.',
    faqs: [
      {
        question: 'Which CAD formats are supported for e-commerce renders?',
        answer: 'We work with industry-standard 3D CAD formats including Rhino (.3dm), MatrixGold, STL, and STEP geometry files.',
      },
      {
        question: 'Can you generate metal alloy variations from one model?',
        answer: 'Yes. Once a master 3D CAD piece is prepared, we can render 18K yellow gold, rose gold, white gold, and platinum variations without rebuilding the scene.',
      },
      {
        question: 'Are 360-degree turntable loops compatible with Shopify and web browsers?',
        answer: 'Yes. We deliver web-optimized MP4 and WebM video loops that integrate directly into Shopify, WooCommerce, and custom luxury e-commerce platforms.',
      },
    ],
    links: [
      { label: 'Creative Visuals', to: '/creative-visuals' },
      { label: 'On-Body Visualization', to: '/onbody' },
      { label: 'Start a Project', to: '/inquire' },
    ],
  },

  creative: {
    kicker: 'Studio Notes',
    h1Text: 'Creative Visuals',
    heading: 'Cinematic Jewellery CGI & Motion Animation for Luxury Campaigns',
    intro: 'Atmospheric brand films and editorial stills engineered for high jewellery launches. We combine dynamic camera choreography, micro light sweeps, and raytraced caustics to turn fine jewelry design into moving visual art.',
    deliverablesTitle: 'What You Receive',
    deliverables: [
      'Cinematic motion sequences with shallow focal depth and volumetric atmosphere',
      'High-resolution editorial stills tailored for campaign hero banners and print',
      'Social-first vertical formats (9:16) for luxury Instagram and digital boutique reels',
      'Bespoke lighting direction accentuating diamond brilliance and precious metals',
    ],
    processTitle: 'How It Works',
    process: 'Starting from your collection narrative and CAD data, we storyboard key camera motions, sculpt custom lighting environments in OctaneRender, choreograph focal shifts, and output seamless motion masters.',
    faqs: [
      {
        question: 'How do you capture diamond fire and gemstone reflections in animation?',
        answer: 'We compute spectral light dispersion and optical refraction through physically accurate raytracing, ensuring gemstone brilliance and facet fire match genuine stones.',
      },
      {
        question: 'Can creative motion assets be formatted for social media and display screens?',
        answer: 'Yes. We output master deliverables in 16:9 widescreen, 1:1 square, and 9:16 vertical framing for digital boutiques, web headers, and mobile feeds.',
      },
      {
        question: 'What is required to begin a creative CGI animation project?',
        answer: 'Your collection CAD files alongside any visual moodboard or campaign reference. We handle shader preparation, scene composition, and final cinematic rendering.',
      },
    ],
    links: [
      { label: 'Classic E-Commerce', to: '/classic' },
      { label: 'On-Body Visualization', to: '/onbody' },
      { label: 'Start a Project', to: '/inquire' },
    ],
  },

  onbody: {
    kicker: 'Studio Notes',
    h1Text: 'On-Body Visualization',
    heading: 'Photorealistic On-Body Jewellery Visualization & Digital Compositing',
    intro: 'Place your rings, necklaces, bracelets, and earrings in authentic human context without coordinating a physical photoshoot. We ensure anatomically precise scale, authentic contact shadows, and natural skin interaction.',
    deliverablesTitle: 'What You Receive',
    deliverables: [
      'High-fidelity on-model composites for rings, earrings, pendants, and bracelets',
      'Accurate millimeter scale mapping calibrated against real anatomy',
      'Realistic skin subsurface lighting and specular reflection interaction',
      'Diverse skin tones and model positions tailored to your jewelry brand identity',
    ],
    processTitle: 'How It Works',
    process: 'Your 3D CAD assets are calibrated to real-world metric dimensions and composited into curated high-resolution photography. We match focal length, ambient lighting, and contact occlusion for seamless realism.',
    faqs: [
      {
        question: 'How do you ensure correct scale on human models?',
        answer: 'We calibrate the CAD file millimeters directly to reference measurements of human anatomy, ensuring accurate proportions for ring finger widths and necklace drops.',
      },
      {
        question: 'Why choose on-body 3D visualization over traditional model photoshoots?',
        answer: 'On-body CGI eliminates casting logistics, sample shipping insurance, travel delays, and studio booking overhead while enabling easy metal color swaps later.',
      },
      {
        question: 'Can on-body visuals match existing brand photography styles?',
        answer: 'Yes. We calibrate lighting direction, contrast, and color balance to align harmoniously with your existing brand imagery and editorial lookbooks.',
      },
    ],
    links: [
      { label: 'Classic E-Commerce', to: '/classic' },
      { label: 'Creative Visuals', to: '/creative-visuals' },
      { label: 'Start a Project', to: '/inquire' },
    ],
  },
};
