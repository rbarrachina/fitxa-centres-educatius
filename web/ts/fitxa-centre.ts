(() => {
  type MapModalApi = {
    openByUtm: (xValue: string, yValue: string) => void;
    close: () => void;
  };

  type FitxaApi = {
    init: () => void;
  };

  type MapesWindow = Window & {
    FitxaCentre?: FitxaApi;
    MapesMapModal?: MapModalApi;
    MAPES_API_BASE?: string;
    StaticCentres?: {
      byCode: (code: string) => Promise<any | null>;
      sourceUrl: () => Promise<string>;
    };
  };

  const win = window as MapesWindow;
  const apiBase = String(win.MAPES_API_BASE || "").trim().replace(/\/+$/, "");

  function apiUrl(path: string): string {
    const normalizedPath = path.replace(/^\/+/, "");
    return apiBase ? `${apiBase}/${normalizedPath}` : normalizedPath;
  }

  function buildNoJsonMessage(): string {
    const isGithubPages = window.location.hostname.endsWith("github.io");
    if (isGithubPages && !apiBase) {
      return "A GitHub Pages falta backend. Defineix window.MAPES_API_BASE amb l'URL del backend (Render/Railway).";
    }
    return "El servidor ha retornat HTML en lloc de JSON.";
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
        if (!isEmailField) return escapeHtml(safeValue);
        const escaped = escapeHtml(safeValue);
        return `<div class="value-with-copy"><span>${escaped}</span><button class="copy-btn" data-copy="${escaped}" type="button">Copiar</button></div>`;
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

      const buildStaticFitxaResult = async (code: string): Promise<any> => {
        if (!win.StaticCentres) {
          return {
            status: "not_found",
            requested_code: code,
            message: "No s'ha trobat el mòdul de dades estàtiques.",
            fields: {},
          };
        }

        const sourceUrl = await win.StaticCentres.sourceUrl();
        const centre = await win.StaticCentres.byCode(code);
        if (!centre) {
          return {
            status: "not_found",
            requested_code: code,
            source_url: sourceUrl,
            message: "No s'ha trobat cap centre amb aquest codi al dataset estàtic.",
            fields: {},
          };
        }

        const fields: Record<string, string> = {
          Població: centre.municipi || "-",
          "Correu electrònic del centre": centre.mail || "-",
          "Telèfon del centre": centre.phone || "-",
          "URL pàgina web centre": centre.web || "-",
          "Àrea Territorial": centre.territorial_area_st || "-",
          Naturalesa: centre.naturalesa || "-",
          Adreça: centre.address || "-",
        };
        if (centre.coord_x && centre.coord_y) {
          fields.Coordenades = `${centre.coord_x} X | ${centre.coord_y} Y`;
        }

        return {
          status: "ok",
          requested_code: code,
          source_url: sourceUrl,
          centre: { code: centre.code || code, name: centre.name || "-" },
          coordinates: { x: centre.coord_x || "", y: centre.coord_y || "" },
          fields,
        };
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
            const data = await buildStaticFitxaResult(code);
            if (data.status !== "ok") {
              setMessage(data.message || "No s'ha pogut carregar el centre.", true);
              return;
            }
            renderData(data);
            setMessage("Dades carregades correctament (mode estàtic).");
            return;
          }

          const response = await fetch(apiUrl(`api/centre/${code}`));
          const raw = await response.text();
          let data: any = null;
          try {
            data = JSON.parse(raw);
          } catch {
            if (raw.trim().startsWith("<!DOCTYPE") || raw.trim().startsWith("<html")) {
              setMessage(buildNoJsonMessage(), true);
            } else {
              setMessage("Resposta no valida del servidor (no JSON).", true);
            }
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
        const sourceUrl = webButton.dataset.sourceUrl || "";
        if (!sourceUrl) return;
        window.open(sourceUrl, "_blank", "noopener,noreferrer");
      });

      codeInput.addEventListener("keydown", (event: KeyboardEvent) => {
        if (event.key === "Enter") loadCentre();
      });

      codeInput.value = "08019472";
    },
  };
})();
