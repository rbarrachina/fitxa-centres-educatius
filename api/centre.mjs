import { readFileSync } from "node:fs";
import { join } from "node:path";
import { centrePath, escapeHtml, escapeSoql, scriptJson, siteFooterHtml, slugify } from "./seo-utils.mjs";

const SITE_URL = "https://fitxa-centres.vercel.app";
const SOCRATA_RESOURCE_URL = "https://analisi.transparenciacatalunya.cat/resource/kvmv-ahh4.json";
const template = readFileSync(join(process.cwd(), "web", "index.html"), "utf8");
const searchControls = template.match(
  /<div class="controls">[\s\S]*?<\/div>(?=\s*(?:<nav class="home-explore-links"[\s\S]*?<\/nav>\s*)?<div id="message")/,
)?.[0] || "";
const homeExploreLinks = template.match(/\s*<nav class="home-explore-links"[\s\S]*?<\/nav>/)?.[0] || "";

const STUDY_KEYS = [
  "einf1c", "einf2c", "epri", "eso", "batx", "aa01", "cfpm", "ppas", "aa03", "cfps",
  "ee", "ife", "pfi", "pa01", "cfam", "pa02", "cfas", "esdi", "escm", "escs", "adr",
  "crbc", "idi", "dane", "danp", "dans", "muse", "musp", "muss", "tegm", "tegs", "estr", "adults",
];

function isStudyActive(value) {
  const raw = String(value ?? "").trim().toLocaleLowerCase("ca");
  if (!raw || ["-", "0", "n", "no", "false", "fals", "cap"].includes(raw)) return false;
  const numeric = Number(raw.replace(",", "."));
  return !Number.isFinite(numeric) || numeric > 0;
}

function text(row, key, fallback = "-") {
  const value = String(row?.[key] ?? "").trim();
  return value || fallback;
}

function tableRow(label, value) {
  return `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`;
}

function initialRows(row) {
  const municipality = text(row, "nom_municipi");
  const locality = text(row, "nom_localitat", "");
  const municipalityDisplay = locality && locality !== municipality ? `${municipality} (${locality})` : municipality;
  const studies = STUDY_KEYS.filter((key) => isStudyActive(row[key])).map((key) => key.toUpperCase());
  const rows = [
    ["Codi centre", text(row, "codi_centre")],
    ["Nom centre", text(row, "denominaci_completa")],
    ["Naturalesa", text(row, "nom_naturalesa")],
    ["Titularitat", text(row, "nom_titularitat")],
    ["Correu electrònic del centre", text(row, "e_mail_centre")],
    ["URL pàgina web centre", text(row, "url")],
    ["Telèfon del centre", text(row, "tel_fon")],
    ["Adreça", text(row, "adre_a")],
    ["Municipi", municipalityDisplay],
  ];
  if (text(row, "nom_dm", "")) rows.push(["Nom districte municipal", text(row, "nom_dm")]);
  rows.push(
    ["Codi postal", text(row, "codi_postal")],
    ["Àrea Territorial", text(row, "nom_delegaci")],
    ["Comarca", text(row, "nom_comarca")],
    ["Curs", text(row, "curs")],
    ["Estudis", studies.length ? studies.join(" - ") : "-"],
  );
  return rows.map(([label, value]) => tableRow(label, value)).join("");
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(12000),
  });
  const raw = await response.text();
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error("L’API de Dades Obertes no ha retornat una resposta vàlida.");
  }
  if (!response.ok) throw new Error(data?.message || "No s’han pogut consultar les dades del centre.");
  return data;
}

async function fetchCurrentCentre(code) {
  const courseQuery = "SELECT max(curs) as current_curs WHERE curs is not null";
  const courseRows = await fetchJson(`${SOCRATA_RESOURCE_URL}?$query=${encodeURIComponent(courseQuery)}`);
  const course = String(courseRows?.[0]?.current_curs ?? "").trim();
  if (!course) throw new Error("No s’ha pogut determinar el curs actual.");

  const centreQuery =
    `SELECT * WHERE curs = '${escapeSoql(course)}' ` +
    `AND codi_centre = '${escapeSoql(code)}' ORDER BY any DESC, curs DESC LIMIT 5`;
  const rows = await fetchJson(`${SOCRATA_RESOURCE_URL}?$query=${encodeURIComponent(centreQuery)}`);
  if (!Array.isArray(rows) || !rows.length) return null;
  return rows.sort((a, b) => Object.values(b).filter(Boolean).length - Object.values(a).filter(Boolean).length)[0];
}

function replaceMeta(html, row, canonicalUrl) {
  const name = text(row, "denominaci_completa", "Centre educatiu");
  const municipality = text(row, "nom_municipi", "Catalunya");
  const description = `${name} (${municipality}): consulta el contacte, la ubicació, els estudis, la matrícula i les especialitats docents del centre.`;
  const title = `${name} de ${municipality} | Fitxa centres educatius`;

  return html
    .replace(/<meta\s+name="description"\s+content="[\s\S]*?"\s*\/>/, `<meta name="description" content="${escapeHtml(description)}" />`)
    .replace(/<link rel="canonical" href="[^"]+"\s*\/>/, `<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />`)
    .replace(/<meta property="og:type" content="[^"]+"\s*\/>/, '<meta property="og:type" content="profile" />')
    .replace(/<meta property="og:title" content="[^"]+"\s*\/>/, `<meta property="og:title" content="${escapeHtml(name)}" />`)
    .replace(/<meta property="og:description" content="[^"]+"\s*\/>/, `<meta property="og:description" content="${escapeHtml(description)}" />`)
    .replace(/<meta property="og:url" content="[^"]+"\s*\/>/, `<meta property="og:url" content="${escapeHtml(canonicalUrl)}" />`)
    .replace(/<meta name="twitter:title" content="[^"]+"\s*\/>/, `<meta name="twitter:title" content="${escapeHtml(name)}" />`)
    .replace(/<meta name="twitter:description" content="[^"]+"\s*\/>/, `<meta name="twitter:description" content="${escapeHtml(description)}" />`)
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(title)}</title>`);
}

function renderCentrePage(row) {
  const code = text(row, "codi_centre", "");
  const name = text(row, "denominaci_completa", "Centre educatiu");
  const municipality = text(row, "nom_municipi", "Catalunya");
  const area = text(row, "nom_delegaci", "Catalunya");
  const canonicalUrl = `${SITE_URL}${centrePath(row)}`;
  const areaUrl = `/centres/${slugify(area)}/`;
  const municipalityUrl = `${areaUrl}${slugify(municipality)}/`;
  const centreHero = `
      <div class="hero centre-hero">
        <h1>${escapeHtml(name)}</h1>
        <p class="hero-description">${escapeHtml(municipality)}</p>
      </div>`;
  const breadcrumbData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Catalunya", item: `${SITE_URL}/centres/` },
      { "@type": "ListItem", position: 2, name: area, item: `${SITE_URL}${areaUrl}` },
      { "@type": "ListItem", position: 3, name: municipality, item: `${SITE_URL}${municipalityUrl}` },
      { "@type": "ListItem", position: 4, name },
    ],
  };
  const breadcrumbs = `<nav class="breadcrumbs" aria-label="Fil d’Ariadna"><a href="/centres/">Catalunya</a><span aria-hidden="true">›</span><a href="${escapeHtml(areaUrl)}">${escapeHtml(area)}</a><span aria-hidden="true">›</span><a href="${escapeHtml(municipalityUrl)}">${escapeHtml(municipality)}</a><span aria-hidden="true">›</span><span aria-current="page">${escapeHtml(name)}</span></nav>`;
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    name,
    identifier: code,
    address: {
      "@type": "PostalAddress",
      streetAddress: text(row, "adre_a", ""),
      addressLocality: municipality,
      postalCode: text(row, "codi_postal", ""),
      addressRegion: "Catalunya",
      addressCountry: "ES",
    },
    telephone: text(row, "tel_fon", ""),
    email: text(row, "e_mail_centre", ""),
    url: canonicalUrl,
  };

  let html = replaceMeta(template, row, canonicalUrl)
    .replace("<head>", '<head>\n  <base href="/" />')
    .replace("<body>", '<body class="centre-page">')
    .replace("    <section id=\"sectionFitxa\">", `    ${breadcrumbs}\n\n    <section id="sectionFitxa">`)
    .replace(/\s*<div class="hero">[\s\S]*?<\/div>\s*(?=<div class="controls">)/, `\n${centreHero}\n\n      `)
    .replace(searchControls, "")
    .replace(homeExploreLinks, "")
    .replace(
      '<div class="header-actions">',
      `<div class="centre-header-search" aria-label="Cerca de centres">${searchControls}</div>\n      <div class="header-actions">`,
    )
    .replace('<table id="resultTable" class="hidden">', '<table id="resultTable">')
    .replace('<tbody id="resultBody"></tbody>', `<tbody id="resultBody">${initialRows(row)}</tbody>`)
    .replace(
      "  <script>\n    // Per GitHub Pages",
      `  <script type="application/ld+json">${scriptJson(structuredData)}</script>\n  <script type="application/ld+json">${scriptJson(breadcrumbData)}</script>\n  <script>\n    window.__CENTRE_PAGE__ = true;\n    window.__INITIAL_CENTRE_ROW__ = ${scriptJson(row)};\n  </script>\n  <script>\n    // Per GitHub Pages`,
    );
  return html;
}

function renderErrorPage(status, title, message) {
  const safeTitle = escapeHtml(title);
  const safeMessage = escapeHtml(message);
  return `<!doctype html><html lang="ca"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>${safeTitle} | Fitxa centres educatius</title><link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/css/fitxa-centre.css"></head><body><main class="container"><header class="site-header"><a class="brand" href="/"><span class="brand-mark" aria-hidden="true"></span><span>Fitxa centres educatius</span></a></header><section class="route-error"><p class="centre-kicker">Error ${status}</p><h1>${safeTitle}</h1><p>${safeMessage}</p><a class="route-error-link" href="/">Torna al cercador</a></section>${siteFooterHtml()}</main></body></html>`;
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const routeValue = String(url.searchParams.get("centre") ?? url.searchParams.get("code") ?? "").trim();
    const routeMatch = routeValue.match(/^(\d{8})(?:-|$)/);
    const code = routeMatch?.[1] || "";
    if (!/^\d{8}$/.test(code)) {
      return new Response(renderErrorPage(400, "Codi de centre no vàlid", "El codi del centre ha de tenir 8 dígits."), {
        status: 400,
        headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
      });
    }

    try {
      const row = await fetchCurrentCentre(code);
      if (!row) {
        return new Response(renderErrorPage(404, "Centre no trobat", "No s’ha trobat cap centre actual amb aquest codi."), {
          status: 404,
          headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
        });
      }
      const canonicalPath = centrePath(row);
      const canonicalRouteValue = canonicalPath.split("/").filter(Boolean).at(-1);
      if (routeValue !== canonicalRouteValue) {
        return new Response(null, {
          status: 301,
          headers: { Location: `${SITE_URL}${canonicalPath}`, "Cache-Control": "public, max-age=3600" },
        });
      }
      return new Response(renderCentrePage(row), {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
      });
    } catch (error) {
      return new Response(
        renderErrorPage(503, "Dades temporalment no disponibles", error instanceof Error ? error.message : "Torna-ho a provar d’aquí a uns minuts."),
        {
          status: 503,
          headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Retry-After": "60" },
        },
      );
    }
  },
};
