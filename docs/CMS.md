# Kreasi Digital Hub by Tara x Mattel: how the site works

The one-page, two-language site (site id `taraxmattel`): Indonesian at `/`, English at `/en/`. The pages are static, built by **Astro** from content stored in the shared **Supabase** project, and content is edited in the **admin dashboard** at `/admin/`. The design and URLs are the same as the earlier Python/Airtable version.

```
Editor ──► /admin/ (static page, Supabase login)
              │ writes (RLS-checked)
              ▼
        Supabase (Singapore, shared with kreasi-digital-site and tools)
              ▲ reads published rows (anon key)            │ publish-site
              │                                             ▼
GitHub Actions (site.yml): npm ci → astro build ──► GitHub Pages now, Cloudflare Pages (taraxmattel.kreasidigitalhub.com) once the secrets exist
              ▲
   push · "Terbitkan perubahan" (repository_dispatch) · every 10 min if content changed
```

The site has no forms. If one is added later it must post to the `submit-form` Edge Function and carry the Turnstile widget (the site key is already the default in `src/lib/config.ts`).

## Where things live

| Path | What it is |
|---|---|
| `src/pages/index.astro`, `src/pages/en/index.astro` | The two pages (ID and EN). |
| `src/components/Page.astro` | The page markup, ported 1:1 from the old `templates/index.html.j2`, plus the SEO head and JSON-LD. Links stay relative like before, so the page works on github.io and on the subdomain. |
| `src/lib/data.ts` | Loads all content for `SITE_ID` once per build and shapes it like the old `build.py`. Only `published` rows are used. Empty images fall back to the built-in pictures in `public/assets/img/default/`. |
| `src/lib/defaultText.ts` | Fallback for every fixed text key, used when `site_texts` has no value. |
| `src/lib/config.ts` | Public settings, overridable by env vars (an empty value means "use the default", except `BASE_PATH`). |
| `public/assets/` | CSS, JS, logo, motifs, default images: byte-identical to the old `assets/`. |
| `src/admin/` | Admin dashboard. `tables.ts` is the content model and drives every menu and form. |
| `src/pages/robots.txt.ts`, `sitemap.xml.ts`, `version.txt.ts`, `404.astro` | SEO files and the "skip build if unchanged" marker. |
| `supabase/migrations/` | The tables added for this site. |
| `supabase/functions/airtable-import-taraxmattel/`, `scripts/airtable_import.py`, `.github/workflows/migrate-airtable.yml` | The one-time Airtable copy (see below). Remove after cutover. |
| `.github/workflows/site.yml` | Build + deploy. |

## Content model (Supabase, all rows have `site_id = 'taraxmattel'`)

| Admin menu | Table | Old Airtable table | Shows up as |
|---|---|---|---|
| Bagian Halaman | `page_sections` | 1 · Tentang, 3–6 · Untuk … | One row per fixed section. `about` = the hero (label, paragraph, photo, YouTube button = `button`/`link`, Instagram button = `button2`/`link2`; those two links are also used in the footer and JSON-LD). `usaha`, `skill`, `seni`, `ngo` = the product sections; background and motifs follow the key. Published = shown (old "Tampilkan"), `coming_soon` = red ribbon. |
| Freebies | `freebies` | 2 · Freebies | Cards. The section is hidden until at least one row is published (the 3 Airtable placeholders are draft). |
| Portfolio | `portfolio_items` | 7 · Portfolio | Cards, ordered by Urutan. Empty thumbnail = built-in mockup (first three websites). |
| Representation | `representations` | 8 · Representation | Cards. "Title \| Source" in the name: the part after `\|` is shown as the source. Links must start with `http`. |
| Teks Situs | `site_texts` (shared) | 0 · Judul Section, 9 · Footer, and the labels that lived in `build.py` | `freebies.*`, `portfolio.*`, `representation.*` (label/title/lead per language, no ID fallback, like before), `footer.tagline`, `footer.copyright` (EN empty = same as ID), `meta.title` and `meta.description` (Google and link previews), `ui.*` (small labels). |

Writing rules:
- Paragraph fields are shown as one paragraph, like on the old site (line breaks are not turned into separate paragraphs).
- Don't change a `key` in Bagian Halaman or Teks Situs.
- `about` must stay **published**, otherwise the hero is empty.
- Images uploaded in the dashboard go to Supabase Storage at `media/taraxmattel/uploads/`. The Airtable photos were shrunk to WebP (same settings as the old build) and live at `media/taraxmattel/airtable/`.

## Security

Same model as the other two sites (see the kreasi-digital-site `docs/CMS.md`). Every new table has `site_id`, RLS on, published-only reads for visitors, member-only writes and the touch trigger.

Tested 2026-11-08 inside a rolled-back transaction, for each of the 4 new tables: visitors see no drafts and can't insert; a signed-in non-member sees no drafts; an editor of `tools` sees no drafts, updates and deletes 0 rows and can't insert; the owner sees drafts. Storage: the `tools` editor can't upload into `media/taraxmattel/` (but can into `media/tools/`). The security advisor shows only the known, intentional warnings (`site_content_version`, `site_people`, leaked-password protection, which is unused because login is by magic link).

## Configuration

**GitHub → Settings → Secrets and variables → Actions**

| Name | Type | Purpose |
|---|---|---|
| `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` | secrets | Once both exist, every build goes to Cloudflare Pages at `https://taraxmattel.kreasidigitalhub.com`; the workflow creates the Pages project, the custom domain and the DNS record, and the old github.io address serves redirect pages. Token permissions: Account → Cloudflare Pages → Edit, Zone kreasidigitalhub.com → DNS → Edit. **Add them before merging.** |
| `TURNSTILE_SITE_KEY` | variable | Only needed once a form exists (default already set in `config.ts`). |
| `CUSTOM_DOMAIN`, `CF_PAGES_PROJECT` | variables | Override `taraxmattel.kreasidigitalhub.com` / `kreasi-digital-hub-taraxmattel`. |
| `CF_ANALYTICS_TOKEN` | variable | Only for hosting outside Cloudflare Pages. |
| `AIRTABLE_TOKEN` | secret | Used only by the one-time import. Delete after cutover. |

Supabase: add `https://taraxmattel.kreasidigitalhub.com/admin/` (and, while on github.io, `https://hi-kreasidigital.github.io/kreasi-digital-hub-taraxmattel/admin/`) to **Authentication → URL Configuration → Redirect URLs**.

## The one-time Airtable copy

`migrate-airtable.yml` runs when `supabase/import-trigger.txt` changes. `scripts/airtable_import.py` reads Airtable with `AIRTABLE_TOKEN`, maps the rows, shrinks the photos to WebP and posts everything to the `airtable-import-taraxmattel` Edge Function. The function only accepts the call if the token can read the Airtable base, only writes `taraxmattel` rows into the five tables above, and refuses once `sites.import_locked` is true. The same workflow builds the old Python site once more from the same Airtable data and pushes it to the `parity-baseline` branch for comparison.

Check after a run (must equal the `fingerprint` lines in the workflow log):

```sql
select 'site_texts', count(*), md5(coalesce(string_agg(concat_ws('|', key, text_id, text_en), E'\n' order by key collate "C"),'')) from site_texts where site_id='taraxmattel'
union all select 'page_sections', count(*), md5(coalesce(string_agg(concat_ws('|', key, status, name, label_id, label_en, tagline_id, tagline_en, body_id, body_en, button_id, button_en, link, button2_id, button2_en, link2, coming_soon::text), E'\n' order by key collate "C"),'')) from page_sections where site_id='taraxmattel'
union all select 'freebies', count(*), md5(coalesce(string_agg(concat_ws('|', airtable_id, status, sort_order::text, name_id, name_en, format_id, format_en, description_id, description_en, download_url), E'\n' order by airtable_id collate "C"),'')) from freebies where site_id='taraxmattel'
union all select 'portfolio_items', count(*), md5(coalesce(string_agg(concat_ws('|', airtable_id, status, sort_order::text, title, kind, description_id, description_en, link), E'\n' order by airtable_id collate "C"),'')) from portfolio_items where site_id='taraxmattel'
union all select 'representations', count(*), md5(coalesce(string_agg(concat_ws('|', airtable_id, status, sort_order::text, name, description_id, description_en, link), E'\n' order by airtable_id collate "C"),'')) from representations where site_id='taraxmattel';
```

After cutover: `update public.sites set import_locked = true where id = 'taraxmattel';`, then delete the workflow, the script, `supabase/import-trigger.txt`, the `AIRTABLE_TOKEN` secret and (optionally) the Edge Function. The Airtable base stays untouched as a backup.

## Local development

```bash
npm ci
npm run dev          # http://localhost:4321/kreasi-digital-hub-taraxmattel/ (needs network access to Supabase)
npm run build        # output in dist/
```
Env overrides: `SITE_ID`, `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`, `SITE_BASE_URL`, `BASE_PATH`, `PUBLIC_CF_ANALYTICS_TOKEN`, `GOOGLE_SITE_VERIFICATION`, and `CONTENT_SNAPSHOT` (path to a JSON dump of the tables, for building without network access).

## Migration history

- 2026-11-08: content copied from the Airtable base "Kreasi Digital Hub by Tara x Mattel" into Supabase (row counts and md5 fingerprints match Airtable), pages switched to Astro reading from Supabase, admin added at `/admin/`. The old Python generator (`build.py`, `templates/`, `data/contoh.json`, the twice-daily Airtable workflow) was removed; it stays in git history and the Airtable base is untouched.
