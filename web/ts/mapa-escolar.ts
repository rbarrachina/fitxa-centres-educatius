(() => {
  type MapaApi = { init: () => void };
  type MapModalApi = { openByUtm: (xValue: string, yValue: string) => void; close: () => void };

  type SocrataRow = {
    any?: string;
    curs?: string;
    codi_centre?: string;
    denominaci_completa?: string;
    nom_municipi?: string;
    e_mail_centre?: string;
    tel_fon?: string;
    url?: string;
    coordenades_utm_x?: string;
    coordenades_utm_y?: string;
    nom_delegaci?: string;
    nom_naturalesa?: string;
  };

  type MapesWindow = Window & {
    MapaEscolar?: MapaApi;
    MapesMapModal?: MapModalApi;
    MAPES_API_BASE?: string;
  };

  const win = window as MapesWindow;
  const apiBase = String(win.MAPES_API_BASE || "").trim().replace(/\/+$/, "");

  const SOCRATA_RESOURCE_URL = "https://analisi.transparenciacatalunya.cat/resource/kvmv-ahh4.json";
  const SOCRATA_SOURCE_URL = "https://analisi.transparenciacatalunya.cat/d/kvmv-ahh4";
  const SOCRATA_SELECT = [
    "any",
    "curs",
    "codi_centre",
    "denominaci_completa",
    "nom_municipi",
    "e_mail_centre",
    "tel_fon",
    "url",
    "coordenades_utm_x",
    "coordenades_utm_y",
    "nom_delegaci",
    "nom_naturalesa",
  ].join(", ");
  let currentCoursePromise: Promise<string> | null = null;
  let currentCourseRowsPromise: Promise<SocrataRow[]> | null = null;

  function apiUrl(path: string): string {
    const normalizedPath = path.replace(/^\/+/, "");
    return apiBase ? `${apiBase}/${normalizedPath}` : normalizedPath;
  }

  function escapeSoql(value: string): string {
    return String(value || "").replaceAll("'", "''");
  }

  function normalizeText(value: string): string {
    return String(value || "")
      .normalize("NFD")
      .replaceAll(/[\u0300-\u036f]/g, "")
      .replaceAll(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function normalizeWebUrl(value: unknown): string {
    const raw = String(value || "").trim();
    if (!raw || raw === "0" || raw === "-") return "";
    return raw;
  }

  function buildNoJsonMessage(): string {
    return "La resposta del servidor no és JSON vàlid.";
  }

  function toInt(value: unknown): number {
    const n = Number(String(value || "").trim());
    return Number.isFinite(n) ? n : 0;
  }

  async function fetchSocrataRows(query: string): Promise<SocrataRow[]> {
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

  async function getCurrentCourse(): Promise<string> {
    if (currentCoursePromise) return currentCoursePromise;
    currentCoursePromise = (async () => {
      const query = "SELECT max(curs) as current_curs WHERE curs is not null";
      const response = await fetch(`${SOCRATA_RESOURCE_URL}?$query=${encodeURIComponent(query)}`);
      const raw = await response.text();
      let rows: any = null;
      try {
        rows = JSON.parse(raw);
      } catch {
        throw new Error("No s'ha pogut determinar el curs actual (resposta no JSON).");
      }
      if (!response.ok || !Array.isArray(rows) || !rows.length) {
        throw new Error("No s'ha pogut determinar el curs actual.");
      }
      const current = String(rows[0]?.current_curs || "").trim();
      if (!current) {
        throw new Error("No s'ha pogut determinar el curs actual.");
      }
      return current;
    })();
    return currentCoursePromise;
  }

  async function getCurrentCourseRows(): Promise<SocrataRow[]> {
    if (currentCourseRowsPromise) return currentCourseRowsPromise;
    const currentCourse = await getCurrentCourse();
    const query = `SELECT ${SOCRATA_SELECT} WHERE curs = '${escapeSoql(currentCourse)}' ORDER BY denominaci_completa ASC, any DESC, curs DESC LIMIT 10000`;
    currentCourseRowsPromise = fetchSocrataRows(query);
    return currentCourseRowsPromise;
  }

  function dedupeByCode(rows: SocrataRow[]): SocrataRow[] {
    const byCode = new Map<string, SocrataRow>();
    rows.forEach((row) => {
      const code = String(row.codi_centre || "").trim();
      if (!code) return;

      const current = byCode.get(code);
      if (!current) {
        byCode.set(code, row);
        return;
      }

      const currentRank = [toInt(current.any), toInt(current.curs)];
      const newRank = [toInt(row.any), toInt(row.curs)];
      if (newRank[0] > currentRank[0] || (newRank[0] === currentRank[0] && newRank[1] >= currentRank[1])) {
        byCode.set(code, { ...current, ...row });
      } else {
        byCode.set(code, { ...row, ...current });
      }
    });

    return Array.from(byCode.values());
  }

  function sortMatches(rows: SocrataRow[], query: string): SocrataRow[] {
    const needle = normalizeText(query);
    return [...rows].sort((a, b) => {
      const aName = normalizeText(String(a.denominaci_completa || ""));
      const bName = normalizeText(String(b.denominaci_completa || ""));

      const score = (name: string): number => {
        if (name === needle) return 3;
        if (name.startsWith(needle)) return 2;
        if (name.includes(needle)) return 1;
        return 0;
      };

      const sa = score(aName);
      const sb = score(bName);
      if (sb !== sa) return sb - sa;

      const am = normalizeText(String(a.nom_municipi || ""));
      const bm = normalizeText(String(b.nom_municipi || ""));
      const byName = aName.localeCompare(bName, "ca");
      if (byName !== 0) return byName;
      return am.localeCompare(bm, "ca");
    });
  }

  function rowToResponse(row: SocrataRow | null, matches: SocrataRow[] = []): any {
    if (!row) {
      return {
        status: "not_found",
        code: null,
        matched_name: null,
        matched_municipi: null,
        details: {},
        total_matches: 0,
        matches: [],
        source_url: SOCRATA_SOURCE_URL,
      };
    }

    const webValue = normalizeWebUrl(row.url);
    return {
      status: "ok",
      code: String(row.codi_centre || "").trim(),
      matched_name: String(row.denominaci_completa || "").trim() || null,
      matched_municipi: String(row.nom_municipi || "").trim() || null,
      details: {
        mail: String(row.e_mail_centre || "").trim() || null,
        phone: String(row.tel_fon || "").trim() || null,
        web: webValue || null,
        coord_x: String(row.coordenades_utm_x || "").trim() || null,
        coord_y: String(row.coordenades_utm_y || "").trim() || null,
        territorial_area_st: String(row.nom_delegaci || "").trim() || null,
        naturalesa: String(row.nom_naturalesa || "").trim() || null,
      },
      total_matches: matches.length || 1,
      matches: (matches.length ? matches : [row]).map((item) => ({
        code: String(item.codi_centre || "").trim(),
        name: String(item.denominaci_completa || "").trim(),
        municipi: String(item.nom_municipi || "").trim(),
      })),
      source_url: SOCRATA_SOURCE_URL,
    };
  }

  async function fetchByCodeFromSocrata(code: string): Promise<any> {
    const currentCourse = await getCurrentCourse();
    const query = `SELECT ${SOCRATA_SELECT} WHERE curs = '${escapeSoql(currentCourse)}' AND codi_centre = '${escapeSoql(code)}' ORDER BY any DESC, curs DESC LIMIT 5`;
    const rows = dedupeByCode(await fetchSocrataRows(query));
    return rowToResponse(rows[0] || null, rows);
  }

  async function searchByNameFromSocrata(name: string): Promise<any> {
    const allRows = dedupeByCode(await getCurrentCourseRows());
    const needle = normalizeText(name);
    const filtered = allRows.filter((row) => normalizeText(String(row.denominaci_completa || "")).includes(needle));
    const rows = sortMatches(filtered, name);
    return rowToResponse(rows[0] || null, rows);
  }

  function byId<T extends HTMLElement>(id: string): T {
    return document.getElementById(id) as T;
  }

  function escapeHtml(value: unknown): string {
    return String(value || "")
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

    return { lat: (latRad * 180) / Math.PI, lon: longOrigin + (lonRad * 180) / Math.PI };
  }

  win.MapaEscolar = {
    init: () => {
      const section = byId<HTMLElement>("sectionMapa");
      const input = byId<HTMLInputElement>("mapaCentreName");
      const button = byId<HTMLButtonElement>("mapaSearchBtn");
      const message = byId<HTMLDivElement>("mapaMessage");
      const result = byId<HTMLDivElement>("mapaResult");
      const resultTitle = byId<HTMLDivElement>("mapaResultTitle");
      const selectedBlock = byId<HTMLDivElement>("mapaSelectedBlock");
      const code = byId<HTMLDivElement>("mapaCode");
      const matchedName = byId<HTMLDivElement>("mapaMatchedName");
      const centreMeta = byId<HTMLDivElement>("mapaCentreMeta");
      const mail = byId<HTMLSpanElement>("mapaMail");
      const phone = byId<HTMLSpanElement>("mapaPhone");
      const web = byId<HTMLSpanElement>("mapaWeb");
      const territorialArea = byId<HTMLSpanElement>("mapaTerritorialArea");
      const naturalesa = byId<HTMLSpanElement>("mapaNaturalesa");
      const coords = byId<HTMLSpanElement>("mapaCoords");
      const coordsMapLink = byId<HTMLButtonElement>("mapaCoordsMapLink");
      const moreMatchesWrap = byId<HTMLDivElement>("mapaMoreMatchesWrap");
      const moreMatches = byId<HTMLDivElement>("mapaMoreMatches");

      let currentMatches: Array<{ code: string; name: string; municipi?: string }> = [];

      if (!section || !input || !button) return;

      const setMessage = (text: string, isError = false): void => {
        message.textContent = text || "";
        message.classList.toggle("error", Boolean(isError));
      };

      const clearResult = (): void => {
        result.classList.add("hidden");
        resultTitle.textContent = "Codi trobat";
        resultTitle.classList.remove("hidden");
        selectedBlock.classList.remove("hidden");
        code.textContent = "";
        matchedName.textContent = "";
        centreMeta.textContent = "";
        mail.textContent = "-";
        phone.textContent = "-";
        web.textContent = "-";
        territorialArea.textContent = "-";
        naturalesa.textContent = "-";
        coords.textContent = "-";
        coordsMapLink.classList.add("hidden");
        delete coordsMapLink.dataset.coordX;
        delete coordsMapLink.dataset.coordY;
        moreMatchesWrap.classList.add("hidden");
        moreMatches.innerHTML = "";
        currentMatches = [];
      };

      const renderMatchesList = (selectedCode: string): void => {
        if (!currentMatches.length) {
          moreMatchesWrap.classList.add("hidden");
          moreMatches.innerHTML = "";
          return;
        }

        moreMatchesWrap.classList.remove("hidden");
        moreMatches.innerHTML = currentMatches
          .map((item) => {
            const c = item.code || "-";
            const n = item.name || "";
            const m = item.municipi || "";
            const isSelected = Boolean(selectedCode && c === selectedCode);
            return (
              '<div class="match-row">' +
                `<span><span class="match-name">${escapeHtml(n)}</span>${m ? ` <span class="match-town">(${escapeHtml(m)})</span>` : ""}</span>` +
                `<button class="match-view-btn" type="button" data-code="${escapeHtml(c)}"${isSelected ? " disabled" : ""}>${isSelected ? "Seleccionat" : "Veure"}</button>` +
              "</div>"
            );
          })
          .join("");
      };

      const renderChooserOnly = (): void => {
        result.classList.remove("hidden");
        resultTitle.textContent = "Tria un centre";
        resultTitle.classList.remove("hidden");
        selectedBlock.classList.add("hidden");
        renderMatchesList("");
      };

      const renderSelectedResult = (data: any): void => {
        const selectedCode = data.code || "";
        const selectedMunicipi = data.matched_municipi || "";
        const selectedName = data.matched_name || "";

        result.classList.remove("hidden");
        resultTitle.textContent = "";
        resultTitle.classList.add("hidden");
        selectedBlock.classList.remove("hidden");
        code.textContent = data.code || "-";
        matchedName.textContent = selectedName
          ? `${selectedName}${selectedMunicipi ? ` (${selectedMunicipi})` : ""}`
          : "-";
        centreMeta.textContent = "";

        const details = data.details || {};
        if (details.mail) {
          mail.innerHTML = `<a href="mailto:${escapeHtml(details.mail)}">${escapeHtml(details.mail)}</a>`;
        } else {
          mail.textContent = "-";
        }

        phone.textContent = details.phone || "-";

        if (details.web) {
          const url = /^https?:\/\//i.test(details.web) ? details.web : `http://${details.web}`;
          web.innerHTML = `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(details.web)}</a>`;
        } else {
          web.textContent = "-";
        }

        territorialArea.textContent = details.territorial_area_st || "-";
        naturalesa.textContent = details.naturalesa || "-";

        const x = Number(details.coord_x);
        const y = Number(details.coord_y);
        if (Number.isFinite(x) && Number.isFinite(y)) {
          coords.textContent = `${details.coord_x} X | ${details.coord_y} Y`;
          coordsMapLink.dataset.coordX = String(details.coord_x);
          coordsMapLink.dataset.coordY = String(details.coord_y);
          coordsMapLink.classList.remove("hidden");
        } else {
          coords.textContent = "-";
          coordsMapLink.classList.add("hidden");
          delete coordsMapLink.dataset.coordX;
          delete coordsMapLink.dataset.coordY;
        }

        renderMatchesList(selectedCode);
      };

      const searchCentre = async (): Promise<void> => {
        const query = (input.value || "").trim();
        clearResult();

        if (!query) {
          setMessage("Has d'indicar el nom o codi del centre.", true);
          return;
        }

        const isCodeSearch = /^\d{8}$/.test(query);
        setMessage(isCodeSearch ? "Cercant centre per codi..." : "Cercant centre per nom...");
        button.disabled = true;

        try {
          if (!apiBase) {
            const data = isCodeSearch
              ? await fetchByCodeFromSocrata(query)
              : await searchByNameFromSocrata(query);

            if (data.status !== "ok") {
              setMessage(
                isCodeSearch ? "No s'ha trobat cap centre amb aquest codi." : "No s'ha trobat cap centre amb aquest nom.",
                true,
              );
              return;
            }

            currentMatches = data.matches || (data.code ? [{ code: data.code, name: data.matched_name, municipi: data.matched_municipi }] : []);

            if (!isCodeSearch && data.total_matches > 1) {
              renderChooserOnly();
              setMessage(`S'han trobat ${data.total_matches} coincidencies. Tria el centre de la llista.`);
            } else {
              renderSelectedResult(data);
              setMessage("Centre trobat correctament.");
            }
            return;
          }

          const endpoint = isCodeSearch
            ? `api/mapa-escolar/detall?codi=${encodeURIComponent(query)}`
            : `api/mapa-escolar/codi?nom=${encodeURIComponent(query)}`;

          const response = await fetch(apiUrl(endpoint));
          const raw = await response.text();

          let data: any = null;
          try {
            data = JSON.parse(raw);
          } catch {
            setMessage(buildNoJsonMessage(), true);
            return;
          }

          if (!response.ok) {
            setMessage(
              data.message || (isCodeSearch ? "No s'ha trobat cap centre amb aquest codi." : "No s'ha trobat cap centre amb aquest nom."),
              true,
            );
            return;
          }

          currentMatches = data.matches || (data.code ? [{ code: data.code, name: data.matched_name, municipi: data.matched_municipi }] : []);

          if (!isCodeSearch && data.total_matches > 1) {
            renderChooserOnly();
            setMessage(`S'han trobat ${data.total_matches} coincidencies. Tria el centre de la llista.`);
          } else {
            renderSelectedResult(data);
            setMessage("Centre trobat correctament.");
          }
        } catch (error: any) {
          setMessage(`Error de connexio: ${error.message}`, true);
        } finally {
          button.disabled = false;
        }
      };

      button.addEventListener("click", searchCentre);

      moreMatches.addEventListener("click", async (event: Event) => {
        const target = event.target as HTMLElement;
        const viewButton = target.closest(".match-view-btn") as HTMLButtonElement | null;
        if (!viewButton) return;

        const selectedCode = (viewButton.dataset.code || "").trim();
        if (!selectedCode) return;

        setMessage("Carregant centre seleccionat...");
        button.disabled = true;

        try {
          if (!apiBase) {
            const data = await fetchByCodeFromSocrata(selectedCode);
            if (data.status !== "ok") {
              setMessage("No s'ha pogut carregar el centre seleccionat.", true);
              return;
            }
            renderSelectedResult(data);
            setMessage("Centre seleccionat correctament.");
            return;
          }

          const response = await fetch(apiUrl(`api/mapa-escolar/detall?codi=${encodeURIComponent(selectedCode)}`));
          const raw = await response.text();
          let data: any = null;
          try {
            data = JSON.parse(raw);
          } catch {
            setMessage(buildNoJsonMessage(), true);
            return;
          }
          if (!response.ok) {
            setMessage(data.message || "No s'ha pogut carregar el centre seleccionat.", true);
            return;
          }
          renderSelectedResult(data);
          setMessage("Centre seleccionat correctament.");
        } catch (error: any) {
          setMessage(`Error de connexio: ${error.message}`, true);
        } finally {
          button.disabled = false;
        }
      });

      coordsMapLink.addEventListener("click", () => {
        const x = coordsMapLink.dataset.coordX || "";
        const y = coordsMapLink.dataset.coordY || "";
        if (!x || !y) return;

        if (win.MapesMapModal && typeof win.MapesMapModal.openByUtm === "function") {
          win.MapesMapModal.openByUtm(x, y);
          return;
        }

        const converted = utmToLatLon(31, Number(x), Number(y), true);
        const url = `https://www.openstreetmap.org/?mlat=${converted.lat}&mlon=${converted.lon}#map=16/${converted.lat}/${converted.lon}`;
        window.open(url, "_blank", "noopener,noreferrer");
      });

      input.addEventListener("keydown", (event: KeyboardEvent) => {
        if (event.key === "Enter") searchCentre();
      });

      input.value = "Àuria";
      section.dataset.ready = "true";
    },
  };
})();
