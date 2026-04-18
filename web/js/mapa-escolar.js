(() => {
    const win = window;
    const apiBase = String(win.MAPES_API_BASE || "").trim().replace(/\/+$/, "");
    function apiUrl(path) {
        const normalizedPath = path.replace(/^\/+/, "");
        return apiBase ? `${apiBase}/${normalizedPath}` : normalizedPath;
    }
    function buildNoJsonMessage() {
        const isGithubPages = window.location.hostname.endsWith("github.io");
        if (isGithubPages && !apiBase) {
            return "A GitHub Pages falta backend. Defineix window.MAPES_API_BASE amb l'URL del backend (Render/Railway).";
        }
        return "El servidor ha retornat HTML en lloc de JSON.";
    }
    function byId(id) {
        return document.getElementById(id);
    }
    function escapeHtml(value) {
        return String(value || "")
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
        return { lat: (latRad * 180) / Math.PI, lon: longOrigin + (lonRad * 180) / Math.PI };
    }
    win.MapaEscolar = {
        init: () => {
            const section = byId("sectionMapa");
            const input = byId("mapaCentreName");
            const button = byId("mapaSearchBtn");
            const message = byId("mapaMessage");
            const result = byId("mapaResult");
            const resultTitle = byId("mapaResultTitle");
            const selectedBlock = byId("mapaSelectedBlock");
            const code = byId("mapaCode");
            const matchedName = byId("mapaMatchedName");
            const centreMeta = byId("mapaCentreMeta");
            const mail = byId("mapaMail");
            const phone = byId("mapaPhone");
            const web = byId("mapaWeb");
            const territorialArea = byId("mapaTerritorialArea");
            const naturalesa = byId("mapaNaturalesa");
            const coords = byId("mapaCoords");
            const coordsMapLink = byId("mapaCoordsMapLink");
            const moreMatchesWrap = byId("mapaMoreMatchesWrap");
            const moreMatches = byId("mapaMoreMatches");
            let currentMatches = [];
            if (!section || !input || !button)
                return;
            const setMessage = (text, isError = false) => {
                message.textContent = text || "";
                message.classList.toggle("error", Boolean(isError));
            };
            const clearResult = () => {
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
            const renderMatchesList = (selectedCode) => {
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
                    return ('<div class="match-row">' +
                        `<span><span class="match-name">${escapeHtml(n)}</span>${m ? ` <span class="match-town">(${escapeHtml(m)})</span>` : ""}</span>` +
                        `<button class="match-view-btn" type="button" data-code="${escapeHtml(c)}"${isSelected ? " disabled" : ""}>${isSelected ? "Seleccionat" : "Veure"}</button>` +
                        "</div>");
                })
                    .join("");
            };
            const renderChooserOnly = () => {
                result.classList.remove("hidden");
                resultTitle.textContent = "Tria un centre";
                resultTitle.classList.remove("hidden");
                selectedBlock.classList.add("hidden");
                renderMatchesList("");
            };
            const renderSelectedResult = (data) => {
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
                }
                else {
                    mail.textContent = "-";
                }
                phone.textContent = details.phone || "-";
                if (details.web) {
                    const url = /^https?:\/\//i.test(details.web) ? details.web : `http://${details.web}`;
                    web.innerHTML = `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(details.web)}</a>`;
                }
                else {
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
                }
                else {
                    coords.textContent = "-";
                    coordsMapLink.classList.add("hidden");
                    delete coordsMapLink.dataset.coordX;
                    delete coordsMapLink.dataset.coordY;
                }
                renderMatchesList(selectedCode);
            };
            const fromStaticCentre = (centre, matches = []) => ({
                status: centre ? "ok" : "not_found",
                code: centre?.code || "",
                matched_name: centre?.name || null,
                matched_municipi: centre?.municipi || null,
                details: {
                    mail: centre?.mail || null,
                    phone: centre?.phone || null,
                    web: centre?.web || null,
                    coord_x: centre?.coord_x || null,
                    coord_y: centre?.coord_y || null,
                    territorial_area_st: centre?.territorial_area_st || null,
                    naturalesa: centre?.naturalesa || null,
                },
                total_matches: matches.length || (centre ? 1 : 0),
                matches: matches.map((item) => ({
                    code: item.code,
                    name: item.name,
                    municipi: item.municipi,
                    address: item.address,
                })),
            });
            const searchCentre = async () => {
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
                        if (!win.StaticCentres) {
                            setMessage("No s'ha trobat el mòdul de dades estàtiques.", true);
                            return;
                        }
                        await win.StaticCentres.load();
                        if (isCodeSearch) {
                            const centre = await win.StaticCentres.byCode(query);
                            if (!centre) {
                                setMessage("No s'ha trobat cap centre amb aquest codi.", true);
                                return;
                            }
                            currentMatches = [{ code: centre.code, name: centre.name, municipi: centre.municipi }];
                            renderSelectedResult(fromStaticCentre(centre, [centre]));
                            setMessage("Centre trobat correctament (mode estàtic).");
                            return;
                        }
                        const matches = win.StaticCentres.search(query);
                        if (!matches.length) {
                            setMessage("No s'ha trobat cap centre amb aquest nom.", true);
                            return;
                        }
                        currentMatches = matches.map((item) => ({ code: item.code, name: item.name, municipi: item.municipi }));
                        if (matches.length > 1) {
                            renderChooserOnly();
                            setMessage(`S'han trobat ${matches.length} coincidencies. Tria el centre de la llista.`);
                            return;
                        }
                        renderSelectedResult(fromStaticCentre(matches[0], matches));
                        setMessage("Centre trobat correctament (mode estàtic).");
                        return;
                    }
                    const endpoint = isCodeSearch
                        ? `api/mapa-escolar/detall?codi=${encodeURIComponent(query)}`
                        : `api/mapa-escolar/codi?nom=${encodeURIComponent(query)}`;
                    const response = await fetch(apiUrl(endpoint));
                    const raw = await response.text();
                    let data = null;
                    try {
                        data = JSON.parse(raw);
                    }
                    catch {
                        if (raw.trim().startsWith("<!DOCTYPE") || raw.trim().startsWith("<html")) {
                            setMessage(buildNoJsonMessage(), true);
                        }
                        else {
                            setMessage("Resposta no valida del servidor (no JSON).", true);
                        }
                        return;
                    }
                    if (!response.ok) {
                        setMessage(data.message || (isCodeSearch ? "No s'ha trobat cap centre amb aquest codi." : "No s'ha trobat cap centre amb aquest nom."), true);
                        return;
                    }
                    currentMatches = data.matches || (data.code ? [{ code: data.code, name: data.matched_name, municipi: data.matched_municipi }] : []);
                    if (!isCodeSearch && data.total_matches > 1) {
                        renderChooserOnly();
                        setMessage(`S'han trobat ${data.total_matches} coincidencies. Tria el centre de la llista.`);
                    }
                    else {
                        renderSelectedResult(data);
                        setMessage("Centre trobat correctament.");
                    }
                }
                catch (error) {
                    setMessage(`Error de connexio: ${error.message}`, true);
                }
                finally {
                    button.disabled = false;
                }
            };
            button.addEventListener("click", searchCentre);
            moreMatches.addEventListener("click", async (event) => {
                const target = event.target;
                const viewButton = target.closest(".match-view-btn");
                if (!viewButton)
                    return;
                const selectedCode = (viewButton.dataset.code || "").trim();
                if (!selectedCode)
                    return;
                setMessage("Carregant centre seleccionat...");
                button.disabled = true;
                try {
                    if (!apiBase) {
                        if (!win.StaticCentres) {
                            setMessage("No s'ha trobat el mòdul de dades estàtiques.", true);
                            return;
                        }
                        const centre = await win.StaticCentres.byCode(selectedCode);
                        if (!centre) {
                            setMessage("No s'ha pogut carregar el centre seleccionat.", true);
                            return;
                        }
                        renderSelectedResult(fromStaticCentre(centre, currentMatches));
                        setMessage("Centre seleccionat correctament (mode estàtic).");
                        return;
                    }
                    const response = await fetch(apiUrl(`api/mapa-escolar/detall?codi=${encodeURIComponent(selectedCode)}`));
                    const raw = await response.text();
                    let data = null;
                    try {
                        data = JSON.parse(raw);
                    }
                    catch {
                        if (raw.trim().startsWith("<!DOCTYPE") || raw.trim().startsWith("<html")) {
                            setMessage(buildNoJsonMessage(), true);
                        }
                        else {
                            setMessage("Resposta no valida del servidor (no JSON).", true);
                        }
                        return;
                    }
                    if (!response.ok) {
                        setMessage(data.message || "No s'ha pogut carregar el centre seleccionat.", true);
                        return;
                    }
                    renderSelectedResult(data);
                    setMessage("Centre seleccionat correctament.");
                }
                catch (error) {
                    setMessage(`Error de connexio: ${error.message}`, true);
                }
                finally {
                    button.disabled = false;
                }
            });
            coordsMapLink.addEventListener("click", () => {
                const x = coordsMapLink.dataset.coordX || "";
                const y = coordsMapLink.dataset.coordY || "";
                if (!x || !y)
                    return;
                if (win.MapesMapModal && typeof win.MapesMapModal.openByUtm === "function") {
                    win.MapesMapModal.openByUtm(x, y);
                    return;
                }
                const converted = utmToLatLon(31, Number(x), Number(y), true);
                const url = `https://www.openstreetmap.org/?mlat=${converted.lat}&mlon=${converted.lon}#map=16/${converted.lat}/${converted.lon}`;
                window.open(url, "_blank", "noopener,noreferrer");
            });
            input.addEventListener("keydown", (event) => {
                if (event.key === "Enter")
                    searchCentre();
            });
            input.value = "Àuria";
            section.dataset.ready = "true";
        },
    };
})();
