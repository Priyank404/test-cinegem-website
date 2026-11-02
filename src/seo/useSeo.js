import { useEffect } from 'react';
import { SITE_URL, SITE_NAME } from './site.js';
import { getRouteMetadata } from './routes.js';
import { buildJsonLd } from './schema.js';

function setMetaTag(attributeName, attributeValue, content) {
  if (typeof document === 'undefined') return;
  let element = document.head.querySelector(`meta[${attributeName}="${attributeValue}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attributeName, attributeValue);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

function setCanonical(href) {
  if (typeof document === 'undefined') return;
  let link = document.head.querySelector('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', href);
}

export function useSeo(routeKeyOrPath) {
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const route = getRouteMetadata(routeKeyOrPath);
    const pageUrl = `${SITE_URL}${route.path === '/' ? '' : route.path}`;
    const ogImageUrl = route.ogImage.startsWith('http')
      ? route.ogImage
      : `${SITE_URL}${route.ogImage.startsWith('/') ? '' : '/'}${route.ogImage}`;

    // 1. Title
    document.title = route.title;

    // 2. Standard Meta
    setMetaTag('name', 'description', route.description);
    setMetaTag('name', 'robots', route.indexable ? 'index, follow' : 'noindex, follow');

    // 3. Canonical
    setCanonical(pageUrl);

    // 4. Open Graph
    setMetaTag('property', 'og:title', route.title);
    setMetaTag('property', 'og:description', route.description);
    setMetaTag('property', 'og:url', pageUrl);
    setMetaTag('property', 'og:type', 'website');
    setMetaTag('property', 'og:site_name', SITE_NAME);
    setMetaTag('property', 'og:image', ogImageUrl);
    setMetaTag('property', 'og:locale', 'en_US');

    // 5. Twitter Card
    setMetaTag('name', 'twitter:card', 'summary_large_image');
    setMetaTag('name', 'twitter:title', route.title);
    setMetaTag('name', 'twitter:description', route.description);
    setMetaTag('name', 'twitter:image', ogImageUrl);

    // 6. JSON-LD Schema
    const jsonLdData = buildJsonLd(route);
    let scriptTag = document.head.querySelector('script[data-seo="true"]');
    if (jsonLdData) {
      if (!scriptTag) {
        scriptTag = document.createElement('script');
        scriptTag.type = 'application/ld+json';
        scriptTag.setAttribute('data-seo', 'true');
        document.head.appendChild(scriptTag);
      }
      scriptTag.textContent = JSON.stringify(jsonLdData);
    } else if (scriptTag) {
      scriptTag.remove();
    }

    return () => {
      // Cleanup JSON-LD on route unmount
      const currentScript = document.head.querySelector('script[data-seo="true"]');
      if (currentScript) {
        currentScript.remove();
      }
    };
  }, [routeKeyOrPath]);
}
