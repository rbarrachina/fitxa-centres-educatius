(() => {
  type MapModalApi = {
    openByUtm: (xValue: string, yValue: string) => void;
    close: () => void;
  };

  type FitxaApi = {
    init: () => void;
  };

  type SocrataRow = Record<string, unknown>;

  type MapesWindow = Window & {
    FitxaCentre?: FitxaApi;
    MapesMapModal?: MapModalApi;
    MAPES_API_BASE?: string;
  };

  const win = window as MapesWindow;
  const apiBase = String(win.MAPES_API_BASE || "").trim().replace(/\/+$/, "");

  const SOCRATA_RESOURCE_URL = "https://analisi.transparenciacatalunya.cat/resource/kvmv-ahh4.json";
  const SOCRATA_SOURCE_URL = "https://analisi.transparenciacatalunya.cat/d/kvmv-ahh4";
  const SOCRATA_SELECT = "*";
  const KEY_LABELS: Record<string, string> = {
    any: "Any",
    curs: "Curs",
    codi_centre: "Codi centre",
    denominaci_completa: "Nom centre",
    codi_naturalesa: "Codi naturalesa",
    nom_naturalesa: "Naturalesa",
    codi_titularitat: "Codi titularitat",
    nom_titularitat: "Titularitat",
    adre_a: "Adreça",
    codi_postal: "Codi postal",
    tel_fon: "Telèfon del centre",
    codi_delegaci: "Codi delegació",
    nom_delegaci: "Àrea Territorial",
    codi_comarca: "Codi comarca",
    nom_comarca: "Comarca",
    codi_municipi: "Codi municipi",
    codi_municipi_6: "Codi municipi (6)",
    nom_municipi: "Població",
    codi_districte_municipal: "Codi districte municipal",
    nom_dm: "Nom districte municipal",
    codi_localitat: "Codi localitat",
    nom_localitat: "Localitat",
    coordenades_utm_x: "Coordenada UTM X",
    coordenades_utm_y: "Coordenada UTM Y",
    coordenades_geo_x: "Coordenada Geo X",
    coordenades_geo_y: "Coordenada Geo Y",
    e_mail_centre: "Correu electrònic del centre",
    url: "URL pàgina web centre",
    imatge: "Imatge",
    geo_1: "Geo 1",
  };
  const PRIORITY_KEYS = [
    "any",
    "curs",
    "codi_naturalesa",
    "nom_naturalesa",
    "codi_titularitat",
    "nom_titularitat",
    "adre_a",
    "codi_postal",
    "tel_fon",
    "codi_delegaci",
    "nom_delegaci",
    "codi_comarca",
    "nom_comarca",
    "codi_municipi",
    "codi_municipi_6",
    "nom_municipi",
    "codi_districte_municipal",
    "nom_dm",
    "codi_localitat",
    "nom_localitat",
    "coordenades_utm_x",
    "coordenades_utm_y",
    "coordenades_geo_x",
    "coordenades_geo_y",
    "e_mail_centre",
    "url",
    "imatge",
    "einf1c",
    "einf2c",
    "epri",
    "eso",
    "batx",
    "aa01",
    "cfpm",
    "ppas",
    "aa03",
    "cfps",
    "ee",
    "ife",
    "pfi",
    "pa01",
    "cfam",
    "pa02",
    "cfas",
    "esdi",
    "escm",
    "escs",
    "adr",
    "crbc",
    "idi",
    "dane",
    "danp",
    "dans",
    "muse",
    "musp",
    "muss",
    "tegm",
    "tegs",
    "estr",
    "adults",
    "geo_1",
  ];

  function apiUrl(path: string): string {
    const normalizedPath = path.replace(/^\/+/, "");
    return apiBase ? `${apiBase}/${normalizedPath}` : normalizedPath;
  }

  function escapeSoql(value: string): string {
    return String(value || "").replaceAll("'", "''");
  }

  function normalizeWebUrl(value: unknown): string {
    const raw = String(value || "").trim();
    if (!raw || raw === "0" || raw === "-") return "";
    return raw;
  }

  function asText(value: unknown): string {
    if (value === null || value === undefined) return "";
    if (typeof value === "string") return value.trim();
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  function toInt(value: unknown): number {
    const parsed = Number(asText(value));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function prettifyKey(key: string): string {
    if (KEY_LABELS[key]) return KEY_LABELS[key];
    return key
      .replaceAll("_", " ")
      .replace(/\b\w/g, (m) => m.toUpperCase());
  }

  function pickBestRow(rows: SocrataRow[]): SocrataRow | null {
    if (!rows.length) return null;
    const sorted = [...rows].sort((a, b) => {
      const yearDiff = toInt(b.any) - toInt(a.any);
      if (yearDiff !== 0) return yearDiff;
      const cursDiff = toInt(b.curs) - toInt(a.curs);
      if (cursDiff !== 0) return cursDiff;
      const aScore = Object.values(a).filter((v) => asText(v)).length;
      const bScore = Object.values(b).filter((v) => asText(v)).length;
      return bScore - aScore;
    });
    return sorted[0];
  }

  function rowToOrderedFields(row: SocrataRow): Record<string, string> {
    const fields: Record<string, string> = {};
    const ignored = new Set(["codi_centre", "denominaci_completa"]);
    const keys = Object.keys(row).filter((k) => !ignored.has(k));

    const priorityPresent = PRIORITY_KEYS.filter((k) => keys.includes(k));
    const rest = keys
      .filter((k) => !priorityPresent.includes(k))
      .sort((a, b) => a.localeCompare(b, "ca"));
    const ordered = [...priorityPresent, ...rest];

    ordered.forEach((key) => {
      const label = prettifyKey(key);
      const value = asText(row[key]) || "-";
      fields[label] = value;
    });

    return fields;
  }

  function buildNoJsonMessage(): string {
    return "La resposta del servidor no és JSON vàlid.";
  }

  async function fetchSocrataRows(whereClause: string, limit: number): Promise<SocrataRow[]> {
    const query = `SELECT ${SOCRATA_SELECT} WHERE ${whereClause} ORDER BY any DESC, curs DESC LIMIT ${limit}`;
    const response = await fetch(`${SOCRATA_RESOURCE_URL}?$query=${encodeURIComponent(query)}`);
    const raw = await response.text();
    let rows: any = null;
    try {
      rows = JSON.parse(raw);
    } catch {
      if (raw.trim().startsWith("<!DOCTYPE") || raw.trim().startsWith("<html")) {
        throw new Error("L'API ha retornat HTML en lloc de JSON.");
      }
      throw new Error("Resposta no vàlida de l'API (no JSON).");
    }

    if (!response.ok) {
      const message = Array.isArray(rows) ? "Error consultat l'API de dades obertes." : (rows?.message || "Error consultat l'API de dades obertes.");
      throw new Error(message);
    }

    if (!Array.isArray(rows)) return [];
    return rows as SocrataRow[];
  }

  function rowToFitxaData(code: string, row: SocrataRow | null): any {
    if (!row) {
      return {
        status: "not_found",
        requested_code: code,
        source_url: SOCRATA_SOURCE_URL,
        message: "No s'ha trobat cap centre amb aquest codi.",
        fields: {},
      };
    }

    const webValue = normalizeWebUrl(row.url);
    const x = asText(row.coordenades_utm_x);
    const y = asText(row.coordenades_utm_y);
    const fields = rowToOrderedFields(row);
    if (webValue) fields["URL pàgina web centre"] = webValue;
    if (x && y) fields.Coordenades = `${x} X | ${y} Y`;

    return {
      status: "ok",
      requested_code: code,
      source_url: SOCRATA_SOURCE_URL,
      centre: {
        code: asText(row.codi_centre || code).trim(),
        name: asText(row.denominaci_completa).trim() || "-",
      },
      coordinates: {
        x,
        y,
      },
      fields,
    };
  }

  function byId<T extends HTMLElement>(id: string): T {
    return document.getElementById(id) as T;
  }

  function escapeHtml(value: unknown): string {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function utmToLatLon(zone: number, easting: number, northing: number, isNorthernHemisphere: boolean) {
    const a = 6378137.0;
    const f = 1 / 298.257223563;
    const k0 = 0.9996;
    const eccSquared = f * (2 - f);
    const eccPrimeSquared = eccSquared / (1 - eccSquared);
    const e1 = (1 - Math.sqrt(1 - eccSquared)) / (1 + Math.sqrt(1 - eccSquared));

    const x = easting - 500000.0;
    let y = northing;
    if (!isNorthernHemisphere) y -= 10000000.0;

    const longOrigin = (zone - 1) * 6 - 180 + 3;
    const m = y / k0;
    const mu = m / (a * (1 - eccSquared / 4 - (3 * eccSquared * eccSquared) / 64 - (5 * eccSquared * eccSquared * eccSquared) / 256));

    const phi1Rad =
      mu +
      ((3 * e1) / 2 - (27 * Math.pow(e1, 3)) / 32) * Math.sin(2 * mu) +
      ((21 * e1 * e1) / 16 - (55 * Math.pow(e1, 4)) / 32) * Math.sin(4 * mu) +
      ((151 * Math.pow(e1, 3)) / 96) * Math.sin(6 * mu) +
      ((1097 * Math.pow(e1, 4)) / 512) * Math.sin(8 * mu);

    const n1 = a / Math.sqrt(1 - eccSquared * Math.sin(phi1Rad) * Math.sin(phi1Rad));
    const t1 = Math.tan(phi1Rad) * Math.tan(phi1Rad);
    const c1 = eccPrimeSquared * Math.cos(phi1Rad) * Math.cos(phi1Rad);
    const r1 = (a * (1 - eccSquared)) / Math.pow(1 - eccSquared * Math.sin(phi1Rad) * Math.sin(phi1Rad), 1.5);
    const d = x / (n1 * k0);

    const latRad =
      phi1Rad -
      ((n1 * Math.tan(phi1Rad)) / r1) *
        ((d * d) / 2 -
          ((5 + 3 * t1 + 10 * c1 - 4 * c1 * c1 - 9 * eccPrimeSquared) * Math.pow(d, 4)) / 24 +
          ((61 + 90 * t1 + 298 * c1 + 45 * t1 * t1 - 252 * eccPrimeSquared - 3 * c1 * c1) * Math.pow(d, 6)) / 720);

    const lonRad =
      (d -
        ((1 + 2 * t1 + c1) * Math.pow(d, 3)) / 6 +
        ((5 - 2 * c1 + 28 * t1 - 3 * c1 * c1 + 8 * eccPrimeSquared + 24 * t1 * t1) * Math.pow(d, 5)) / 120) /
      Math.cos(phi1Rad);

    return {
      lat: (latRad * 180) / Math.PI,
      lon: longOrigin + (lonRad * 180) / Math.PI,
    };
  }

  win.FitxaCentre = {
    init: () => {
      const codeInput = byId<HTMLInputElement>("code");
      const loadButton = byId<HTMLButtonElement>("load");
      const messageEl = byId<HTMLDivElement>("message");
      const metaEl = byId<HTMLDivElement>("meta");
      const resultTable = byId<HTMLTableElement>("resultTable");
      const resultBody = byId<HTMLTableSectionElement>("resultBody");
      const mapModalBackdrop = byId<HTMLDivElement>("mapModalBackdrop");
      const closeMapModalButton = byId<HTMLButtonElement>("closeMapModal");
      const mapFrame = byId<HTMLIFrameElement>("mapFrame");
      const openMapLink = byId<HTMLAnchorElement>("openMapLink");
      const mapCoordsLabel = byId<HTMLSpanElement>("mapCoordsLabel");

      const setMessage = (text: string, isError = false): void => {
        messageEl.textContent = text;
        messageEl.classList.toggle("error", isError);
      };

      const buildCellValue = (label: string, value: string): string => {
        const safeValue = value || "";
        const isEmailField = /correu/i.test(label) && /@/.test(safeValue);
        const isWebField = /url|web/i.test(label);
        const webUrl = isWebField ? normalizeWebUrl(safeValue) : "";
        const escaped = escapeHtml(safeValue);
        if (isEmailField) {
          return `<div class="value-with-copy"><span>${escaped}</span><button class="copy-btn" data-copy="${escaped}" type="button">Copiar</button></div>`;
        }
        if (webUrl) {
          const normalizedUrl = /^https?:\/\//i.test(webUrl) ? webUrl : `http://${webUrl}`;
          const safeOpenUrl = escapeHtml(normalizedUrl);
          return `<div class="coord-with-map"><span>${escaped}</span><button class="web-btn" data-open-url="${safeOpenUrl}" type="button">Web</button></div>`;
        }
        return escaped;
      };

      const row = (label: string, value: string): string => `<tr><th>${escapeHtml(label)}</th><td>${buildCellValue(label, value)}</td></tr>`;

      const buildCodeRow = (codeValue: string, sourceUrl: string): string => {
        const codeSafe = escapeHtml(codeValue || "");
        const urlSafe = escapeHtml(sourceUrl || "");
        const webButton = sourceUrl
          ? `<button class="web-btn" type="button" data-source-url="${urlSafe}">Web</button>`
          : "";
        return `<tr><th>Codi centre</th><td><div class="coord-with-map"><span>${codeSafe}</span>${webButton}</div></td></tr>`;
      };

      const buildCoordinateRow = (coordText: string, xValue: string, yValue: string): string => {
        const coordSafe = escapeHtml(coordText || "");
        const xSafe = escapeHtml(xValue || "");
        const ySafe = escapeHtml(yValue || "");
        return `<tr><th>Coordenades</th><td><div class="coord-with-map"><span>${coordSafe}</span><button class="map-btn" type="button" data-map-x="${xSafe}" data-map-y="${ySafe}">Veure mapa</button></div></td></tr>`;
      };

      const closeMapModal = (): void => {
        mapModalBackdrop.classList.add("hidden");
        mapFrame.src = "";
      };

      const openMapModal = (xValue: string, yValue: string): void => {
        const x = Number(xValue);
        const y = Number(yValue);
        if (!Number.isFinite(x) || !Number.isFinite(y)) {
          setMessage("Les coordenades no son valides.", true);
          return;
        }

        const converted = utmToLatLon(31, x, y, true);
        const lat = converted.lat;
        const lon = converted.lon;
        const bbox = `${lon - 0.01}%2C${lat - 0.01}%2C${lon + 0.01}%2C${lat + 0.01}`;
        const marker = `${lat}%2C${lon}`;

        mapFrame.src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${marker}`;
        openMapLink.href = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=16/${lat}/${lon}`;
        mapCoordsLabel.textContent = `X: ${xValue} | Y: ${yValue} | Lat: ${lat.toFixed(6)} | Lon: ${lon.toFixed(6)}`;
        mapModalBackdrop.classList.remove("hidden");
      };

      win.MapesMapModal = {
        openByUtm: (xValue: string, yValue: string) => openMapModal(xValue, yValue),
        close: () => closeMapModal(),
      };

      const renderData = (data: any): void => {
        const fields = data.fields || {};
        const rows: string[] = [];

        rows.push(buildCodeRow((data.centre && data.centre.code) || data.requested_code || "", data.source_url || ""));
        rows.push(row("Nom centre", (data.centre && data.centre.name) || ""));

        if (data.coordinates && data.coordinates.x && data.coordinates.y) {
          const coordText = fields.Coordenades || `${data.coordinates.x} X | ${data.coordinates.y} Y`;
          rows.push(buildCoordinateRow(coordText, data.coordinates.x, data.coordinates.y));
        }

        Object.entries(fields).forEach(([label, value]) => {
          if (label === "Coordenades") return;
          const displayValue = Array.isArray(value) ? value.join(" | ") : String(value ?? "");
          rows.push(row(label, displayValue));
        });

        resultBody.innerHTML = rows.join("");
        resultTable.classList.remove("hidden");
        metaEl.classList.remove("hidden");
        metaEl.textContent = `Font: ${data.source_url || "-"} | Estat: ${data.status}`;
      };

      const fetchFitxaFromSocrata = async (code: string): Promise<any> => {
        const whereClause = `codi_centre = '${escapeSoql(code)}'`;
        const rows = await fetchSocrataRows(whereClause, 5);
        return rowToFitxaData(code, pickBestRow(rows));
      };

      const loadCentre = async (): Promise<void> => {
        const code = codeInput.value.trim();
        setMessage("Carregant dades...");
        resultTable.classList.add("hidden");
        metaEl.classList.add("hidden");

        if (!/^\d{8}$/.test(code)) {
          setMessage("El codi ha de tenir 8 digits.", true);
          return;
        }

        loadButton.disabled = true;
        try {
          if (!apiBase) {
            const data = await fetchFitxaFromSocrata(code);
            if (data.status !== "ok") {
              setMessage(data.message || "No s'ha pogut carregar el centre.", true);
              return;
            }
            renderData(data);
            setMessage("Dades carregades correctament.");
            return;
          }

          const response = await fetch(apiUrl(`api/centre/${code}`));
          const raw = await response.text();
          let data: any = null;
          try {
            data = JSON.parse(raw);
          } catch {
            setMessage(buildNoJsonMessage(), true);
            return;
          }
          if (!response.ok) {
            setMessage(data.message || "No s'ha pogut carregar el centre.", true);
            return;
          }
          renderData(data);
          setMessage("Dades carregades correctament.");
        } catch (error: any) {
          setMessage(`Error de connexio: ${error.message}`, true);
        } finally {
          loadButton.disabled = false;
        }
      };

      loadButton.addEventListener("click", loadCentre);
      closeMapModalButton.addEventListener("click", closeMapModal);

      mapModalBackdrop.addEventListener("click", (event: MouseEvent) => {
        if (event.target === mapModalBackdrop) closeMapModal();
      });

      document.addEventListener("keydown", (event: KeyboardEvent) => {
        if (event.key === "Escape" && !mapModalBackdrop.classList.contains("hidden")) closeMapModal();
      });

      resultBody.addEventListener("click", async (event: Event) => {
        const target = event.target as HTMLElement;
        const copyButton = target.closest(".copy-btn") as HTMLButtonElement | null;
        if (copyButton) {
          const text = copyButton.dataset.copy || "";
          if (!text) return;
          try {
            await navigator.clipboard.writeText(text);
            setMessage("Correu copiat al porta-retalls.");
          } catch {
            setMessage("No s'ha pogut copiar el correu.", true);
          }
          return;
        }

        const mapButton = target.closest(".map-btn") as HTMLButtonElement | null;
        if (mapButton) {
          openMapModal(mapButton.dataset.mapX || "", mapButton.dataset.mapY || "");
          return;
        }

        const webButton = target.closest(".web-btn") as HTMLButtonElement | null;
        if (!webButton) return;
        const openUrl = webButton.dataset.openUrl || webButton.dataset.sourceUrl || "";
        if (!openUrl) return;
        window.open(openUrl, "_blank", "noopener,noreferrer");
      });

      codeInput.addEventListener("keydown", (event: KeyboardEvent) => {
        if (event.key === "Enter") loadCentre();
      });

      codeInput.value = "08019472";
    },
  };
})();
