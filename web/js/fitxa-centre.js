(() => {
    const win = window;
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
    win.FitxaCentre = {
        init: () => {
            const codeInput = byId("code");
            const loadButton = byId("load");
            const messageEl = byId("message");
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
                if (!isEmailField)
                    return escapeHtml(safeValue);
                const escaped = escapeHtml(safeValue);
                return `<div class="value-with-copy"><span>${escaped}</span><button class="copy-btn" data-copy="${escaped}" type="button">Copiar</button></div>`;
            };
            const row = (label, value) => `<tr><th>${escapeHtml(label)}</th><td>${buildCellValue(label, value)}</td></tr>`;
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
            win.MapesMapModal = {
                openByUtm: (xValue, yValue) => openMapModal(xValue, yValue),
                close: () => closeMapModal(),
            };
            const renderData = (data) => {
                const fields = data.fields || {};
                const rows = [];
                rows.push(row("Codi centre", (data.centre && data.centre.code) || data.requested_code || ""));
                rows.push(row("Nom centre", (data.centre && data.centre.name) || ""));
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
            const loadCentre = async () => {
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
                    const response = await fetch(`api/centre/${code}`);
                    const data = await response.json();
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
                if (!mapButton)
                    return;
                openMapModal(mapButton.dataset.mapX || "", mapButton.dataset.mapY || "");
            });
            codeInput.addEventListener("keydown", (event) => {
                if (event.key === "Enter")
                    loadCentre();
            });
            codeInput.value = "08019472";
        },
    };
})();
