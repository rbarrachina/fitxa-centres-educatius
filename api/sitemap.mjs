import { areaPath, centrePath, getCurrentCentres, municipalityPath } from "./seo-utils.mjs";

const SITE_URL = "https://fitxa-centres.vercel.app";

function renderSitemap(centres) {
  const paths = new Set(["/", "/centres/", "/municipis/"]);
  for (const centre of centres) {
    const area = String(centre.nom_delegaci ?? "").trim();
    const municipality = String(centre.nom_municipi ?? "").trim();
    if (area) paths.add(areaPath(area));
    if (area && municipality) paths.add(municipalityPath(area, municipality));
    paths.add(centrePath(centre));
  }
  const urls = Array.from(paths).map((path) => `  <url><loc>${SITE_URL}${path}</loc></url>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
}

export default {
  async fetch() {
    try {
      const centres = await getCurrentCentres();
      return new Response(renderSitemap(centres), {
        status: 200,
        headers: {
          "Content-Type": "application/xml; charset=utf-8",
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      });
    } catch {
      return new Response(renderSitemap([]), {
        status: 200,
        headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, s-maxage=300" },
      });
    }
  },
};
