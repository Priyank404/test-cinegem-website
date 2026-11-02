// schema.js — JSON-LD structured data generators
// Plain ESM; shared between client-side useSeo hook and scripts/seo-postbuild.mjs.

import { SITE_URL, SITE_NAME, LOGO_PATH, CONTACT_EMAIL, SOCIAL_LINKS } from './site.js';

export function buildJsonLd(route) {
  if (!route || !route.indexable) {
    return null;
  }

  const organization = {
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}${LOGO_PATH}`,
    sameAs: [SOCIAL_LINKS.instagram, SOCIAL_LINKS.behance],
    email: CONTACT_EMAIL,
  };

  const website = {
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    url: SITE_URL,
    name: SITE_NAME,
    publisher: { '@id': `${SITE_URL}/#organization` },
  };

  const graph = [organization, website];

  if (route.schemaType === 'Service' && route.path !== '/') {
    const service = {
      '@type': 'Service',
      '@id': `${SITE_URL}${route.path}/#service`,
      name: route.serviceName || route.title,
      description: route.description,
      provider: { '@id': `${SITE_URL}/#organization` },
    };

    const breadcrumbs = {
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: `${SITE_URL}/`,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: route.breadcrumbName || route.title,
          item: `${SITE_URL}${route.path}`,
        },
      ],
    };

    graph.push(service, breadcrumbs);
  }

  return {
    '@context': 'https://schema.org',
    '@graph': graph,
  };
}
