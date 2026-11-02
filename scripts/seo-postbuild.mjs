// scripts/seo-postbuild.mjs
// Build-time SEO post-processor for Cloudflare Pages.
// Generates per-route static HTML snapshots, sitemap.xml, robots.txt, _redirects, and _headers.

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { SITE_URL, SITE_NAME, LOGO_PATH } from '../src/seo/site.js';
import { ROUTES_LIST } from '../src/seo/routes.js';
import { buildJsonLd } from '../src/seo/schema.js';
import {
  FAQ_TREE,
  FAQ_CATEGORIES,
  getConfirmedFaqCategories,
  getConfirmedFaqTree,
  getFaqCounts,
  parseInlineLinks,
} from '../src/seo/faq.js';

const DIST_DIR = path.resolve('dist');
const TEMPLATE_PATH = path.join(DIST_DIR, 'index.html');

if (!fs.existsSync(TEMPLATE_PATH)) {
  console.error('[seo-postbuild] Error: dist/index.html does not exist. Run vite build first.');
  process.exit(1);
}

const baseTemplate = fs.readFileSync(TEMPLATE_PATH, 'utf8');

function getLastMod(filePath) {
  try {
    const gitDate = execSync(`git log -1 --format=%cI -- "${filePath}"`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
    }).trim();
    if (gitDate) return gitDate.split('T')[0];
  } catch (e) {
    // Git log failed or untracked
  }
  return new Date().toISOString().split('T')[0];
}

function buildStaticSnapshot(route) {
  let h1Text = '';
  let bodyHtml = '';

  if (route.path === '/') {
    h1Text = 'Cinegem Studio — jewellery 3D rendering and cinematic CGI';
    bodyHtml = `
      <p>${route.description}</p>
      <nav>
        <a href="/classic">Classic E-Commerce</a>
        <a href="/creative-visuals">Creative Visuals</a>
        <a href="/onbody">On-Body Visualization</a>
        <a href="/faq">FAQ</a>
        <a href="/inquire">Start a Project</a>
      </nav>
    `;
  } else if (route.path === '/faq') {
    h1Text = 'Frequently Asked Questions';
    const categories = getConfirmedFaqCategories();
    const categoriesHtml = categories
      .map((cat) => {
        const itemsHtml = cat.items
          .map((item) => {
            const answerHtml = parseInlineLinks(item.answer)
              .map((p) => (p.isLink ? `<a href="${p.url}">${p.text}</a>` : p.text))
              .join('');
            return `<h3>${item.question}</h3><p>${answerHtml}</p>`;
          })
          .join('\n');
        return `<h2>${cat.title}</h2><p>${cat.summary}</p>\n${itemsHtml}`;
      })
      .join('\n');

    bodyHtml = `
      <p>${route.description}</p>
      <nav>
        ${categories.map((c) => `<a href="#${c.id}">${c.title}</a>`).join('')}
      </nav>
      ${categoriesHtml}
    `;
  } else if (route.path === '/classic' || route.path === '/creative-visuals' || route.path === '/onbody') {
    const serviceH1 = {
      classic: 'Classic E-Commerce Visuals',
      creative: 'Creative Visuals',
      onbody: 'On-Body Visualization',
    };
    h1Text = serviceH1[route.key] || route.breadcrumbName;
    bodyHtml = `
      <p>${route.description}</p>
      <nav>
        <a href="/">Home</a>
        <a href="/classic">Classic E-Commerce</a>
        <a href="/creative-visuals">Creative Visuals</a>
        <a href="/onbody">On-Body Visualization</a>
        <a href="/faq">FAQ</a>
        <a href="/inquire">Start a Project</a>
      </nav>
    `;
  } else if (route.path === '/inquire') {
    h1Text = "Let's Create Something Rare.";
    bodyHtml = `
      <p>${route.description}</p>
      <nav>
        <a href="/">Home</a>
        <a href="/classic">Classic E-Commerce</a>
        <a href="/creative-visuals">Creative Visuals</a>
        <a href="/onbody">On-Body Visualization</a>
        <a href="/faq">FAQ</a>
      </nav>
    `;
  } else if (route.path === '/3d-viewer') {
    h1Text = 'Interactive 3D Viewer';
    bodyHtml = `
      <p>${route.description}</p>
      <nav>
        <a href="/">Home</a>
        <a href="/faq">FAQ</a>
        <a href="/inquire">Start a Project</a>
      </nav>
    `;
  }

  // Wrapped in an accessible, visually-hidden container replaced cleanly by React on mount
  return `<div style="position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;"><h1>${h1Text}</h1>${bodyHtml}</div>`;
}

function renderRouteHtml(route) {
  const pageUrl = `${SITE_URL}${route.path === '/' ? '' : route.path}`;
  const ogImageUrl = route.ogImage.startsWith('http')
    ? route.ogImage
    : `${SITE_URL}${route.ogImage.startsWith('/') ? '' : '/'}${route.ogImage}`;

  // Validate limits
  if (route.title.length > 60) {
    throw new Error(`Title exceeds 60 chars on ${route.path} (${route.title.length}): "${route.title}"`);
  }
  if (route.description.length > 155) {
    throw new Error(`Description exceeds 155 chars on ${route.path} (${route.description.length}): "${route.description}"`);
  }

  const jsonLd = buildJsonLd(route);
  const jsonLdScript = jsonLd
    ? `<script type="application/ld+json" data-seo="true">${JSON.stringify(jsonLd)}</script>`
    : '';

  let html = baseTemplate;

  // Replace <title>
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${route.title}</title>`);

  // Strip existing description, canonical, robots, OG, twitter meta tags from base template
  html = html.replace(/<meta\s+name=["']description["'][^>]*>/gi, '');
  html = html.replace(/<meta\s+name=["']robots["'][^>]*>/gi, '');
  html = html.replace(/<link\s+rel=["']canonical["'][^>]*>/gi, '');
  html = html.replace(/<meta\s+property=["']og:[^"']+["'][^>]*>/gi, '');
  html = html.replace(/<meta\s+name=["']twitter:[^"']+["'][^>]*>/gi, '');
  html = html.replace(/<script\s+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi, '');

  const newHeadTags = `
    <meta name="description" content="${route.description}" />
    <meta name="robots" content="${route.indexable ? 'index, follow' : 'noindex, follow'}" />
    <link rel="canonical" href="${pageUrl}" />
    <meta property="og:title" content="${route.title}" />
    <meta property="og:description" content="${route.description}" />
    <meta property="og:url" content="${pageUrl}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="${SITE_NAME}" />
    <meta property="og:image" content="${ogImageUrl}" />
    <meta property="og:locale" content="en_US" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${route.title}" />
    <meta name="twitter:description" content="${route.description}" />
    <meta name="twitter:image" content="${ogImageUrl}" />
    ${jsonLdScript}
  `.trim();

  // Insert before </head>
  html = html.replace('</head>', `  ${newHeadTags}\n  </head>`);

  // Insert snapshot inside <div id="root"></div>
  const snapshot = buildStaticSnapshot(route);
  html = html.replace('<div id="root"></div>', `<div id="root">${snapshot}</div>`);

  // Validation: exactly one canonical
  const canonicalMatches = html.match(/<link\s+rel=["']canonical["']/gi) || [];
  if (canonicalMatches.length !== 1) {
    throw new Error(`Expected exactly 1 canonical tag on ${route.path}, found ${canonicalMatches.length}`);
  }

  // Validation: exactly one <h1> in snapshot
  const h1Matches = html.match(/<h1[^>]*>/gi) || [];
  if (h1Matches.length !== 1) {
    throw new Error(`Expected exactly 1 <h1> tag in static snapshot on ${route.path}, found ${h1Matches.length}`);
  }

  return html;
}

// Print FAQ Counts
const faqCounts = getFaqCounts();
console.log(`[seo-postbuild] FAQ: ${faqCounts.confirmed} confirmed, ${faqCounts.pending} pending`);

console.log('[seo-postbuild] Processing static HTML snapshots...');

// 1. Generate HTML for each route
for (const route of ROUTES_LIST) {
  if (route.key === 'notFound') continue;

  const html = renderRouteHtml(route);
  if (route.path === '/') {
    fs.writeFileSync(path.join(DIST_DIR, 'index.html'), html, 'utf8');
    console.log(`  ✓ Written dist/index.html (/)`);
  } else {
    const routeDir = path.join(DIST_DIR, route.path.replace(/^\//, ''));
    if (!fs.existsSync(routeDir)) {
      fs.mkdirSync(routeDir, { recursive: true });
    }
    fs.writeFileSync(path.join(routeDir, 'index.html'), html, 'utf8');
    console.log(`  ✓ Written dist/${route.path.replace(/^\//, '')}/index.html`);
  }
}

// 2. Generate 404.html
const notFoundHtml = baseTemplate
  .replace(/<title>[\s\S]*?<\/title>/i, '<title>Page Not Found — Cinegem Studio</title>')
  .replace(/<meta\s+name=["']description["'][^>]*>/gi, '')
  .replace(
    '</head>',
    `  <meta name="description" content="The requested page could not be found." />
  <meta name="robots" content="noindex, nofollow" />
  <link rel="canonical" href="${SITE_URL}/404" />
</head>`
  )
  .replace(
    '<div id="root"></div>',
    `<div id="root"><div style="position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;"><h1>Page Not Found</h1><p>The requested page could not be found.</p><a href="/">Return to Home</a></div></div>`
  );
fs.writeFileSync(path.join(DIST_DIR, '404.html'), notFoundHtml, 'utf8');
console.log(`  ✓ Written dist/404.html`);

// 3. Generate robots.txt
const robotsTxt = `User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`;
fs.writeFileSync(path.join(DIST_DIR, 'robots.txt'), robotsTxt, 'utf8');
console.log(`  ✓ Written dist/robots.txt`);

// 4. Generate sitemap.xml
const indexableRoutes = ROUTES_LIST.filter((r) => r.indexable && r.key !== 'notFound');
const routeSourceFiles = {
  home: 'src/pages/HomePage.jsx',
  classic: 'src/pages/ClassicEComVisuals.jsx',
  creative: 'src/pages/CreativeVisualsPage.jsx',
  onbody: 'src/pages/OnBodyVisualizationPage.jsx',
  inquire: 'src/pages/InquirePage.jsx',
  faq: 'src/pages/FaqPage.jsx',
};

const sitemapEntries = indexableRoutes
  .map((route) => {
    const loc = route.path === '/' ? `${SITE_URL}/` : `${SITE_URL}${route.path}`;
    const srcFile = routeSourceFiles[route.key] || 'src/App.jsx';
    const lastMod = getLastMod(srcFile);
    return `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastMod}</lastmod>
  </url>`;
  })
  .join('\n');

const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapEntries}
</urlset>
`;

if (indexableRoutes.length !== 6) {
  throw new Error(`Sitemap must contain exactly 6 URLs, found ${indexableRoutes.length}`);
}
fs.writeFileSync(path.join(DIST_DIR, 'sitemap.xml'), sitemapXml, 'utf8');
console.log(`  ✓ Written dist/sitemap.xml (${indexableRoutes.length} URLs)`);

// 5. Generate _redirects
const redirectsTxt = `/hero2        /            301
/3dviewer     /3d-viewer   301
/index.html   /            301
`;
fs.writeFileSync(path.join(DIST_DIR, '_redirects'), redirectsTxt, 'utf8');
console.log(`  ✓ Written dist/_redirects`);

// 6. Generate _headers
const headersTxt = `/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin

/assets/*
  Cache-Control: public, max-age=31536000, immutable

/3d-viewer
  X-Robots-Tag: noindex, follow

https://:project.pages.dev/*
  X-Robots-Tag: noindex
`;
fs.writeFileSync(path.join(DIST_DIR, '_headers'), headersTxt, 'utf8');
console.log(`  ✓ Written dist/_headers`);

// 7. Validate: No pending FAQ item appears anywhere in dist/
console.log('[seo-postbuild] Validating zero pending FAQ items in dist/...');
const pendingItems = [];
for (const cat of FAQ_TREE) {
  for (const item of cat.items) {
    if (item.status === 'pending') {
      pendingItems.push(item);
    }
  }
}

function scanDirForPending(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanDirForPending(fullPath);
    } else if (entry.name.endsWith('.html') || entry.name.endsWith('.js')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      for (const item of pendingItems) {
        if (content.includes(item.question)) {
          throw new Error(
            `Pending FAQ question found in ${path.relative(process.cwd(), fullPath)}: "${item.question}"`
          );
        }
        if (
          item.answer &&
          item.answer.length > 25 &&
          !item.answer.startsWith('[') &&
          content.includes(item.answer)
        ) {
          throw new Error(
            `Pending FAQ answer found in ${path.relative(process.cwd(), fullPath)}: "${item.answer}"`
          );
        }
      }
    }
  }
}

scanDirForPending(DIST_DIR);
console.log('  ✓ Verified zero pending FAQ items anywhere in dist/');

console.log('[seo-postbuild] Post-build completed successfully with 100% verification.');
