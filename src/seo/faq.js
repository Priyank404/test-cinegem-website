// faq.js — FAQ sections and items for Cinegem Studio
// Plain ESM: NO JSX, NO `@/` alias, NO `import.meta.env`.
// Shared between src/pages/FaqPage.jsx and scripts/seo-postbuild.mjs.

export const CONFIRMED_FAQ_SECTIONS = [
  {
    id: 'studio',
    title: 'The studio',
    items: [
      {
        id: 'what-does-cinegem-studio-do',
        question: 'What does Cinegem Studio do?',
        answer: 'Cinegem Studio is a jewellery visualization studio. We turn jewellery designs into photorealistic 3D renders, cinematic CGI animation and on-body visuals for luxury jewellery brands.',
        status: 'confirmed',
      },
      {
        id: 'which-services-do-you-offer',
        question: 'Which services do you offer?',
        answer: 'Four services: [Classic E-Commerce](/classic) visuals, [Creative Visuals](/creative-visuals), [On-Body Visualization](/onbody), and an interactive 3D viewer that is currently in development.',
        status: 'confirmed',
      },
      {
        id: 'what-do-you-render-with',
        question: 'What do you render with?',
        answer: 'Our renders are produced with OctaneRender, a GPU path-tracing renderer.',
        status: 'confirmed',
      },
    ],
  },
  {
    id: 'classic',
    title: 'Classic E-Commerce',
    items: [
      {
        id: 'what-is-classic-e-commerce-visuals',
        question: 'What is Classic E-Commerce Visuals?',
        answer: 'Product imagery and video for luxury jewellery brands, built for online catalogues. Each piece is shown from front, side, angled and detail views.',
        status: 'confirmed',
      },
      {
        id: 'what-do-i-receive-classic',
        question: 'What do I receive?',
        answer: 'Multi-angle stills for each piece, together with product video. See the examples on the [Classic E-Commerce](/classic) page.',
        status: 'confirmed',
      },
    ],
  },
  {
    id: 'creative',
    title: 'Creative Visuals',
    items: [
      {
        id: 'what-are-creative-visuals',
        question: 'What are Creative Visuals?',
        answer: 'An edit of jewellery stills and motion for campaigns. See the full selection on the [Creative Visuals](/creative-visuals) page.',
        status: 'confirmed',
      },
    ],
  },
  {
    id: 'onbody',
    title: 'On-Body Visualization',
    items: [
      {
        id: 'what-is-on-body-visualization',
        question: 'What is on-body visualization?',
        answer: 'Photorealistic on-model composites that place your pieces in context without a photoshoot. See the [On-Body Visualization](/onbody) page.',
        status: 'confirmed',
      },
    ],
  },
  {
    id: 'viewer',
    title: 'Interactive 3D Viewer',
    items: [
      {
        id: 'is-the-3d-viewer-available',
        question: 'Is the 3D viewer available?',
        answer: 'Not yet. It is in development: a real-time WebGL viewer with live metal swapping, physically based diamond refraction and interactive controls. See the [3D Viewer](/3d-viewer) page.',
        status: 'confirmed',
      },
      {
        id: 'how-can-i-find-out-when-it-launches',
        question: 'How can I find out when it launches?',
        answer: '[Send an inquiry](/inquire) and mention the 3D viewer.',
        status: 'confirmed',
      },
    ],
  },
  {
    id: 'start',
    title: 'Starting a project',
    items: [
      {
        id: 'how-do-i-start-a-project',
        question: 'How do I start a project?',
        answer: 'Use the [inquiry form](/inquire): your name, email, company and a short brief. We will come back to you on the details.',
        status: 'confirmed',
      },
    ],
  },
];

const PENDING_FAQ_ITEMS_BY_SECTION = {
  studio: [
    {
      id: 'who-do-you-work-with',
      question: 'Who do you work with?',
      answer: 'Jewellery brands, designers and retailers who need jewellery shown at its best without a physical shoot.',
      status: 'pending',
    },
    {
      id: 'where-is-the-studio-based',
      question: 'Where is the studio based?',
      answer: '[ANSWER REQUIRED FROM OWNER: Surat, India? Confirm before using.]',
      status: 'pending',
    },
  ],
  classic: [
    {
      id: 'which-file-formats-do-you-accept',
      question: 'Which file formats do you accept?',
      answer: 'We work from 3D files such as Rhino (.3dm), STL and STEP.',
      status: 'pending',
    },
    {
      id: 'can-the-same-piece-be-shown-in-different-metals-or-stones',
      question: 'Can the same piece be shown in different metals or stones?',
      answer: 'Yes. Once a piece is set up, metal and stone variations can be rendered without rebuilding the scene.',
      status: 'pending',
    },
    {
      id: 'do-you-provide-360-turntable-videos',
      question: 'Do you provide 360° turntable videos?',
      answer: '[OWNER TO CONFIRM: yes/no, and which formats]',
      status: 'pending',
    },
  ],
  creative: [
    {
      id: 'what-do-you-need-from-me-to-begin',
      question: 'What do you need from me to begin?',
      answer: 'Your piece or collection as 3D files, plus any moodboard or campaign reference you have.',
      status: 'pending',
    },
    {
      id: 'can-the-visuals-be-formatted-for-social-and-screens',
      question: 'Can the visuals be formatted for social and screens?',
      answer: '[OWNER TO CONFIRM: ratios and sizes delivered]',
      status: 'pending',
    },
  ],
  onbody: [
    {
      id: 'how-do-you-get-the-scale-right',
      question: 'How do you get the scale right?',
      answer: '[OWNER TO CONFIRM how scale is calibrated]',
      status: 'pending',
    },
    {
      id: 'why-use-on-body-visuals-instead-of-a-model-shoot',
      question: 'Why use on-body visuals instead of a model shoot?',
      answer: 'They avoid casting, studio booking and sample shipping, and the same piece can be updated later.',
      status: 'pending',
    },
    {
      id: 'can-the-look-match-our-existing-brand-photography',
      question: 'Can the look match our existing brand photography?',
      answer: 'Yes, lighting and colour are matched to your existing imagery.',
      status: 'pending',
    },
  ],
  viewer: [],
  start: [
    {
      id: 'can-i-contact-you-directly',
      question: 'Can I contact you directly?',
      answer: 'Yes. Email [CONFIRMED_EMAIL] or use the inquiry form.',
      status: 'pending',
    },
    {
      id: 'do-you-sign-ndas',
      question: 'Do you sign NDAs?',
      answer: '[OWNER TO CONFIRM]',
      status: 'pending',
    },
    {
      id: 'how-long-does-a-project-take',
      question: 'How long does a project take?',
      answer: '[OWNER TO CONFIRM]',
      status: 'pending',
    },
    {
      id: 'what-does-a-project-cost',
      question: 'What does a project cost?',
      answer: '[OWNER TO CONFIRM]',
      status: 'pending',
    },
  ],
};

export const FAQ_SECTIONS = CONFIRMED_FAQ_SECTIONS.map((section) => ({
  ...section,
  items: [...section.items, ...(PENDING_FAQ_ITEMS_BY_SECTION[section.id] || [])],
}));

/**
 * Returns sections with only confirmed items.
 * Drops any sections that have 0 confirmed items.
 */
export function getConfirmedFaqSections() {
  return CONFIRMED_FAQ_SECTIONS;
}

/**
 * Counts total confirmed and pending items across all sections.
 */
export function getFaqCounts() {
  let confirmed = 0;
  let pending = 0;
  for (const section of FAQ_SECTIONS) {
    for (const item of section.items) {
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
