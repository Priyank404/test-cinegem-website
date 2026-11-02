# Cinegem Studio — SEO Copy & Configuration Review
**Document Purpose:** Items requiring explicit owner confirmation before being introduced into live production copy, structured data, or repository configuration.

---

## 1. Contact Email Discrepancy — RESOLVED (Confirmed: info@cinegemstudio.com)
* **Current status in codebase:**
  * Inquiry form fallback: `info@cinegemstudio.com` (in `src/constants/inquire.js`)
  * Website footers: `hello@cinegemstudio.com` (in `src/components/layout/Footer.jsx` and `HomePage.jsx`)
* **Questions for owner:**
  1. Which email address is the primary public business inbox for client inquiries?
  2. Is there an official domain address (such as `contact@cinegem.studio` or `inquire@cinegem.studio`) configured on Google Workspace / Cloudflare Email Routing?
* **Sentence that would use this:**
  > `"For direct private inquiries and bespoke high jewellery proposals, contact hello@cinegemstudio.com."`
* **JSON-LD Schema impacted:** `Organization.email` (now updated to `info@cinegemstudio.com`).

---

## 2. Studio Physical Location & Registration
* **Current status in codebase:**
  * Surat, Gujarat, India is omitted from live copy and JSON-LD schema pending your confirmation.
* **Questions for owner:**
  1. Do you want Surat / India declared in public structured schema (`PostalAddress`) or kept private?
  2. If yes, what is the official registered entity name and postal address?
* **Sentence that would use this:**
  > `"Engineered in Surat, Gujarat — the world's diamond cutting capital — Cinegem Studio brings generational gemological craftsmanship to digital high jewellery visualization."`
* **JSON-LD Schema impacted:** `Organization.address` (currently omitted until confirmed).

---

## 3. Brand Logo & Social Sharing (OG Image)
* **Current status in codebase:**
  * Schema logo is currently set to `/logo-white.png`.
  * OpenGraph image is currently set to `/4.png` (high-polish yellow gold solitaire marquise ring render).
* **Questions for owner:**
  1. Is `/logo-white.png` or `/logo-dark.png` your preferred logo for Google Knowledge Graph and Rich Snippets?
  2. Do you have a dedicated 1200×630px landscape hero campaign render you prefer for iMessage, WhatsApp, LinkedIn, and Twitter link previews?

---

## 4. Technical Deliverables & Production Capabilities
* **Current status in codebase:**
  * Live copy uses only conservative, verifiable facts (no fabricated turnarounds, prices, or resolutions).
  * **Pending confirmation:** 360° wording in /classic title and description (temporarily retained in meta tags, removed from visible copy until confirmed).
* **Questions for owner:**
  1. **Accepted CAD formats:** Can we advertise Rhino (`.3dm`), MatrixGold, STL, STEP, and OBJ?
  2. **Deliverable video formats:** Do you supply 360° video spins as standard with e-commerce packages, and in which codecs (ProRes, H.264 MP4, WebM)?
  3. **Turnaround times:** Do you want standard collection turnaround (e.g., 3–5 business days) mentioned in FAQs?
* **Sentences awaiting confirmation:**
  > `"Standard catalog suites are delivered in 4K resolution within 3–5 business days from CAD receipt."` `[CONFIRM]`  
  > `"We accept native Rhino (.3dm), Gemvision Matrix, and raw STL/STEP geometry files."` `[CONFIRM]`

---

## 5. Git Tracking for `public/` Directory
* **Current status in codebase:**
  * `public/` is listed in `.gitignore`.
  * The repository contains ~1GB+ of video and image files in `public/` that are not committed to git.
* **Decision needed:**
  * If you deploy to Cloudflare Pages via **Git Integration** (pushing to GitHub), Cloudflare builds the site from the repository. Files ignored by git will NOT exist in the Cloudflare build container, and local video/image fallbacks will be missing.
  * If you deploy to Cloudflare Pages via **Wrangler CLI** (`npx wrangler pages deploy dist`), `public/` can remain ignored because Vite bundles it locally into `dist/`.
  * **Recommendation:** If deploying via Git, commit essential brand assets (`logo-*.png`, `favicon.png`, `4.png`) to git while keeping heavy test videos in Google Drive.

---

## 6. Google Drive API Key Public Exposure
* **Current status in codebase:**
  * `VITE_GOOGLE_DRIVE_API` in `.env` is bundled into the client-side JavaScript bundle during `vite build`. Any visitor opening DevTools Network tab can inspect this key.
* **Required security action (in Google Cloud Console):**
  1. Open [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials).
  2. Select your Google Drive API key.
  3. Under **Application restrictions**, select **Websites** (HTTP referrers) and restrict to:
     * `https://cinegem.studio/*`
     * `https://*.cinegem.studio/*`
     * `https://*.pages.dev/*` (for Cloudflare preview deployments)
     * `http://localhost:*` (for local development)
  4. Under **API restrictions**, select **Restrict key** and check ONLY **Google Drive API**.
  This guarantees that nobody can use your API key outside your approved domain.
