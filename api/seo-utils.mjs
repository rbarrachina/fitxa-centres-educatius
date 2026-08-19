const SOCRATA_RESOURCE_URL = "https://analisi.transparenciacatalunya.cat/resource/kvmv-ahh4.json";

export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function escapeSoql(value) {
  return String(value ?? "").replaceAll("'", "''");
}

export function slugify(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("ca")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function centreSlug(row) {
  const code = String(row?.codi_centre ?? "").trim();
  const descriptive = slugify(`${row?.denominaci_completa ?? ""}-${row?.nom_municipi ?? ""}`);
  return descriptive ? `${code}-${descriptive}` : code;
}

export function centrePath(row) {
  return `/centre/${centreSlug(row)}/`;
}

export function areaPath(areaName) {
  return `/centres/${slugify(areaName)}/`;
}

export function municipalityPath(areaName, municipalityName) {
  return `/centres/${slugify(areaName)}/${slugify(municipalityName)}/`;
}

export function scriptJson(value) {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}

export function siteFooterHtml() {
  return `<footer class="site-footer">
      <div class="footer-brand">
        <span class="footer-mark" aria-hidden="true"></span>
        <div class="footer-brand-copy">
          <a class="footer-author" href="https://www.linkedin.com/in/rafa-barrachina-6814701a/" target="_blank" rel="me noopener noreferrer" aria-label="Rafa Barrachina a LinkedIn">
            <span>Rafa Barrachina</span>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.34V8.99h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.29ZM5.32 7.42a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12ZM7.1 20.45H3.54V8.99H7.1v11.46Z" /></svg>
          </a>
          <span aria-hidden="true">·</span>
          <span>2026</span>
        </div>
      </div>
      <nav class="footer-links" aria-label="Informació del projecte">
        <a href="https://github.com/rbarrachina/fitxa-centres-educatius" target="_blank" rel="noopener noreferrer">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 2a10 10 0 0 0-3.162 19.49c.5.092.683-.217.683-.482 0-.238-.009-.868-.014-1.703-2.782.604-3.369-1.341-3.369-1.341-.454-1.154-1.108-1.462-1.108-1.462-.907-.62.069-.608.069-.608 1.003.07 1.531 1.031 1.531 1.031.892 1.53 2.341 1.088 2.91.833.091-.646.35-1.088.636-1.338-2.221-.253-4.555-1.11-4.555-4.944 0-1.092.39-1.985 1.03-2.685-.103-.254-.447-1.274.097-2.655 0 0 .84-.269 2.75 1.025a9.57 9.57 0 0 1 5.005 0c1.909-1.294 2.748-1.025 2.748-1.025.545 1.381.201 2.401.099 2.655.641.7 1.029 1.593 1.029 2.685 0 3.842-2.338 4.687-4.566 4.935.359.31.679.922.679 1.858 0 1.341-.012 2.422-.012 2.752 0 .268.18.579.688.481A10.002 10.002 0 0 0 12 2Z" />
          </svg>
          <span>Codi font</span>
        </a>
        <a href="https://github.com/rbarrachina/fitxa-centres-educatius/blob/main/LICENSE" target="_blank" rel="license noopener noreferrer">Llicència AGPL v3+</a>
        <a href="https://github.com/rbarrachina/fitxa-centres-educatius#llic%C3%A8ncies-i-atribuci%C3%B3-de-tercers" target="_blank" rel="noopener noreferrer">Crèdits de tercers</a>
      </nav>
    </footer>`;
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
  if (!response.ok || !Array.isArray(data)) {
    throw new Error(data?.message || "No s’han pogut obtenir els centres.");
  }
  return data;
}

export async function getCurrentCourse() {
  const rows = await fetchJson("SELECT max(curs) as current_curs WHERE curs is not null");
  const course = String(rows?.[0]?.current_curs ?? "").trim();
  if (!course) throw new Error("No s’ha pogut determinar el curs actual.");
  return course;
}

export async function getCurrentCentres() {
  const course = await getCurrentCourse();
  const query =
    "SELECT codi_centre, denominaci_completa, nom_municipi, codi_municipi, " +
    "nom_delegaci, codi_delegaci, nom_naturalesa, adre_a " +
    `WHERE curs = '${escapeSoql(course)}' AND codi_centre is not null ` +
    "ORDER BY codi_centre LIMIT 10000";
  const rows = await fetchJson(query);
  const byCode = new Map();
  for (const row of rows) {
    const code = String(row?.codi_centre ?? "").trim();
    if (/^\d{8}$/.test(code) && !byCode.has(code)) byCode.set(code, row);
  }
  return Array.from(byCode.values());
}

export function compareNames(a, b) {
  return String(a ?? "").localeCompare(String(b ?? ""), "ca", { sensitivity: "base" });
}
