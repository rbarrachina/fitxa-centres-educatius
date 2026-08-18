import {
  areaPath,
  centrePath,
  compareNames,
  escapeHtml,
  getCurrentCentres,
  municipalityPath,
  scriptJson,
  siteFooterHtml,
  slugify,
} from "./seo-utils.mjs";

const SITE_URL = "https://fitxa-centres.vercel.app";

function centreCountLabel(count) {
  return count === 1 ? "1 centre educatiu" : `${count.toLocaleString("ca-ES")} centres educatius`;
}

function areaCountLabel(count) {
  return count === 1 ? "1 àrea territorial" : `${count.toLocaleString("ca-ES")} àrees territorials`;
}

function municipalityCountLabel(count) {
  return count === 1 ? "1 municipi" : `${count.toLocaleString("ca-ES")} municipis`;
}

function initialLetter(value) {
  const normalized = String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleUpperCase("ca");
  return normalized.match(/[A-Z]/)?.[0] || "#";
}

function pageShell({ title, description, canonicalPath, breadcrumbs, content, structuredData = [] }) {
  const canonicalUrl = `${SITE_URL}${canonicalPath}`;
  const breadcrumbData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbs.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      ...(item.path ? { item: `${SITE_URL}${item.path}` } : {}),
    })),
  };
  const breadcrumbHtml = breadcrumbs
    .map((item, index) => {
      const label = escapeHtml(item.name);
      const node = item.path ? `<a href="${escapeHtml(item.path)}">${label}</a>` : `<span aria-current="page">${label}</span>`;
      return `${index ? '<span aria-hidden="true">›</span>' : ""}${node}`;
    })
    .join("");

  return `<!doctype html>
<html lang="ca">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <meta name="description" content="${escapeHtml(description)}" />
  <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />
  <meta property="og:type" content="website" />
  <meta property="og:locale" content="ca_ES" />
  <meta property="og:site_name" content="Fitxa centres educatius" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
  <title>${escapeHtml(title)} | Fitxa Centres</title>
  <script>(()=>{try{const t=localStorage.getItem("centres-theme");const v=t==="light"||t==="dark"?t:"dark";document.documentElement.dataset.theme=v;document.documentElement.style.colorScheme=v}catch{document.documentElement.dataset.theme="dark"}})();</script>
  <link rel="stylesheet" href="/css/fitxa-centre.css?v=20260818-seo-directori" />
  <script type="application/ld+json">${scriptJson(breadcrumbData)}</script>
  ${structuredData.map((data) => `<script type="application/ld+json">${scriptJson(data)}</script>`).join("\n  ")}
</head>
<body class="directory-page">
  <main class="container">
    <header class="site-header">
      <a class="brand" href="/" aria-label="Inici"><span class="brand-mark" aria-hidden="true"></span><span>Fitxa centres educatius</span></a>
      <form class="centre-header-search" role="search" action="/" method="get">
        <div class="controls">
          <label class="search-field" for="directorySearch">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m21 21-4.35-4.35m2.35-5.65a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z" /></svg>
            <input id="directorySearch" name="cerca" type="text" placeholder="Codi, nom del centre o municipi" autocomplete="off" />
          </label>
          <button id="load" type="submit">
            <span class="search-action-icon-slot search-action-icon-leading" aria-hidden="true"><svg class="action-button-icon" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-4-4"></path></svg></span>
            <span>Cerca</span>
            <span class="search-action-icon-slot search-action-icon-trailing" aria-hidden="true"><svg class="action-button-icon" viewBox="0 0 24 24"><path d="M5 12h14"></path><path d="m13 6 6 6-6 6"></path></svg></span>
          </button>
        </div>
      </form>
      <div class="header-actions">
        <button id="themeButton" class="theme-button" type="button" aria-label="Activa el tema clar" title="Activa el tema clar">
          <svg class="theme-icon theme-icon-sun" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="3.5" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42" />
          </svg>
          <svg class="theme-icon theme-icon-moon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20.1 15.2A8.5 8.5 0 0 1 8.8 3.9 8.5 8.5 0 1 0 20.1 15.2Z" />
          </svg>
        </button>
      </div>
    </header>
    <nav class="breadcrumbs" aria-label="Fil d’Ariadna">${breadcrumbHtml}</nav>
    ${content}
    ${siteFooterHtml()}
  </main>
  <script>(()=>{const b=document.getElementById("themeButton");const update=()=>{const dark=document.documentElement.dataset.theme==="dark";const label=dark?"Activa el tema clar":"Activa el tema fosc";b?.setAttribute("aria-label",label);b?.setAttribute("title",label)};update();b?.addEventListener("click",()=>{const t=document.documentElement.dataset.theme==="dark"?"light":"dark";document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t;try{localStorage.setItem("centres-theme",t)}catch{}update()})})();</script>
</body>
</html>`;
}

export function renderCatalunya(centres) {
  const areaGroups = new Map();
  const municipalityKeys = new Set();
  for (const centre of centres) {
    const name = String(centre.nom_delegaci ?? "").trim();
    if (!name) continue;
    if (!areaGroups.has(name)) areaGroups.set(name, []);
    areaGroups.get(name).push(centre);
    const municipalityCode = String(centre.codi_municipi ?? "").trim();
    const municipalityName = String(centre.nom_municipi ?? "").trim();
    if (municipalityCode || municipalityName) municipalityKeys.add(municipalityCode || `${name}\u0000${municipalityName}`);
  }
  const areas = Array.from(areaGroups, ([name, rows]) => ({ name, count: rows.length }))
    .sort((a, b) => compareNames(a.name, b.name));
  const list = areas.map((area) => `<li><a href="${escapeHtml(areaPath(area.name))}"><span>${escapeHtml(area.name)}</span><small>${centreCountLabel(area.count)}</small></a></li>`).join("");
  const title = "Centres educatius de Catalunya";
  return pageShell({
    title,
    description: `Catalunya: consulta ${centreCountLabel(centres.length)} en ${areaCountLabel(areas.length)} i ${municipalityCountLabel(municipalityKeys.size)}, amb accés a totes les fitxes.`,
    canonicalPath: "/centres/",
    breadcrumbs: [{ name: "Catalunya" }],
    content: `<section class="directory-hero"><p class="directory-kicker">Directori territorial</p><h1>Catalunya</h1><p>${areaCountLabel(areas.length)} · ${municipalityCountLabel(municipalityKeys.size)} · ${centreCountLabel(centres.length)}</p></section><section class="directory-section"><h2>Explora per àrea territorial</h2><ul class="directory-grid">${list}</ul></section>`,
  });
}

export function renderMunicipalityIndex(centres) {
  const municipalityMap = new Map();
  for (const centre of centres) {
    const area = String(centre.nom_delegaci ?? "").trim();
    const municipality = String(centre.nom_municipi ?? "").trim();
    const municipalityCode = String(centre.codi_municipi ?? "").trim();
    if (!area || !municipality) continue;
    const key = municipalityCode || `${area}\u0000${municipality}`;
    const current = municipalityMap.get(key) || { area, municipality, count: 0 };
    current.count += 1;
    municipalityMap.set(key, current);
  }
  const municipalities = Array.from(municipalityMap.values())
    .sort((a, b) => compareNames(a.municipality, b.municipality));
  const groups = new Map();
  for (const item of municipalities) {
    const letter = initialLetter(item.municipality);
    if (!groups.has(letter)) groups.set(letter, []);
    groups.get(letter).push(item);
  }
  const alphabet = Array.from(groups.keys()).sort(compareNames);
  const alphabetLinks = alphabet
    .map((letter) => `<a href="#lletra-${encodeURIComponent(letter.toLocaleLowerCase("ca"))}">${escapeHtml(letter)}</a>`)
    .join("");
  const sections = alphabet.map((letter) => {
    const items = groups.get(letter).map((item) =>
      `<li><a href="${escapeHtml(municipalityPath(item.area, item.municipality))}"><strong>${escapeHtml(item.municipality)}</strong><span>${escapeHtml(item.area)} · ${centreCountLabel(item.count)}</span></a></li>`
    ).join("");
    return `<section class="alphabet-section" aria-labelledby="lletra-${escapeHtml(letter.toLocaleLowerCase("ca"))}"><h2 id="lletra-${escapeHtml(letter.toLocaleLowerCase("ca"))}">${escapeHtml(letter)}</h2><ul class="municipality-index-list">${items}</ul></section>`;
  }).join("");
  const description = `Municipis de Catalunya: consulta ${municipalityCountLabel(municipalities.length)} amb centres educatius i accedeix a totes les fitxes.`;
  return pageShell({
    title: "Municipis amb centres educatius a Catalunya",
    description,
    canonicalPath: "/municipis/",
    breadcrumbs: [{ name: "Catalunya", path: "/centres/" }, { name: "Municipis" }],
    content: `<section class="directory-hero municipality-index-hero"><p class="directory-kicker">Directori territorial</p><h1>Municipis</h1><p>${municipalityCountLabel(municipalities.length)} · ${centreCountLabel(centres.length)}</p></section><nav class="alphabet-nav" aria-label="Índex alfabètic de municipis">${alphabetLinks}</nav><div class="municipality-index">${sections}</div>`,
  });
}

export function renderArea(centres, area) {
  const areaCentres = centres.filter((row) => String(row.nom_delegaci ?? "").trim() === area);
  const municipalities = new Map();
  for (const centre of areaCentres) {
    const name = String(centre.nom_municipi ?? "").trim();
    if (!name) continue;
    if (!municipalities.has(name)) municipalities.set(name, []);
    municipalities.get(name).push(centre);
  }
  const items = Array.from(municipalities, ([name, rows]) => ({ name, count: rows.length }))
    .sort((a, b) => compareNames(a.name, b.name));
  const list = items.map((item) => `<li><a href="${escapeHtml(municipalityPath(area, item.name))}"><span>${escapeHtml(item.name)}</span><small>${centreCountLabel(item.count)}</small></a></li>`).join("");
  const title = `Centres educatius de ${area}`;
  const centreCount = centreCountLabel(areaCentres.length);
  const municipalityCount = municipalityCountLabel(items.length);
  return pageShell({
    title,
    description: `${area}: consulta ${centreCount} en ${municipalityCount}, amb informació i accés a les fitxes dels centres.`,
    canonicalPath: areaPath(area),
    breadcrumbs: [{ name: "Catalunya", path: "/centres/" }, { name: area }],
    content: `<section class="directory-hero"><p class="directory-kicker">Àrea territorial</p><h1>${escapeHtml(area)}</h1><p>${municipalityCount} · ${centreCount}</p></section><section class="directory-section"><h2>Municipis de ${escapeHtml(area)}</h2><ul class="directory-grid">${list}</ul></section>`,
  });
}

export function renderMunicipality(centres, area, municipality) {
  const rows = centres.filter((row) =>
    String(row.nom_delegaci ?? "").trim() === area && String(row.nom_municipi ?? "").trim() === municipality
  ).sort((a, b) => compareNames(a.denominaci_completa, b.denominaci_completa));
  const list = rows.map((row) => `<li><a href="${escapeHtml(centrePath(row))}"><strong>${escapeHtml(row.denominaci_completa)}</strong><span>${escapeHtml(row.nom_naturalesa || "Centre educatiu")}${row.adre_a ? ` · ${escapeHtml(row.adre_a)}` : ""}</span></a></li>`).join("");
  const title = `Centres educatius de ${municipality}`;
  const centreCount = centreCountLabel(rows.length);
  const description = `${municipality}: consulta ${centreCount} amb informació de contacte, titularitat, estudis i accés a cada fitxa.`;
  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: title,
    numberOfItems: rows.length,
    itemListElement: rows.map((row, index) => ({ "@type": "ListItem", position: index + 1, name: row.denominaci_completa, url: `${SITE_URL}${centrePath(row)}` })),
  };
  return pageShell({
    title,
    description,
    canonicalPath: municipalityPath(area, municipality),
    breadcrumbs: [{ name: "Catalunya", path: "/centres/" }, { name: area, path: areaPath(area) }, { name: municipality }],
    structuredData: [itemList],
    content: `<section class="directory-hero municipality-hero"><p class="directory-kicker">Municipi</p><h1>${escapeHtml(municipality)}</h1><p>${centreCount}</p></section><section class="directory-section"><h2>Llistat de centres educatius de ${escapeHtml(municipality)}</h2><ul class="centre-directory-list">${list}</ul></section>`,
  });
}

function errorPage(status, title, message) {
  return `<!doctype html><html lang="ca"><head><meta charset="utf-8"><meta name="robots" content="noindex"><title>${escapeHtml(title)}</title><link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/css/fitxa-centre.css"></head><body><main class="container"><section class="route-error"><p>Error ${status}</p><h1>${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p><a href="/centres/">Explora els centres</a></section>${siteFooterHtml()}</main></body></html>`;
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const view = String(url.searchParams.get("view") ?? "").trim();
    const areaSlug = String(url.searchParams.get("area") ?? "").trim();
    const municipalitySlug = String(url.searchParams.get("municipi") ?? "").trim();
    try {
      const centres = await getCurrentCentres();
      if (view === "municipis") return new Response(renderMunicipalityIndex(centres), { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } });
      if (!areaSlug) return new Response(renderCatalunya(centres), { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } });
      const area = Array.from(new Set(centres.map((row) => String(row.nom_delegaci ?? "").trim()))).find((name) => slugify(name) === areaSlug);
      if (!area) return new Response(errorPage(404, "Àrea territorial no trobada", "No s’ha trobat aquesta àrea territorial."), { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } });
      if (!municipalitySlug) return new Response(renderArea(centres, area), { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } });
      const municipality = Array.from(new Set(centres.filter((row) => String(row.nom_delegaci ?? "").trim() === area).map((row) => String(row.nom_municipi ?? "").trim()))).find((name) => slugify(name) === municipalitySlug);
      if (!municipality) return new Response(errorPage(404, "Municipi no trobat", "No s’ha trobat aquest municipi dins de l’àrea territorial."), { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } });
      return new Response(renderMunicipality(centres, area, municipality), { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } });
    } catch (error) {
      return new Response(errorPage(503, "Dades temporalment no disponibles", error instanceof Error ? error.message : "Torna-ho a provar més tard."), { status: 503, headers: { "Content-Type": "text/html; charset=utf-8", "Retry-After": "60" } });
    }
  },
};
