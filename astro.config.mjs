// @ts-check
// Astro static build. The workflow sets SITE_BASE_URL + BASE_PATH:
//  - GitHub Pages: https://hi-kreasidigital.github.io/kreasi-digital-hub-taraxmattel, BASE_PATH="/kreasi-digital-hub-taraxmattel"
//  - Cloudflare Pages: https://taraxmattel.kreasidigitalhub.com, BASE_PATH="" (empty)
// The page itself uses relative links (like the old site), so it works under both.
import { defineConfig } from 'astro/config';

const site = (process.env.SITE_BASE_URL || 'https://hi-kreasidigital.github.io/kreasi-digital-hub-taraxmattel').replace(/\/+$/, '');
const base = (process.env.BASE_PATH ?? '/kreasi-digital-hub-taraxmattel').replace(/\/+$/, '') || '/';

export default defineConfig({
  site: new URL(site).origin,
  base,
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory' },
});
