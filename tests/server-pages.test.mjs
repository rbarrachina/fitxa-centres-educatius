import test from "node:test";
import assert from "node:assert/strict";

import centreFunction from "../api/centre.mjs";
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

test("la pàgina de centre retorna HTML complet i metadades pròpies", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const decoded = decodeURIComponent(String(url));
    if (decoded.includes("max(curs)")) return jsonResponse([{ current_curs: "2025/2026" }]);
    return jsonResponse([centreRow]);
  };

  try {
    const response = await centreFunction.fetch(new Request("https://example.test/api/centre?code=08047431"));
    const html = await response.text();
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type"), /text\/html/);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.match(html, /<h1>Institut XXV Olimpíada<\/h1>/);
    assert.match(html, /<p class="hero-description">Barcelona<\/p>/);
    assert.doesNotMatch(html, /Fitxa del centre educatiu · Barcelona/);
    assert.match(html, /<link rel="canonical" href="https:\/\/fitxa-centres\.vercel\.app\/centre\/08047431\/" \/>/);
    assert.match(html, /<th>Codi centre<\/th><td>08047431<\/td>/);
    assert.match(html, /window\.__INITIAL_CENTRE_ROW__/);
    assert.doesNotMatch(html, /<table id="resultTable" class="hidden">/);
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
    return jsonResponse([{ codi_centre: "08047431" }, { codi_centre: "08022392" }]);
  };

  try {
    const response = await sitemapFunction.fetch();
    const xml = await response.text();
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type"), /application\/xml/);
    assert.match(xml, /https:\/\/fitxa-centres\.vercel\.app\/centre\/08047431\//);
    assert.match(xml, /https:\/\/fitxa-centres\.vercel\.app\/centre\/08022392\//);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
