(() => {
    const apiBase = String(window.MAPES_API_BASE || "")
        .trim()
        .replace(/\/+$/, "");
    const SOCRATA_RESOURCE_URL = "https://analisi.transparenciacatalunya.cat/resource/kvmv-ahh4.json";
    const SOCRATA_SOURCE_URL = "https://analisi.transparenciacatalunya.cat/d/kvmv-ahh4";
    let currentCoursePromise = null;
    let currentCourseRowsPromise = null;
    const KEY_LABELS = {
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
    function apiUrl(path) {
        const normalizedPath = path.replace(/^\/+/, "");
        return apiBase ? `${apiBase}/${normalizedPath}` : normalizedPath;
    }
    function escapeSoql(value) {
        return String(value || "").replaceAll("'", "''");
    }
    function normalizeWebUrl(value) {
        const raw = String(value || "").trim();
        if (!raw || raw === "0" || raw === "-")
            return "";
        return raw;
    }
    function normalizePhoneNumber(value) {
        const raw = String(value || "").trim();
        if (!raw || raw === "-" || raw === "0")
            return "";
        const compact = raw.replaceAll(/\s+/g, "");
        const sanitized = compact.replaceAll(/[^\d+]/g, "");
        if (!sanitized)
            return "";
        const plusCount = (sanitized.match(/\+/g) || []).length;
        if (plusCount > 1)
            return "";
        if (plusCount === 1 && !sanitized.startsWith("+"))
            return "";
        const digitsOnly = sanitized.replaceAll("+", "");
        if (digitsOnly.length < 6)
            return "";
        return sanitized;
    }
    function normalizeText(value) {
        return String(value || "")
            .normalize("NFD")
            .replaceAll(/[\u0300-\u036f]/g, "")
            .replaceAll(/\s+/g, " ")
            .trim()
            .toLowerCase();
    }
    function asText(value) {
        if (value === null || value === undefined)
            return "";
        if (typeof value === "string")
            return value.trim();
        if (typeof value === "number" || typeof value === "boolean")
            return String(value);
        try {
            return JSON.stringify(value);
        }
        catch {
            return String(value);
        }
    }
    function toInt(value) {
        const parsed = Number(asText(value));
        return Number.isFinite(parsed) ? parsed : 0;
    }
    function prettifyKey(key) {
        if (KEY_LABELS[key])
            return KEY_LABELS[key];
        return key
            .replaceAll("_", " ")
            .replace(/\b\w/g, (m) => m.toUpperCase());
    }
    function pickBestRow(rows) {
        if (!rows.length)
            return null;
        const sorted = [...rows].sort((a, b) => {
            const yearDiff = toInt(b.any) - toInt(a.any);
            if (yearDiff !== 0)
                return yearDiff;
            const cursDiff = toInt(b.curs) - toInt(a.curs);
            if (cursDiff !== 0)
                return cursDiff;
            const aScore = Object.values(a).filter((v) => asText(v)).length;
            const bScore = Object.values(b).filter((v) => asText(v)).length;
            return bScore - aScore;
        });
        return sorted[0];
    }
    function dedupeByCode(rows) {
        const byCode = new Map();
        rows.forEach((row) => {
            const code = asText(row.codi_centre);
            if (!code)
                return;
            const current = byCode.get(code);
            if (!current) {
                byCode.set(code, row);
                return;
            }
            const currentRank = [toInt(current.any), toInt(current.curs)];
            const newRank = [toInt(row.any), toInt(row.curs)];
            if (newRank[0] > currentRank[0] || (newRank[0] === currentRank[0] && newRank[1] >= currentRank[1])) {
                byCode.set(code, { ...current, ...row });
            }
            else {
                byCode.set(code, { ...row, ...current });
            }
        });
        return Array.from(byCode.values());
    }
    function sortRowsByNameRelevance(rows, query) {
        const needle = normalizeText(query);
        const ranked = [...rows].sort((a, b) => {
            const aName = normalizeText(asText(a.denominaci_completa));
            const bName = normalizeText(asText(b.denominaci_completa));
            const score = (name) => {
                if (name === needle)
                    return 3;
                if (name.startsWith(needle))
                    return 2;
                if (name.includes(needle))
                    return 1;
                return 0;
            };
            const sa = score(aName);
            const sb = score(bName);
            if (sb !== sa)
                return sb - sa;
            const am = normalizeText(asText(a.nom_municipi));
            const bm = normalizeText(asText(b.nom_municipi));
            const byName = aName.localeCompare(bName, "ca");
            if (byName !== 0)
                return byName;
            return am.localeCompare(bm, "ca");
        });
        return ranked;
    }
    function rowToOrderedFields(row) {
        const fields = {};
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
    async function fetchSocrataRows(whereClause, limit) {
        const currentCourse = await getCurrentCourse();
        const query = `SELECT * WHERE curs = '${escapeSoql(currentCourse)}' AND (${whereClause}) ORDER BY any DESC, curs DESC LIMIT ${limit}`;
        const response = await fetch(`${SOCRATA_RESOURCE_URL}?$query=${encodeURIComponent(query)}`);
        const raw = await response.text();
        let rows = null;
        try {
            rows = JSON.parse(raw);
        }
        catch {
            if (raw.trim().startsWith("<!DOCTYPE") || raw.trim().startsWith("<html")) {
                throw new Error("L'API ha retornat HTML en lloc de JSON.");
            }
            throw new Error("Resposta no vàlida de l'API (no JSON).");
        }
        if (!response.ok) {
            const message = Array.isArray(rows) ? "Error consultat l'API de dades obertes." : (rows?.message || "Error consultat l'API de dades obertes.");
            throw new Error(message);
        }
        if (!Array.isArray(rows))
            return [];
        return rows;
    }
    async function getCurrentCourseRows() {
        if (currentCourseRowsPromise)
            return currentCourseRowsPromise;
        currentCourseRowsPromise = fetchSocrataRows("1=1", 10000);
        return currentCourseRowsPromise;
    }
    async function getCurrentCourse() {
        if (currentCoursePromise)
            return currentCoursePromise;
        currentCoursePromise = (async () => {
            const query = "SELECT max(curs) as current_curs WHERE curs is not null";
            const response = await fetch(`${SOCRATA_RESOURCE_URL}?$query=${encodeURIComponent(query)}`);
            const raw = await response.text();
            let rows = null;
            try {
                rows = JSON.parse(raw);
            }
            catch {
                throw new Error("No s'ha pogut determinar el curs actual (resposta no JSON).");
            }
            if (!response.ok || !Array.isArray(rows) || !rows.length) {
                throw new Error("No s'ha pogut determinar el curs actual.");
            }
            const current = asText(rows[0]?.current_curs);
            if (!current) {
                throw new Error("No s'ha pogut determinar el curs actual.");
            }
            return current;
        })();
        return currentCoursePromise;
    }
    function rowToFitxaData(code, row) {
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
        if (webValue)
            fields["URL pàgina web centre"] = webValue;
        if (x && y)
            fields.Coordenades = `${x} X | ${y} Y`;
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
    function byId(id) {
        return document.getElementById(id);
    }
    function escapeHtml(value) {
        return String(value)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#39;");
    }
    function utmToLatLon(zone, easting, northing, isNorthernHemisphere) {
        const a = 6378137.0;
        const f = 1 / 298.257223563;
        const k0 = 0.9996;
        const eccSquared = f * (2 - f);
        const eccPrimeSquared = eccSquared / (1 - eccSquared);
        const e1 = (1 - Math.sqrt(1 - eccSquared)) / (1 + Math.sqrt(1 - eccSquared));
        const x = easting - 500000.0;
        let y = northing;
        if (!isNorthernHemisphere)
            y -= 10000000.0;
        const longOrigin = (zone - 1) * 6 - 180 + 3;
        const m = y / k0;
        const mu = m / (a * (1 - eccSquared / 4 - (3 * eccSquared * eccSquared) / 64 - (5 * eccSquared * eccSquared * eccSquared) / 256));
        const phi1Rad = mu +
            ((3 * e1) / 2 - (27 * Math.pow(e1, 3)) / 32) * Math.sin(2 * mu) +
            ((21 * e1 * e1) / 16 - (55 * Math.pow(e1, 4)) / 32) * Math.sin(4 * mu) +
            ((151 * Math.pow(e1, 3)) / 96) * Math.sin(6 * mu) +
            ((1097 * Math.pow(e1, 4)) / 512) * Math.sin(8 * mu);
        const n1 = a / Math.sqrt(1 - eccSquared * Math.sin(phi1Rad) * Math.sin(phi1Rad));
        const t1 = Math.tan(phi1Rad) * Math.tan(phi1Rad);
        const c1 = eccPrimeSquared * Math.cos(phi1Rad) * Math.cos(phi1Rad);
        const r1 = (a * (1 - eccSquared)) / Math.pow(1 - eccSquared * Math.sin(phi1Rad) * Math.sin(phi1Rad), 1.5);
        const d = x / (n1 * k0);
        const latRad = phi1Rad -
            ((n1 * Math.tan(phi1Rad)) / r1) *
                ((d * d) / 2 -
                    ((5 + 3 * t1 + 10 * c1 - 4 * c1 * c1 - 9 * eccPrimeSquared) * Math.pow(d, 4)) / 24 +
                    ((61 + 90 * t1 + 298 * c1 + 45 * t1 * t1 - 252 * eccPrimeSquared - 3 * c1 * c1) * Math.pow(d, 6)) / 720);
        const lonRad = (d -
            ((1 + 2 * t1 + c1) * Math.pow(d, 3)) / 6 +
            ((5 - 2 * c1 + 28 * t1 - 3 * c1 * c1 + 8 * eccPrimeSquared + 24 * t1 * t1) * Math.pow(d, 5)) / 120) /
            Math.cos(phi1Rad);
        return {
            lat: (latRad * 180) / Math.PI,
            lon: longOrigin + (lonRad * 180) / Math.PI,
        };
    }
    const init = () => {
        const codeInput = byId("code");
        const loadButton = byId("load");
        const messageEl = byId("message");
        const fitxaMatchesWrap = byId("fitxaMatchesWrap");
        const fitxaMatches = byId("fitxaMatches");
        const metaEl = byId("meta");
        const resultTable = byId("resultTable");
        const resultBody = byId("resultBody");
        const mapModalBackdrop = byId("mapModalBackdrop");
        const closeMapModalButton = byId("closeMapModal");
        const mapFrame = byId("mapFrame");
        const openMapLink = byId("openMapLink");
        const mapCoordsLabel = byId("mapCoordsLabel");
        const setMessage = (text, isError = false) => {
            messageEl.textContent = text;
            messageEl.classList.toggle("error", isError);
        };
        const buildCellValue = (label, value) => {
            const safeValue = value || "";
            const isEmailField = /correu/i.test(label) && /@/.test(safeValue);
            const isPhoneField = /telef|tel[eè]fon/i.test(label);
            const isWebField = /url|web/i.test(label);
            const phoneNumber = isPhoneField ? normalizePhoneNumber(safeValue) : "";
            const webUrl = isWebField ? normalizeWebUrl(safeValue) : "";
            const escaped = escapeHtml(safeValue);
            if (isEmailField) {
                return `<div class="value-with-copy"><span>${escaped}</span><button class="copy-btn" data-copy="${escaped}" type="button">Copiar</button></div>`;
            }
            if (phoneNumber) {
                const safePhone = escapeHtml(phoneNumber);
                return `<div class="coord-with-map"><span>${escaped}</span><button class="call-btn" data-call-number="${safePhone}" type="button">Trucar</button><button class="phone-copy-btn" data-copy-phone="${safePhone}" type="button">Copiar</button></div>`;
            }
            if (webUrl) {
                const normalizedUrl = /^https?:\/\//i.test(webUrl) ? webUrl : `http://${webUrl}`;
                const safeOpenUrl = escapeHtml(normalizedUrl);
                return `<div class="coord-with-map"><span>${escaped}</span><button class="web-btn" data-open-url="${safeOpenUrl}" type="button">Web</button></div>`;
            }
            return escaped;
        };
        const row = (label, value) => `<tr><th>${escapeHtml(label)}</th><td>${buildCellValue(label, value)}</td></tr>`;
        const buildCodeRow = (codeValue) => {
            const codeSafe = escapeHtml(codeValue || "");
            return `<tr><th>Codi centre</th><td>${codeSafe}</td></tr>`;
        };
        const buildCoordinateRow = (coordText, xValue, yValue) => {
            const coordSafe = escapeHtml(coordText || "");
            const xSafe = escapeHtml(xValue || "");
            const ySafe = escapeHtml(yValue || "");
            return `<tr><th>Coordenades</th><td><div class="coord-with-map"><span>${coordSafe}</span><button class="map-btn" type="button" data-map-x="${xSafe}" data-map-y="${ySafe}">Veure mapa</button></div></td></tr>`;
        };
        const closeMapModal = () => {
            mapModalBackdrop.classList.add("hidden");
            mapFrame.src = "";
        };
        const openMapModal = (xValue, yValue) => {
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
        const renderData = (data) => {
            const fields = { ...(data.fields || {}) };
            const rows = [];
            const pullFieldByLabel = (labels) => {
                for (const label of labels) {
                    if (!(label in fields))
                        continue;
                    const value = fields[label];
                    delete fields[label];
                    if (Array.isArray(value)) {
                        return value.map((v) => String(v ?? "")).join(" | ");
                    }
                    return String(value ?? "");
                }
                return "";
            };
            const emailValue = pullFieldByLabel([
                "Correu electrònic del centre",
                "Correu electrònic departamental",
                "Correu electronic del centre",
            ]);
            const webValue = pullFieldByLabel([
                "URL pàgina web centre",
                "URL pagina web centre",
                "Web",
                "URL",
            ]);
            rows.push(buildCodeRow((data.centre && data.centre.code) || data.requested_code || ""));
            rows.push(row("Nom centre", (data.centre && data.centre.name) || ""));
            rows.push(row("Correu electrònic del centre", emailValue || "-"));
            rows.push(row("URL pàgina web centre", webValue || "-"));
            if (data.coordinates && data.coordinates.x && data.coordinates.y) {
                const coordText = fields.Coordenades || `${data.coordinates.x} X | ${data.coordinates.y} Y`;
                rows.push(buildCoordinateRow(coordText, data.coordinates.x, data.coordinates.y));
            }
            Object.entries(fields).forEach(([label, value]) => {
                if (label === "Coordenades")
                    return;
                const displayValue = Array.isArray(value) ? value.join(" | ") : String(value ?? "");
                rows.push(row(label, displayValue));
            });
            resultBody.innerHTML = rows.join("");
            resultTable.classList.remove("hidden");
            metaEl.classList.remove("hidden");
            metaEl.textContent = `Font: ${data.source_url || "-"} | Estat: ${data.status}`;
        };
        const hideMatchChooser = () => {
            fitxaMatchesWrap.classList.add("hidden");
            fitxaMatches.innerHTML = "";
        };
        const renderMatchChooser = (rows) => {
            fitxaMatchesWrap.classList.remove("hidden");
            fitxaMatches.innerHTML = rows
                .map((row) => {
                const code = escapeHtml(asText(row.codi_centre) || "-");
                const name = escapeHtml(asText(row.denominaci_completa) || "-");
                const town = escapeHtml(asText(row.nom_municipi) || "-");
                return ('<div class="match-row">' +
                    `<span><span class="match-name">${code} - ${name}</span> <span class="match-town">(${town})</span></span>` +
                    `<button class="match-view-btn fitxa-pick-btn" type="button" data-code="${code}">Tria</button>` +
                    "</div>");
            })
                .join("");
        };
        const fetchFitxaFromSocrata = async (code) => {
            const whereClause = `codi_centre = '${escapeSoql(code)}'`;
            const rows = await fetchSocrataRows(whereClause, 5);
            return rowToFitxaData(code, pickBestRow(rows));
        };
        const searchFitxaByNameFromSocrata = async (name) => {
            const allRows = dedupeByCode(await getCurrentCourseRows());
            const needle = normalizeText(name);
            const filtered = allRows.filter((row) => normalizeText(asText(row.denominaci_completa)).includes(needle));
            return sortRowsByNameRelevance(filtered, name);
        };
        const loadCentre = async () => {
            const query = codeInput.value.trim();
            setMessage("Carregant dades...");
            hideMatchChooser();
            resultTable.classList.add("hidden");
            metaEl.classList.add("hidden");
            if (!query) {
                setMessage("Has d'indicar el codi o nom del centre.", true);
                return;
            }
            const isCodeSearch = /^\d{8}$/.test(query);
            loadButton.disabled = true;
            try {
                if (!isCodeSearch && apiBase) {
                    setMessage("Amb backend extern, la fitxa per nom no està activada. Introdueix un codi de centre.", true);
                    return;
                }
                if (!apiBase) {
                    if (isCodeSearch) {
                        const data = await fetchFitxaFromSocrata(query);
                        if (data.status !== "ok") {
                            setMessage(data.message || "No s'ha pogut carregar el centre.", true);
                            return;
                        }
                        renderData(data);
                        setMessage("Dades carregades correctament.");
                        return;
                    }
                    const matches = await searchFitxaByNameFromSocrata(query);
                    if (!matches.length) {
                        setMessage("No s'ha trobat cap centre amb aquest nom.", true);
                        return;
                    }
                    if (matches.length === 1) {
                        const selected = matches[0];
                        const code = asText(selected.codi_centre);
                        const data = rowToFitxaData(code, selected);
                        renderData(data);
                        setMessage("Dades carregades correctament.");
                        return;
                    }
                    renderMatchChooser(matches);
                    setMessage(`S'han trobat ${matches.length} centres. Tria'n un.`);
                    return;
                }
                const response = await fetch(apiUrl(`api/centre/${query}`));
                const raw = await response.text();
                let data = null;
                try {
                    data = JSON.parse(raw);
                }
                catch {
                    setMessage("La resposta del servidor no és JSON vàlid.", true);
                    return;
                }
                if (!response.ok) {
                    setMessage(data.message || "No s'ha pogut carregar el centre.", true);
                    return;
                }
                renderData(data);
                setMessage("Dades carregades correctament.");
            }
            catch (error) {
                setMessage(`Error de connexio: ${error.message}`, true);
            }
            finally {
                loadButton.disabled = false;
            }
        };
        loadButton.addEventListener("click", loadCentre);
        closeMapModalButton.addEventListener("click", closeMapModal);
        mapModalBackdrop.addEventListener("click", (event) => {
            if (event.target === mapModalBackdrop)
                closeMapModal();
        });
        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape" && !mapModalBackdrop.classList.contains("hidden"))
                closeMapModal();
        });
        resultBody.addEventListener("click", async (event) => {
            const target = event.target;
            const copyButton = target.closest(".copy-btn");
            if (copyButton) {
                const text = copyButton.dataset.copy || "";
                if (!text)
                    return;
                try {
                    await navigator.clipboard.writeText(text);
                    setMessage("Correu copiat al porta-retalls.");
                }
                catch {
                    setMessage("No s'ha pogut copiar el correu.", true);
                }
                return;
            }
            const mapButton = target.closest(".map-btn");
            if (mapButton) {
                openMapModal(mapButton.dataset.mapX || "", mapButton.dataset.mapY || "");
                return;
            }
            const phoneCopyButton = target.closest(".phone-copy-btn");
            if (phoneCopyButton) {
                const phoneNumber = phoneCopyButton.dataset.copyPhone || "";
                if (!phoneNumber)
                    return;
                try {
                    await navigator.clipboard.writeText(phoneNumber);
                    setMessage("Telefon copiat al porta-retalls.");
                }
                catch {
                    setMessage("No s'ha pogut copiar el telefon.", true);
                }
                return;
            }
            const callButton = target.closest(".call-btn");
            if (callButton) {
                const phoneNumber = callButton.dataset.callNumber || "";
                if (!phoneNumber)
                    return;
                window.location.href = `tel:${phoneNumber}`;
                return;
            }
            const webButton = target.closest(".web-btn");
            if (!webButton)
                return;
            const openUrl = webButton.dataset.openUrl || "";
            if (!openUrl)
                return;
            window.open(openUrl, "_blank", "noopener,noreferrer");
        });
        fitxaMatches.addEventListener("click", async (event) => {
            const target = event.target;
            const pickButton = target.closest(".fitxa-pick-btn");
            if (!pickButton)
                return;
            const selectedCode = asText(pickButton.dataset.code);
            if (!selectedCode)
                return;
            setMessage("Carregant centre seleccionat...");
            hideMatchChooser();
            resultTable.classList.add("hidden");
            metaEl.classList.add("hidden");
            loadButton.disabled = true;
            try {
                const data = await fetchFitxaFromSocrata(selectedCode);
                if (data.status !== "ok") {
                    setMessage("No s'ha pogut carregar el centre seleccionat.", true);
                    return;
                }
                renderData(data);
                setMessage("Centre seleccionat correctament.");
            }
            catch (error) {
                setMessage(`Error de connexio: ${error.message}`, true);
            }
            finally {
                loadButton.disabled = false;
            }
        });
        codeInput.addEventListener("keydown", (event) => {
            if (event.key === "Enter")
                loadCentre();
        });
        codeInput.value = "";
    };
    document.addEventListener("DOMContentLoaded", () => {
        init();
    });
})();
