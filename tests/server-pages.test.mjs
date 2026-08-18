import test from "node:test";
import assert from "node:assert/strict";

import centreFunction from "../api/centre.mjs";
import directoriFunction from "../api/directori.mjs";
import homeFunction from "../api/home.mjs";
import sitemapFunction from "../api/sitemap.mjs";

const centreRow = {
  curs: "2025/2026",
  any: "2025",
  codi_centre: "08047431",
  denominaci_completa: "Institut XXV Olimpíada",
  nom_naturalesa: "Públic",
  nom_titularitat: "Departament d'Educació i Formació Professional",
  e_mail_centre: "a8047431@xtec.cat",
  url: "http://institutxxvolimpiada.cat/",
  tel_fon: "932890630",
  adre_a: "c. Dàlia, s/n",
  nom_municipi: "Barcelona",
  codi_postal: "08004",
  nom_delegaci: "Consorci d'Educació de Barcelona",
  nom_comarca: "Barcelonès",
  eso: "S",
  batx: "S",
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

test("la pàgina de centre canònica retorna HTML complet, metadades i breadcrumbs", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const decoded = decodeURIComponent(String(url));
    if (decoded.includes("max(curs)")) return jsonResponse([{ current_curs: "2025/2026" }]);
    return jsonResponse([centreRow]);
  };

  try {
    const response = await centreFunction.fetch(new Request("https://example.test/api/centre?centre=08047431-institut-xxv-olimpiada-barcelona"));
    const html = await response.text();
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type"), /text\/html/);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.match(html, /<h1>Institut XXV Olimpíada<\/h1>/);
    assert.match(html, /<p class="hero-description">Barcelona<\/p>/);
    assert.doesNotMatch(html, /Fitxa del centre educatiu · Barcelona/);
    assert.match(html, /<link rel="canonical" href="https:\/\/fitxa-centres\.vercel\.app\/centre\/08047431-institut-xxv-olimpiada-barcelona\/" \/>/);
    assert.match(html, /<meta name="description" content="Institut XXV Olimpíada \(Barcelona\): consulta el contacte, la ubicació, els estudis, la matrícula i les especialitats docents del centre\." \/>/);
    assert.match(html, /class="breadcrumbs"/);
    assert.match(html, /<div class="centre-header-search"[^>]*>[\s\S]*?<div class="controls">/);
    assert.doesNotMatch(html, /<div class="centre-header-search"[^>]*><\/div>/);
    assert.doesNotMatch(html, /home-explore-links/);
    assert.match(html, /"@type":"BreadcrumbList"/);
    assert.match(html, /<th>Codi centre<\/th><td>08047431<\/td>/);
    assert.match(html, /window\.__INITIAL_CENTRE_ROW__/);
    assert.doesNotMatch(html, /<table id="resultTable" class="hidden">/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("la URL antiga d’un centre redirigeix permanentment a la descriptiva", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const decoded = decodeURIComponent(String(url));
    if (decoded.includes("max(curs)")) return jsonResponse([{ current_curs: "2025/2026" }]);
    return jsonResponse([centreRow]);
  };
  try {
    const response = await centreFunction.fetch(new Request("https://example.test/api/centre?centre=08047431"));
    assert.equal(response.status, 301);
    assert.equal(response.headers.get("location"), "https://fitxa-centres.vercel.app/centre/08047431-institut-xxv-olimpiada-barcelona/");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("un codi inexistent retorna 404 i no s'indexa", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const decoded = decodeURIComponent(String(url));
    return decoded.includes("max(curs)")
      ? jsonResponse([{ current_curs: "2025/2026" }])
      : jsonResponse([]);
  };

  try {
    const response = await centreFunction.fetch(new Request("https://example.test/api/centre?code=08000000"));
    const html = await response.text();
    assert.equal(response.status, 404);
    assert.match(html, /<meta name="robots" content="noindex">/);
    assert.match(html, /Centre no trobat/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("el sitemap enumera la portada i les fitxes", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const decoded = decodeURIComponent(String(url));
    if (decoded.includes("max(curs)")) return jsonResponse([{ current_curs: "2025/2026" }]);
    return jsonResponse([
      centreRow,
      { ...centreRow, codi_centre: "08022392", denominaci_completa: "Escola del Mar" },
    ]);
  };

  try {
    const response = await sitemapFunction.fetch();
    const xml = await response.text();
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type"), /application\/xml/);
    assert.match(xml, /https:\/\/fitxa-centres\.vercel\.app\/centres\//);
    assert.match(xml, /https:\/\/fitxa-centres\.vercel\.app\/municipis\//);
    assert.match(xml, /centres\/consorci-d-educacio-de-barcelona\/barcelona\//);
    assert.match(xml, /centre\/08047431-institut-xxv-olimpiada-barcelona\//);
    assert.match(xml, /centre\/08022392-escola-del-mar-barcelona\//);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("el directori genera pàgines d’àrea i municipi amb enllaços rastrejables", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const decoded = decodeURIComponent(String(url));
    if (decoded.includes("max(curs)")) return jsonResponse([{ current_curs: "2025/2026" }]);
    return jsonResponse([
      centreRow,
      { ...centreRow, codi_centre: "08022392", denominaci_completa: "Escola del Mar", nom_naturalesa: "Privat" },
    ]);
  };
  try {
    const catalunyaResponse = await directoriFunction.fetch(new Request("https://example.test/api/directori"));
    const catalunyaHtml = await catalunyaResponse.text();
    assert.match(catalunyaHtml, /<h1>Catalunya<\/h1>/);
    assert.match(catalunyaHtml, /<p>1 àrea territorial · 1 municipi · 2 centres educatius<\/p>/);
    assert.match(catalunyaHtml, /content="Catalunya: consulta 2 centres educatius en 1 àrea territorial i 1 municipi, amb accés a totes les fitxes\."/);

    const municipalityIndexResponse = await directoriFunction.fetch(new Request("https://example.test/api/directori?view=municipis"));
    const municipalityIndexHtml = await municipalityIndexResponse.text();
    assert.equal(municipalityIndexResponse.status, 200);
    assert.match(municipalityIndexHtml, /<h1>Municipis<\/h1>/);
    assert.match(municipalityIndexHtml, /class="alphabet-nav"/);
    assert.match(municipalityIndexHtml, /href="#lletra-b"/);
    assert.match(municipalityIndexHtml, /href="\/centres\/consorci-d-educacio-de-barcelona\/barcelona\/"/);
    assert.doesNotMatch(municipalityIndexHtml, /Tots els municipis/);

    const areaResponse = await directoriFunction.fetch(new Request("https://example.test/api/directori?area=consorci-d-educacio-de-barcelona"));
    const areaHtml = await areaResponse.text();
    assert.equal(areaResponse.status, 200);
    assert.match(areaHtml, /<h1>Consorci d&#039;Educació de Barcelona<\/h1>/);
    assert.match(areaHtml, /<p>1 municipi · 2 centres educatius<\/p>/);
    assert.match(areaHtml, /content="Consorci d&#039;Educació de Barcelona: consulta 2 centres educatius en 1 municipi, amb informació i accés a les fitxes dels centres\."/);
    assert.doesNotMatch(areaHtml, /Aquesta àrea territorial agrupa/);
    assert.match(areaHtml, /href="\/centres\/consorci-d-educacio-de-barcelona\/barcelona\/"/);
    assert.match(areaHtml, /class="theme-icon theme-icon-sun"/);
    assert.match(areaHtml, /class="theme-icon theme-icon-moon"/);
    assert.doesNotMatch(areaHtml, />◐</);
    assert.match(areaHtml, /<form class="centre-header-search" role="search" action="\/" method="get">/);
    assert.match(areaHtml, /name="cerca"/);
    assert.match(areaHtml, /Llicència AGPL v3\+/);
    assert.match(areaHtml, /Crèdits de tercers/);

    const municipalityResponse = await directoriFunction.fetch(new Request("https://example.test/api/directori?area=consorci-d-educacio-de-barcelona&municipi=barcelona"));
    const municipalityHtml = await municipalityResponse.text();
    assert.equal(municipalityResponse.status, 200);
    assert.match(municipalityHtml, /<h1>Barcelona<\/h1>/);
    assert.match(municipalityHtml, /class="directory-hero municipality-hero"/);
    assert.match(municipalityHtml, /<p>2 centres educatius<\/p>/);
    assert.match(municipalityHtml, /content="Barcelona: consulta 2 centres educatius amb informació de contacte, titularitat, estudis i accés a cada fitxa\."/);
    assert.doesNotMatch(municipalityHtml, /públics i/);
    assert.match(municipalityHtml, /href="\/centre\/08047431-institut-xxv-olimpiada-barcelona\/"/);
    assert.match(municipalityHtml, /"@type":"ItemList"/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("la portada incorpora l’exploració per àrea territorial", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const decoded = decodeURIComponent(String(url));
    if (decoded.includes("max(curs)")) return jsonResponse([{ current_curs: "2025/2026" }]);
    return jsonResponse([centreRow]);
  };
  try {
    const response = await homeFunction.fetch();
    const html = await response.text();
    assert.equal(response.status, 200);
    assert.match(html, /<nav class="home-explore-links"[^>]*>[\s\S]*?<a href="\/centres\/">Explora per àrea territorial<\/a>[\s\S]*?<a href="\/municipis\/">Explora per municipi<\/a>[\s\S]*?<\/nav>/);
    assert.doesNotMatch(html, /Explora els centres educatius<\/h2>/);
    assert.doesNotMatch(html, /12 àrees territorials|735 municipis/);
    assert.match(html, /Cerca centres educatius de Catalunya per nom, codi o municipi, o explora’ls per àrea territorial i accedeix a totes les fitxes\./);
    assert.match(html, /href="\/centres\/"/);
    assert.match(html, /href="\/municipis\/"/);
    assert.doesNotMatch(html, /href="\/centres\/consorci-d-educacio-de-barcelona\/"/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
