// This site is not meant to appear in search engines. Crawlers may still fetch the pages so they
// can see the noindex instruction (meta robots + the X-Robots-Tag header in public/_headers);
// blocking them here would hide that instruction. No sitemap on purpose.
import { BASE_PATH } from "../lib/config";
export const GET = () => new Response(`User-agent: *\nAllow: /\nDisallow: ${BASE_PATH}/admin/\n`);
