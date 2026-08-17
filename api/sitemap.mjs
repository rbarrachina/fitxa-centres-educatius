const SITE_URL = "https://fitxa-centres.vercel.app";
const SOCRATA_RESOURCE_URL = "https://analisi.transparenciacatalunya.cat/resource/kvmv-ahh4.json";

function escapeSoql(value) {
  return String(value ?? "").replaceAll("'", "''");
}

async function fetchJson(query) {
  const response = await fetch(`${SOCRATA_RESOURCE_URL}?$query=${encodeURIComponent(query)}`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(15000),
  });
  const raw = await response.text();
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error("Resposta no vàlida de Dades Obertes.");
  }
  if (!response.ok || !Array.isArray(data)) throw new Error(data?.message || "No s’han pogut obtenir els centres.");
  return data;
}

async function getCurrentCentreCodes() {
  const courseRows = await fetchJson("SELECT max(curs) as current_curs WHERE curs is not null");
  const course = String(courseRows?.[0]?.current_curs ?? "").trim();
  if (!course) throw new Error("No s’ha pogut determinar el curs actual.");
  const query =
    `SELECT codi_centre WHERE curs = '${escapeSoql(course)}' AND codi_centre is not null ` +
    "ORDER BY codi_centre LIMIT 10000";
  const rows = await fetchJson(query);
  return Array.from(
    new Set(
      rows
        .map((row) => String(row.codi_centre ?? "").trim())
        .filter((code) => /^\d{8}$/.test(code)),
    ),
  );
}

function renderSitemap(codes) {
  const urls = [
    `  <url><loc>${SITE_URL}/</loc></url>`,
    ...codes.map((code) => `  <url><loc>${SITE_URL}/centre/${code}/</loc></url>`),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
}

export default {
  async fetch() {
    try {
      const codes = await getCurrentCentreCodes();
      return new Response(renderSitemap(codes), {
        status: 200,
        headers: {
          "Content-Type": "application/xml; charset=utf-8",
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      });
    } catch {
      return new Response(renderSitemap([]), {
        status: 200,
        headers: {
          "Content-Type": "application/xml; charset=utf-8",
          "Cache-Control": "public, s-maxage=300",
        },
      });
    }
  },
};
