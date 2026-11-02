// site.js — Site-wide SEO constants and configuration
// Plain ESM; safe in browser and Node.js build scripts.

const resolveSiteUrl = () => {
  if (typeof process !== 'undefined' && process.env && process.env.VITE_SITE_URL) {
    return process.env.VITE_SITE_URL;
  }
  if (typeof window !== 'undefined' && typeof window.__VITE_SITE_URL__ !== 'undefined') {
    return window.__VITE_SITE_URL__;
  }
  return 'https://cinegem.studio';
};

export const SITE_URL = resolveSiteUrl();
export const SITE_NAME = 'Cinegem Studio';
export const DEFAULT_OG_IMAGE = '/4.png';
export const LOGO_PATH = '/logo-white.png';
export const CONTACT_EMAIL = 'hello@cinegemstudio.com';

export const SOCIAL_LINKS = {
  instagram: 'https://www.instagram.com/cinegemstudio?igsh=MXd5dzQ0OGF2enBjdg==',
  behance: 'https://www.behance.net/cinegem-studio/projects',
};
