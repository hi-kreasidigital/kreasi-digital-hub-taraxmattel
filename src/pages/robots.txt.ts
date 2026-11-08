import { BASE_PATH, SITE_BASE_URL } from "../lib/config";
export const GET = () =>
  new Response(`User-agent: *\nAllow: /\nDisallow: ${BASE_PATH}/admin/\n\nSitemap: ${SITE_BASE_URL}/sitemap.xml\n`);
