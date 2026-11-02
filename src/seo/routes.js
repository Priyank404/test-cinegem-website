// routes.js — Route metadata definitions
// Plain ESM: NO JSX, NO `@/` alias, NO `import.meta.env`.
// Imported directly by Vite browser code and scripts/seo-postbuild.mjs.

import { DEFAULT_OG_IMAGE } from './site.js';

export const ROUTES = {
  home: {
    key: 'home',
    path: '/',
    title: 'Cinegem Studio — Jewellery 3D Rendering & CGI',
    description: 'Cinegem Studio creates photorealistic jewellery renders, cinematic CGI animation and on-body visualization for luxury jewellery brands.',
    indexable: true,
    ogImage: DEFAULT_OG_IMAGE,
    breadcrumbName: 'Home',
    schemaType: 'WebSite',
  },
  classic: {
    key: 'classic',
    path: '/classic',
    title: 'E-Commerce Jewellery Rendering & 360° Spins — Cinegem',
    description: 'Catalog-ready jewellery renders, multi-angle stills and 360° turntable videos made from your CAD files by Cinegem Studio.',
    indexable: true,
    ogImage: DEFAULT_OG_IMAGE,
    breadcrumbName: 'Classic E-Commerce',
    schemaType: 'Service',
    serviceName: 'E-Commerce Jewellery Rendering & 360° Spins',
  },
  creative: {
    key: 'creative',
    path: '/creative-visuals',
    title: 'Cinematic Jewellery CGI & Creative Visuals — Cinegem',
    description: 'Editorial jewellery stills and cinematic CGI animation for campaigns, social and boutique screens, from Cinegem Studio.',
    indexable: true,
    ogImage: DEFAULT_OG_IMAGE,
    breadcrumbName: 'Creative Visuals',
    schemaType: 'Service',
    serviceName: 'Cinematic Jewellery CGI & Creative Visuals',
  },
  onbody: {
    key: 'onbody',
    path: '/onbody',
    title: 'On-Body Jewellery Visualization & Compositing — Cinegem',
    description: 'Photorealistic on-model jewellery visuals without a photoshoot: correct scale, natural skin and contact shadows. By Cinegem Studio.',
    indexable: true,
    ogImage: DEFAULT_OG_IMAGE,
    breadcrumbName: 'On-Body Visualization',
    schemaType: 'Service',
    serviceName: 'On-Body Jewellery Visualization & Compositing',
  },
  inquire: {
    key: 'inquire',
    path: '/inquire',
    title: 'Start a Project — Jewellery Rendering Studio — Cinegem',
    description: 'Tell Cinegem Studio about your collection and get a response on rendering, animation or on-body visuals for your jewellery.',
    indexable: true,
    ogImage: DEFAULT_OG_IMAGE,
    breadcrumbName: 'Inquire',
    schemaType: 'Service',
    serviceName: 'Jewellery Rendering Project Inquiry',
  },
  threeDViewer: {
    key: 'threeDViewer',
    path: '/3d-viewer',
    title: 'Interactive 3D Jewellery Viewer (Coming Soon) — Cinegem',
    description: 'A real-time WebGL jewellery customizer from Cinegem Studio is in development.',
    indexable: false,
    ogImage: DEFAULT_OG_IMAGE,
    breadcrumbName: '3D Viewer',
    schemaType: null,
  },
};

export const ROUTES_LIST = Object.values(ROUTES);

export function getRouteMetadata(routeKeyOrPath) {
  if (!routeKeyOrPath) return ROUTES.home;
  if (ROUTES[routeKeyOrPath]) return ROUTES[routeKeyOrPath];
  const found = ROUTES_LIST.find(
    (r) => r.path === routeKeyOrPath || r.path === `/${routeKeyOrPath.replace(/^\//, '')}`
  );
  return found || ROUTES.home;
}
