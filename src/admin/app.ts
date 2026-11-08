// Kreasi Digital Hub admin dashboard (static page, runs in the browser).
// All permissions are enforced by Supabase RLS; this UI only shows what the
// signed-in user is allowed to see and change.
import { createClient, type Session } from "@supabase/supabase-js";
import { SITE_ID, SUPABASE_ANON_KEY, SUPABASE_URL } from "../lib/config";
import { mdToHtml } from "../lib/html";
import { columnsOf, type Field, type TableDef, TABLES, tablesFor } from "./tables";

const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { flowType: "pkce", persistSession: true, detectSessionInUrl: true },
});
type Row = Record<string, any>;
type Site = { id: string; name: string; domain: string | null; role: "owner" | "editor" };

const root = document.getElementById("admin")!;
let session: Session | null = null;
let sites: Site[] = [];

// ------------------------------------------------------------------ tiny DOM helper (never uses innerHTML for data)
type Child = Node | string | number | null | undefined | false | Child[];
function h(tag: string, attrs: Record<string, any> = {}, ...kids: Child[]): HTMLElement {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
    else if (k === "class") el.className = v;
    else if (k === "value") (el as HTMLInputElement).value = v;
    else if (k === "checked") (el as HTMLInputElement).checked = !!v;
    else el.setAttribute(k, v === true ? "" : String(v));
  }
  const add = (c: Child) => {
    if (c == null || c === false) return;
    if (Array.isArray(c)) c.forEach(add);
    else el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  };
  kids.forEach(add);
  return el;
}
const fill = (el: HTMLElement, ...kids: Child[]) => el.replaceChildren(...Array.from(h("div", {}, ...kids).childNodes));
const toast = (msg: string, kind: "ok" | "err" = "ok") => {
  const t = h("div", { class: `toast ${kind}`, role: "status" }, msg);
  document.body.append(t);
  setTimeout(() => t.remove(), 4500);
};
const fmt = (d?: string | null) => (d ? new Date(d).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) : "");

// ------------------------------------------------------------------ routing: #/<site>/<view>/<id>
const parse = () => {
  const [site = "", view = "", id = ""] = location.hash.replace(/^#\/?/, "").split("/").map(decodeURIComponent);
  return { site, view, id };
};
const go = (site: string, view = "", id = "") =>
  (location.hash = "/" + [site, view, id].filter(Boolean).map(encodeURIComponent).join("/"));
window.addEventListener("hashchange", () => render());

// ------------------------------------------------------------------ auth
sb.auth.onAuthStateChange((_e, s) => {
  const changed = (s?.user.id ?? null) !== (session?.user.id ?? null);
  session = s;
  if (changed) boot();
});

async function boot() {
  if (!session) return renderLogin();
  const [{ data: mem }, { data: siteRows }] = await Promise.all([
    sb.from("site_members").select("site_id, role").eq("user_id", session.user.id),
    sb.from("sites").select("id, name, domain").order("name"),
  ]);
  const role = new Map((mem ?? []).map((m) => [m.site_id, m.role]));
  sites = (siteRows ?? []).filter((s) => role.has(s.id)).map((s) => ({ ...s, role: role.get(s.id) })) as Site[];
  render();
}

function renderLogin(note = "") {
  const email = h("input", { type: "email", required: true, placeholder: "email@kamu.com", autocomplete: "email" }) as HTMLInputElement;
  const msg = h("p", { class: "muted", role: "status" }, note);
  const form = h("form", {
    class: "login-card", onsubmit: async (e: Event) => {
      e.preventDefault();
      msg.textContent = "Mengirim link...";
      const { error } = await sb.auth.signInWithOtp({
        email: email.value.trim(),
        options: { emailRedirectTo: location.origin + location.pathname },
      });
      msg.textContent = error ? `Gagal: ${error.message}` : "Cek email kamu dan klik link masuk dari Supabase. Link berlaku 1 jam.";
    },
  },
    h("img", { src: "../assets/img/logo-navy.svg", alt: "Kreasi Digital Hub", class: "login-logo" }),
    h("h1", {}, "Admin Dashboard"),
    h("p", { class: "muted" }, "Masuk dengan email. Kami kirim link masuk, tanpa password."),
    h("label", {}, "Email", email),
    h("button", { class: "btn primary", type: "submit" }, "Kirim link masuk"),
    msg,
  );
  root.replaceChildren(h("main", { class: "login" }, form));
}

// ------------------------------------------------------------------ shell
async function render() {
  if (!session) return renderLogin();
  if (!sites.length) {
    root.replaceChildren(h("main", { class: "login" }, h("div", { class: "login-card" },
      h("h1", {}, "Belum ada akses"),
      h("p", {}, `Akun ${session.user.email} belum terdaftar di situs mana pun. Minta pemilik situs mengundang email ini.`),
      h("button", { class: "btn", onclick: () => sb.auth.signOut() }, "Keluar"))));
    return;
  }
  let { site, view, id } = parse();
  const cur = sites.find((s) => s.id === site);
  if (!cur) {
    // open this repo's own site by default; other sites stay reachable via the switcher
    const home = sites.find((s) => s.id === SITE_ID) ?? sites[0];
    return go(home.id, tablesFor(home.id)[0].table);
  }
  if (!view) return go(site, tablesFor(site)[0].table);

  const defs = tablesFor(site);
  const groups = [...new Set(defs.map((d) => d.group))];
  const link = (v: string, label: string) =>
    h("a", { href: `#/${site}/${v}`, class: view === v ? "active" : null }, label);
  const nav = h("nav", { class: "side" },
    h("label", { class: "site-pick" }, "Situs",
      h("select", { onchange: (e: Event) => go((e.target as HTMLSelectElement).value) },
        sites.map((s) => h("option", { value: s.id, selected: s.id === site ? true : null }, s.name)))),
    groups.map((g) => [h("p", { class: "side-group" }, g), defs.filter((d) => d.group === g).map((d) => link(d.table, d.label))]),
    h("p", { class: "side-group" }, "Data masuk"),
    link("subscribers", "Newsletter"), link("submissions", "Form masuk"),
    cur.role === "owner" && [h("p", { class: "side-group" }, "Pemilik"), link("people", "Tim admin"), link("site", "Pengaturan situs")],
  );
  const top = h("header", { class: "top" },
    h("button", { class: "menu-btn", "aria-label": "Menu", onclick: () => document.body.classList.toggle("nav-open") }, "☰"),
    h("strong", {}, cur.name),
    h("span", { class: "spacer" }),
    cur.domain && h("a", { class: "btn ghost", href: cur.domain, target: "_blank", rel: "noopener" }, "Lihat website ↗"),
    h("button", { class: "btn primary", onclick: () => publish(site) }, "Terbitkan perubahan"),
    h("span", { class: "who" }, session.user.email),
    h("button", { class: "btn ghost", onclick: () => sb.auth.signOut() }, "Keluar"),
  );
  const body = h("section", { class: "content" }, h("p", { class: "muted" }, "Memuat..."));
  root.replaceChildren(h("div", { class: "shell" }, nav, h("div", { class: "main" }, top, body)));
  document.body.classList.remove("nav-open");

  try {
    if (view === "subscribers") await viewSubscribers(body, cur);
    else if (view === "submissions") await viewSubmissions(body, cur);
    else if (view === "people" && cur.role === "owner") await viewPeople(body, cur);
    else if (view === "site" && cur.role === "owner") await viewSite(body, cur);
    else {
      const def = defs.find((d) => d.table === view);
      if (!def) return go(site, defs[0].table);
      if (def.single) await viewEdit(body, cur, def, "single");
      else if (id) await viewEdit(body, cur, def, id);
      else await viewList(body, cur, def);
    }
  } catch (e) {
    fill(body, h("p", { class: "error" }, `Terjadi kesalahan: ${(e as Error).message}`));
  }
}

async function publish(site: string) {
  toast("Meminta website dibangun ulang...");
  const { data, error } = await sb.functions.invoke("publish-site", { body: { site } });
  if (error) return toast(`Gagal: ${error.message}`, "err");
  const r = (data as Row)?.result;
  if (r === "dispatched") toast("Website sedang dibangun ulang. Perubahan tampil dalam ±2 menit.");
  else if (r === "scheduled") toast("Tersimpan. Website memperbarui diri otomatis dalam ±10 menit.");
  else if (r === "no-repo") toast("Situs ini belum terhubung ke repo GitHub (Pengaturan situs).", "err");
  else toast(`Hasil: ${r}`, "err");
}

// ------------------------------------------------------------------ list
async function viewList(body: HTMLElement, site: Site, def: TableDef) {
  let q = sb.from(def.table).select("*").eq("site_id", site.id);
  for (const o of (def.orderBy ?? "created_at").split(",")) {
    const [col, dir] = o.split(".");
    q = q.order(col, { ascending: dir !== "desc", nullsFirst: false });
  }
  const { data, error } = await q;
  if (error) throw error;
  const rows = data ?? [];
  const search = h("input", { type: "search", placeholder: "Cari...", class: "search" }) as HTMLInputElement;
  const cols = def.listCols ?? [];
  const tbody = h("tbody");
  const draw = () => {
    const term = search.value.toLowerCase();
    tbody.replaceChildren(...rows
      .filter((r) => !term || JSON.stringify(r).toLowerCase().includes(term))
      .map((r) => h("tr", { onclick: () => go(site.id, def.table, r.id), tabindex: 0, onkeydown: (e: KeyboardEvent) => e.key === "Enter" && go(site.id, def.table, r.id) },
        h("td", { class: "title-cell" }, String(r[def.title] ?? "(tanpa judul)").slice(0, 120)),
        cols.map((c) => h("td", {}, c === "status" ? h("span", { class: `pill ${r[c]}` }, r[c]) :
          typeof r[c] === "boolean" ? (r[c] ? "✓" : "") : String(r[c] ?? "").slice(0, 80))))));
  };
  search.addEventListener("input", draw);
  draw();
  fill(body, 
    h("div", { class: "bar" }, h("h1", {}, def.label), h("span", { class: "spacer" }), search,
      h("button", { class: "btn primary", onclick: () => go(site.id, def.table, "new") }, "+ Tambah")),
    def.help && h("p", { class: "help" }, def.help),
    h("div", { class: "table-wrap" }, h("table", { class: "list" },
      h("thead", {}, h("tr", {}, h("th", {}, "Judul"), cols.map((c) => h("th", {}, c.replace(/_/g, " "))))), tbody)),
    h("p", { class: "muted small" }, `${rows.length} baris`),
  );
}

// ------------------------------------------------------------------ edit
async function viewEdit(body: HTMLElement, site: Site, def: TableDef, id: string) {
  const key = def.key ?? "id";
  let row: Row = {};
  if (id === "single") {
    const { data } = await sb.from(def.table).select("*").eq("site_id", site.id).maybeSingle();
    row = data ?? {};
  } else if (id !== "new") {
    const { data, error } = await sb.from(def.table).select("*").eq("id", id).single();
    if (error) throw error;
    row = data;
  } else {
    row = { status: "draft" };
  }

  // options for fk selects and link checkboxes
  const fkTables = new Set<string>([...def.fields.filter((f) => f.fk).map((f) => f.fk!.table), ...(def.links ?? []).map((l) => l.otherTable)]);
  const opts: Record<string, Row[]> = {};
  await Promise.all([...fkTables].map(async (t) => {
    const lab = def.fields.find((f) => f.fk?.table === t)?.fk!.label ?? def.links!.find((l) => l.otherTable === t)!.otherLabel;
    const { data } = await sb.from(t).select(`id, ${lab}`).eq("site_id", site.id).order(lab);
    opts[t] = (data ?? []).map((r: Row) => ({ id: r.id, label: r[lab] }));
  }));
  const linked: Record<string, Set<string>> = {};
  if (id !== "new" && id !== "single") {
    await Promise.all((def.links ?? []).map(async (l) => {
      const { data } = await sb.from(l.table).select(l.other).eq(l.self, id);
      linked[l.table] = new Set((data ?? []).map((r: Row) => r[l.other]));
    }));
  }

  const inputs = new Map<string, () => unknown>();
  const control = (f: Field, col: string, lang?: string) => {
    const v = row[col];
    const lab = lang ? `${f.label} (${lang.toUpperCase()})` : f.label;
    let el: HTMLElement;
    switch (f.type) {
      case "textarea":
      case "markdown": {
        const ta = h("textarea", { rows: f.rows ?? 4, value: v ?? "" }) as HTMLTextAreaElement;
        ta.value = v ?? "";
        inputs.set(col, () => ta.value);
        if (f.type === "markdown") {
          const prev = h("div", { class: "md-preview prose", hidden: true });
          const tog = h("button", { type: "button", class: "btn tiny", onclick: () => {
            const show = prev.hidden;
            if (show) prev.innerHTML = mdToHtml(ta.value); // mdToHtml escapes all text
            prev.hidden = !show; ta.hidden = show; tog.textContent = show ? "Edit" : "Pratinjau";
          } }, "Pratinjau");
          el = h("div", {}, tog, ta, prev);
        } else el = ta;
        break;
      }
      case "checkbox": {
        const cb = h("input", { type: "checkbox", checked: !!v }) as HTMLInputElement;
        inputs.set(col, () => cb.checked);
        return h("label", { class: "check" }, cb, " ", lab);
      }
      case "number": {
        const i = h("input", { type: "number", value: v ?? "" }) as HTMLInputElement;
        inputs.set(col, () => (i.value === "" ? null : Number(i.value)));
        el = i; break;
      }
      case "date": {
        const i = h("input", { type: "date", value: v ?? "" }) as HTMLInputElement;
        inputs.set(col, () => i.value || null);
        el = i; break;
      }
      case "select": {
        const s = h("select", {}, f.options!.map((o) => h("option", { value: o, selected: o === v ? true : null }, o))) as HTMLSelectElement;
        inputs.set(col, () => s.value);
        el = s; break;
      }
      case "fk": {
        const s = h("select", {}, h("option", { value: "" }, "—"),
          (opts[f.fk!.table] ?? []).map((o) => h("option", { value: o.id, selected: o.id === v ? true : null }, o.label))) as HTMLSelectElement;
        inputs.set(col, () => s.value || null);
        el = s; break;
      }
      case "image": {
        const i = h("input", { type: "text", value: v ?? "", placeholder: "https://... atau /assets/..." }) as HTMLInputElement;
        const img = h("img", { class: "thumb", alt: "", src: previewSrc(v) || null }) as HTMLImageElement;
        const file = h("input", { type: "file", accept: "image/*" }) as HTMLInputElement;
        file.addEventListener("change", async () => {
          const f0 = file.files?.[0];
          if (!f0) return;
          const safe = f0.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-");
          const path = `${site.id}/uploads/${Date.now()}-${safe}`;
          toast("Mengunggah gambar...");
          const { error } = await sb.storage.from("media").upload(path, f0, { contentType: f0.type });
          if (error) return toast(`Upload gagal: ${error.message}`, "err");
          i.value = sb.storage.from("media").getPublicUrl(path).data.publicUrl;
          img.src = i.value;
          toast("Gambar terunggah. Jangan lupa Simpan.");
        });
        i.addEventListener("change", () => (img.src = previewSrc(i.value)));
        inputs.set(col, () => i.value.trim() || null);
        el = h("div", { class: "image-field" }, img, h("div", {}, i, file));
        break;
      }
      default: {
        const i = h("input", { type: f.type === "url" ? "url" : "text", value: v ?? "" }) as HTMLInputElement;
        inputs.set(col, () => i.value.trim() === "" ? null : i.value);
        el = i;
      }
    }
    return h("label", { class: "field" }, h("span", {}, lab, f.required && !lang?.includes("en") ? " *" : ""), el);
  };

  const fieldEls = def.fields.map((f) => {
    if (f.pair) {
      const [ci, ce] = columnsOf(f);
      return h("div", { class: "pair" }, control(f, ci, "id"), control({ ...f, required: false }, ce, "en"),
        f.hint && h("p", { class: "hint" }, f.hint));
    }
    return h("div", {}, control(f, f.name), f.hint && h("p", { class: "hint" }, f.hint));
  });

  const linkEls = (def.links ?? []).map((l) => {
    const set = linked[l.table] ?? new Set<string>();
    linked[l.table] = set;
    return h("fieldset", { class: "links" }, h("legend", {}, l.label),
      (opts[l.otherTable] ?? []).map((o) => {
        const cb = h("input", { type: "checkbox", checked: set.has(o.id) }) as HTMLInputElement;
        cb.addEventListener("change", () => (cb.checked ? set.add(o.id) : set.delete(o.id)));
        return h("label", { class: "check" }, cb, " ", o.label);
      }));
  });

  const save = async (e: Event) => {
    e.preventDefault();
    const rec: Row = { site_id: site.id };
    for (const [col, get] of inputs) rec[col] = get();
    for (const f of def.fields) {
      if (f.required && !rec[columnsOf(f)[0]] && rec[columnsOf(f)[0]] !== false) return toast(`"${f.label}" wajib diisi.`, "err");
    }
    let savedId = id;
    if (def.single) {
      const { error } = await sb.from(def.table).upsert(rec, { onConflict: "site_id" });
      if (error) return toast(`Gagal menyimpan: ${error.message}`, "err");
    } else if (id === "new") {
      const { data, error } = await sb.from(def.table).insert(rec).select(key).single();
      if (error) return toast(`Gagal menyimpan: ${error.message}`, "err");
      savedId = (data as Row)[key];
    } else {
      const { error } = await sb.from(def.table).update(rec).eq(key, id);
      if (error) return toast(`Gagal menyimpan: ${error.message}`, "err");
    }
    for (const l of def.links ?? []) {
      const { error: de } = await sb.from(l.table).delete().eq(l.self, savedId);
      if (de) return toast(`Gagal menyimpan relasi: ${de.message}`, "err");
      const rows = [...(linked[l.table] ?? [])].map((o) => ({ site_id: site.id, [l.self]: savedId, [l.other]: o }));
      if (rows.length) {
        const { error } = await sb.from(l.table).insert(rows);
        if (error) return toast(`Gagal menyimpan relasi: ${error.message}`, "err");
      }
    }
    toast("Tersimpan. Klik 'Terbitkan perubahan' untuk memperbarui website.");
    if (id === "new") go(site.id, def.table, savedId);
  };
  const del = async () => {
    if (!confirm("Hapus baris ini? Tindakan ini tidak bisa dibatalkan.")) return;
    const { error } = await sb.from(def.table).delete().eq(key, id);
    if (error) return toast(`Gagal menghapus: ${error.message}`, "err");
    toast("Dihapus.");
    go(site.id, def.table);
  };

  fill(body, 
    h("div", { class: "bar" },
      !def.single && h("a", { href: `#/${site.id}/${def.table}`, class: "back" }, `← ${def.label}`),
      h("h1", {}, def.single ? def.label : id === "new" ? `Tambah: ${def.label}` : String(row[def.title] ?? def.label))),
    def.help && h("p", { class: "help" }, def.help),
    h("form", { class: "edit", onsubmit: save }, fieldEls, linkEls,
      h("div", { class: "actions" },
        h("button", { class: "btn primary", type: "submit" }, "Simpan"),
        !def.single && id !== "new" && h("button", { class: "btn danger", type: "button", onclick: del }, "Hapus"))),
  );
}
const previewSrc = (v?: string | null) => (!v ? "" : /^https?:/.test(v) ? v : ".." + v);

// ------------------------------------------------------------------ data views
async function viewSubscribers(body: HTMLElement, site: Site) {
  const { data, error } = await sb.from("newsletter_subscribers").select("*").eq("site_id", site.id).order("created_at", { ascending: false });
  if (error) throw error;
  const rows = data ?? [];
  const csv = () => {
    const lines = [["email", "source_page", "lang", "created_at"], ...rows.map((r) => [r.email, r.source_page, r.lang, r.created_at])]
      .map((l) => l.map((x) => `"${String(x ?? "").replace(/"/g, '""')}"`).join(","));
    const a = h("a", { href: URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" })), download: `newsletter-${site.id}.csv` });
    a.click();
  };
  fill(body, 
    h("div", { class: "bar" }, h("h1", {}, "Newsletter"), h("span", { class: "spacer" }),
      h("button", { class: "btn", onclick: csv }, "Unduh CSV")),
    h("div", { class: "table-wrap" }, h("table", { class: "list static" },
      h("thead", {}, h("tr", {}, ["Email", "Halaman", "Bahasa", "Tanggal", ""].map((x) => h("th", {}, x)))),
      h("tbody", {}, rows.map((r) => h("tr", {}, h("td", {}, r.email), h("td", {}, r.source_page ?? ""), h("td", {}, r.lang ?? ""),
        h("td", {}, fmt(r.created_at)),
        h("td", {}, site.role === "owner" && h("button", { class: "btn tiny danger", onclick: async () => {
          if (!confirm(`Hapus ${r.email}?`)) return;
          const { error } = await sb.from("newsletter_subscribers").delete().eq("id", r.id);
          error ? toast(error.message, "err") : render();
        } }, "Hapus"))))))),
    h("p", { class: "muted small" }, `${rows.length} pendaftar`),
  );
}

async function viewSubmissions(body: HTMLElement, site: Site) {
  const { data, error } = await sb.from("form_submissions").select("*").eq("site_id", site.id).order("created_at", { ascending: false });
  if (error) throw error;
  const rows = data ?? [];
  fill(body, 
    h("div", { class: "bar" }, h("h1", {}, "Form masuk")),
    !rows.length && h("p", { class: "muted" }, "Belum ada kiriman form."),
    rows.map((r) => {
      const cb = h("input", { type: "checkbox", checked: r.handled }) as HTMLInputElement;
      cb.addEventListener("change", async () => {
        const { error } = await sb.from("form_submissions").update({ handled: cb.checked }).eq("id", r.id);
        if (error) toast(error.message, "err");
      });
      return h("article", { class: "card" },
        h("p", { class: "small muted" }, `${fmt(r.created_at)} · ${r.form} · ${r.source_page ?? ""}`),
        h("p", {}, h("strong", {}, r.name || "(tanpa nama)"), " ", r.email ?? "", " ", r.phone ?? ""),
        r.message && h("p", { class: "pre" }, r.message),
        h("label", { class: "check" }, cb, " Sudah ditindaklanjuti"));
    }),
  );
}

async function viewPeople(body: HTMLElement, site: Site) {
  const { data, error } = await sb.rpc("site_people", { p_site: site.id });
  if (error) throw error;
  const email = h("input", { type: "email", placeholder: "email@contoh.com", required: true }) as HTMLInputElement;
  const role = h("select", {}, h("option", { value: "editor" }, "editor"), h("option", { value: "owner" }, "owner")) as HTMLSelectElement;
  fill(body, 
    h("div", { class: "bar" }, h("h1", {}, "Tim admin")),
    h("p", { class: "help" }, "Editor bisa mengubah konten situs ini. Owner juga bisa mengatur tim dan pengaturan situs. Orang yang diundang cukup masuk dengan emailnya di halaman ini."),
    h("div", { class: "table-wrap" }, h("table", { class: "list static" },
      h("thead", {}, h("tr", {}, ["Email", "Peran", "Status", ""].map((x) => h("th", {}, x)))),
      h("tbody", {}, (data ?? []).map((p: Row) => h("tr", {}, h("td", {}, p.email), h("td", {}, p.role),
        h("td", {}, p.kind === "member" ? "aktif" : "menunggu masuk pertama"),
        h("td", {}, p.user_id !== session!.user.id && h("button", { class: "btn tiny danger", onclick: async () => {
          if (!confirm(`Cabut akses ${p.email}?`)) return;
          const { error } = p.kind === "member"
            ? await sb.from("site_members").delete().eq("site_id", site.id).eq("user_id", p.user_id)
            : await sb.from("admin_invites").delete().eq("site_id", site.id).eq("email", p.email);
          error ? toast(error.message, "err") : render();
        } }, "Cabut"))))))),
    h("form", { class: "inline-form", onsubmit: async (e: Event) => {
      e.preventDefault();
      const { error } = await sb.from("admin_invites").insert({ site_id: site.id, email: email.value.trim().toLowerCase(), role: role.value, invited_by: session!.user.id });
      error ? toast(error.message, "err") : (toast("Undangan dibuat. Minta dia masuk di halaman admin ini dengan email tersebut."), render());
    } }, h("strong", {}, "Undang: "), email, role, h("button", { class: "btn primary", type: "submit" }, "Undang")),
  );
}

async function viewSite(body: HTMLElement, site: Site) {
  const { data, error } = await sb.from("sites").select("*").eq("id", site.id).single();
  if (error) throw error;
  const f = (label: string, el: HTMLElement, hint = "") => h("div", {}, h("label", { class: "field" }, h("span", {}, label), el), hint && h("p", { class: "hint" }, hint));
  const name = h("input", { value: data.name }) as HTMLInputElement;
  const domain = h("input", { value: data.domain ?? "", placeholder: "https://custom.domainmu.com" }) as HTMLInputElement;
  const repo = h("input", { value: data.github_repo ?? "", placeholder: "hi-kreasidigital/nama-repo" }) as HTMLInputElement;
  const origins = h("textarea", { rows: 3 }) as HTMLTextAreaElement;
  origins.value = (data.allowed_origins ?? []).join("\n");
  const notify = h("input", { type: "email", value: data.notify_email ?? "" }) as HTMLInputElement;
  fill(body, 
    h("div", { class: "bar" }, h("h1", {}, "Pengaturan situs")),
    h("form", { class: "edit", onsubmit: async (e: Event) => {
      e.preventDefault();
      const { error } = await sb.from("sites").update({
        name: name.value.trim(), domain: domain.value.trim() || null, github_repo: repo.value.trim() || null,
        allowed_origins: origins.value.split(/\s+/).map((x) => x.trim().replace(/\/+$/, "")).filter(Boolean),
        notify_email: notify.value.trim() || null,
      }).eq("id", site.id);
      error ? toast(error.message, "err") : (toast("Tersimpan."), boot());
    } },
      f("Nama situs", name),
      f("Alamat website", domain, "Dipakai untuk tombol 'Lihat website'."),
      f("Repo GitHub", repo, "Repo yang dibangun ulang saat 'Terbitkan perubahan' diklik."),
      f("Domain yang boleh mengirim form", origins, "Satu per baris, tanpa garis miring di akhir, mis. https://custom.kreasidigitalhub.com"),
      f("Email notifikasi form", notify, "Pendaftar newsletter & form baru dikirim ke sini (via Resend)."),
      h("div", { class: "actions" }, h("button", { class: "btn primary", type: "submit" }, "Simpan"))),
  );
}

// ------------------------------------------------------------------ start
sb.auth.getSession().then(({ data }) => { session = data.session; boot(); });
export { TABLES };
