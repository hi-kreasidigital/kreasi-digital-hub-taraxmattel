// Both language versions of the homepage, each listing its translation (hreflang) for Google.
import { SITE_BASE_URL } from "../lib/config";
export function GET() {
  const id = `${SITE_BASE_URL}/`, en = `${SITE_BASE_URL}/en/`;
  const today = new Date().toISOString().slice(0, 10);
  const alt = `\n    <xhtml:link rel="alternate" hreflang="id" href="${id}"/>` +
    `\n    <xhtml:link rel="alternate" hreflang="en" href="${en}"/>` +
    `\n    <xhtml:link rel="alternate" hreflang="x-default" href="${id}"/>`;
  const xml = [id, en].map((loc) => `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${today}</lastmod>${alt}\n  </url>`);
  return new Response('<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' +
    xml.join("\n") + "\n</urlset>\n", { headers: { "Content-Type": "application/xml" } });
}
