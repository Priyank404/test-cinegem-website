// content.js — Slim verified SEO copy definitions for service pages (footer notes)
// Plain ESM: safe for both client components and scripts/seo-postbuild.mjs.

export const SEO_CONTENT = {
  classic: {
    kicker: 'Studio Notes',
    heading: 'Jewellery Rendering for Online Catalogues',
    intro: 'Premium product imagery and video for luxury jewellery brands. Each piece is shown from front, side, angled and detail views, rendered with studio lighting that keeps metal, stones and settings true to the design.',
    deliverables: [
      'Multi-angle stills for every piece',
      'Product video alongside the stills',
      'A consistent look across a whole collection',
    ],
    process: 'Share your 3D model and brief, and we handle materials, lighting and rendering.',
    links: [
      { label: 'More answers in the FAQ', to: '/faq#classic', isFaq: true },
      { label: 'Creative Visuals', to: '/creative-visuals' },
      { label: 'On-Body Visualization', to: '/onbody' },
      { label: 'Start a Project', to: '/inquire' },
    ],
  },

  creative: {
    kicker: 'Studio Notes',
    heading: 'Cinematic Jewellery CGI & Creative Visuals',
    intro: 'An edit of jewellery stills and motion for campaigns: considered camera moves, controlled light and reflections that show a piece the way a collection story needs it shown.',
    deliverables: [
      'Editorial stills for campaigns',
      'Cinematic motion sequences',
      'Visuals directed around your collection',
    ],
    process: 'Tell us the mood and the pieces, and we build the scene around them.',
    links: [
      { label: 'More answers in the FAQ', to: '/faq#creative', isFaq: true },
      { label: 'Classic E-Commerce', to: '/classic' },
      { label: 'On-Body Visualization', to: '/onbody' },
      { label: 'Start a Project', to: '/inquire' },
    ],
  },

  onbody: {
    kicker: 'Studio Notes',
    heading: 'On-Body Jewellery Visualization',
    intro: 'Photorealistic on-model composites that place your pieces in context without a photoshoot, with believable scale, contact shadows and skin interaction.',
    deliverables: [
      'Rings, earrings, pendants and bracelets shown on the body',
      'Scale that reads correctly at a glance',
      'Visuals that sit alongside your existing imagery',
    ],
    process: 'Send the piece and the look you want, and we composite it into place.',
    links: [
      { label: 'More answers in the FAQ', to: '/faq#onbody', isFaq: true },
      { label: 'Classic E-Commerce', to: '/classic' },
      { label: 'Creative Visuals', to: '/creative-visuals' },
      { label: 'Start a Project', to: '/inquire' },
    ],
  },
};
