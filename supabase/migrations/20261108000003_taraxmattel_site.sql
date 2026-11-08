-- =============================================================================
-- Kreasi Digital Hub by Tara x Mattel (site_id = 'taraxmattel'): site-specific tables.
-- Shared tables are reused as they are:
--   site_texts   -> section labels/titles/intros, footer, page meta and small UI labels
--
-- Every table: site_id, RLS on, visitors read published rows only, writes only by
-- members of that site, and the touch trigger that keeps sites.content_updated_at
-- fresh for the "skip build if unchanged" check. airtable_id lets the one-time
-- Airtable import be re-run safely (upsert) until the site is switched over.
-- =============================================================================

-- ---------------------------------------------------------------- page sections
-- One row per fixed section of the one-page site: 'about' (hero) and the four
-- product sections 'usaha', 'skill', 'seni', 'ngo'. Background colour and motifs
-- are fixed per key in the page code; Published = shown (old Airtable "Tampilkan").
create table public.page_sections (
  id           uuid primary key default gen_random_uuid(),
  site_id      text not null references public.sites(id) on delete cascade,
  status       text not null default 'draft' check (status in ('draft','published','idea','archived')),
  key          text not null,             -- about | usaha | skill | seni | ngo
  name         text,                      -- product name (H2), not translated
  label_id     text,                      -- small label above the title ("Judul Section")
  label_en     text,
  tagline_id   text,                      -- "Keterangan" (italic line)
  tagline_en   text,
  body_id      text,                      -- "Paragraf"
  body_en      text,
  image        text,                      -- photo / thumbnail; empty = built-in default image
  button_id    text,                      -- about: YouTube button; products: main button
  button_en    text,
  link         text,                      -- about: YouTube link; products: button link
  button2_id   text,                      -- about only: Instagram button
  button2_en   text,
  link2        text,                      -- about only: Instagram link
  coming_soon  boolean not null default false,   -- red "Segera hadir" ribbon
  airtable_id  text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (site_id, key)
);
create unique index on public.page_sections (site_id, airtable_id);

-- ---------------------------------------------------------------- freebies
create table public.freebies (
  id              uuid primary key default gen_random_uuid(),
  site_id         text not null references public.sites(id) on delete cascade,
  status          text not null default 'draft' check (status in ('draft','published','idea','archived')),
  sort_order      int,
  name_id         text not null,
  name_en         text,
  format_id       text,
  format_en       text,
  description_id  text,
  description_en  text,
  cover           text,
  download_url    text,
  airtable_id     text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create unique index on public.freebies (site_id, airtable_id);
create index on public.freebies (site_id);

-- ---------------------------------------------------------------- portfolio
create table public.portfolio_items (
  id              uuid primary key default gen_random_uuid(),
  site_id         text not null references public.sites(id) on delete cascade,
  status          text not null default 'draft' check (status in ('draft','published','idea','archived')),
  sort_order      int,
  title           text not null,
  kind            text,                   -- "Jenis", e.g. Website
  description_id  text,
  description_en  text,
  thumbnail       text,                   -- empty = built-in mockup for the first websites
  link            text,
  airtable_id     text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create unique index on public.portfolio_items (site_id, airtable_id);
create index on public.portfolio_items (site_id);

-- ---------------------------------------------------------------- representation
create table public.representations (
  id              uuid primary key default gen_random_uuid(),
  site_id         text not null references public.sites(id) on delete cascade,
  status          text not null default 'draft' check (status in ('draft','published','idea','archived')),
  sort_order      int,
  name            text not null,          -- "Title | Source": the part after | is shown as the source
  description_id  text,
  description_en  text,
  photo           text,
  link            text,
  airtable_id     text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create unique index on public.representations (site_id, airtable_id);
create index on public.representations (site_id);

-- ---------------------------------------------------------------- triggers
create trigger touch_page_sections before insert or update or delete on public.page_sections
  for each row execute function private.touch();
create trigger touch_freebies before insert or update or delete on public.freebies
  for each row execute function private.touch();
create trigger touch_portfolio_items before insert or update or delete on public.portfolio_items
  for each row execute function private.touch();
create trigger touch_representations before insert or update or delete on public.representations
  for each row execute function private.touch();

-- ---------------------------------------------------------------- grants + RLS
grant select on public.page_sections, public.freebies, public.portfolio_items, public.representations to anon;
grant select, insert, update, delete on public.page_sections, public.freebies, public.portfolio_items, public.representations to authenticated;

do $$
declare t text;
begin
  foreach t in array array['page_sections','freebies','portfolio_items','representations'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format($p$create policy "read published or member" on public.%I for select to anon, authenticated
                     using (status = 'published' or (select private.is_member(site_id)))$p$, t);
    execute format('create policy "members insert" on public.%I for insert to authenticated
                    with check ((select private.is_member(site_id)))', t);
    execute format('create policy "members update" on public.%I for update to authenticated
                    using ((select private.is_member(site_id))) with check ((select private.is_member(site_id)))', t);
    execute format('create policy "members delete" on public.%I for delete to authenticated
                    using ((select private.is_member(site_id)))', t);
  end loop;
end $$;

-- ---------------------------------------------------------------- site row
-- github.io stays allowed while the site is still served there (append, never replace)
update public.sites
   set allowed_origins = array(select distinct unnest(allowed_origins || array['https://hi-kreasidigital.github.io']))
 where id = 'taraxmattel';
