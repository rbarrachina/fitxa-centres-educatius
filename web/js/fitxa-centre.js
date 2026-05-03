(() => {
    const apiBase = String(window.MAPES_API_BASE || "")
        .trim()
        .replace(/\/+$/, "");
    const SOCRATA_RESOURCE_URL = "https://analisi.transparenciacatalunya.cat/resource/kvmv-ahh4.json";
    const SOCRATA_SOURCE_URL = "https://analisi.transparenciacatalunya.cat/d/kvmv-ahh4";
    const MATRICULA_RESOURCE_URL = "https://analisi.transparenciacatalunya.cat/resource/xvme-26kg.json";
    const MATRICULA_METADATA_URL = "https://analisi.transparenciacatalunya.cat/api/views/xvme-26kg";
    const MATRICULA_SOURCE_URL = "https://analisi.transparenciacatalunya.cat/Educaci-/Alumnes-matriculats-per-ensenyament-i-unitats-dels/xvme-26kg/about_data";
    const TEACHING_STAFF_RESOURCE_URL = "https://analisi.transparenciacatalunya.cat/resource/2ip7-jdgh.json";
    const TEACHING_STAFF_SOURCE_URL = "https://analisi.transparenciacatalunya.cat/Educaci-/Personal-docent-en-centres-p-blics-titularitat-del/2ip7-jdgh/about_data";
    const TEACHING_STAFF_SPECIALTIES_RESOURCE_URL = "https://analisi.transparenciacatalunya.cat/resource/4fid-p2hv.json";
    const TEACHING_STAFF_SPECIALTIES_SOURCE_URL = "https://analisi.transparenciacatalunya.cat/Educaci-/Plantilles-del-personal-docent-dels-centres-p-blic/4fid-p2hv";
    const EDUCATIONAL_SERVICES_URL = "data/serveis-educatius.json";
    const TERRITORIAL_SERVICES_URL = "data/serveis-territorials-simplificat.geojson";
    const COMARQUES_URL = "https://geoserveis.icgc.cat/vector01/rest/services/rtpc_carrers/MapServer/5/query?where=1%3D1&outFields=NOM_COMAR&outSR=4326&f=geojson";
    const MUNICIPIS_URL = "https://geoserveis.icgc.cat/vector01/rest/services/rtpc_carrers/MapServer/4/query?where=1%3D1&outFields=NOM_MUNI&outSR=4326&f=geojson";
    const BARCELONA_DISTRICTS_URL = "https://opendata-ajuntament.barcelona.cat/data/dataset/20170706-districtes-barris/resource/5f8974a7-7937-4b50-acbc-89204d570df9/download";
    let currentCoursePromise = null;
    let currentCourseRowsPromise = null;
    let teachingStaffCoursePromise = null;
    let teachingStaffSpecialtiesCoursePromise = null;
    let educationalServicesPromise = null;
    let barcelonaDistrictsFeaturesPromise = null;
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
    const STUDY_KEYS = [
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
    function normalizePlaceName(value) {
        const normalized = normalizeText(value)
            .replaceAll(/[’']/g, " ")
            .replaceAll(/[.,;:()/-]/g, " ")
            .replaceAll(/\s+/g, " ")
            .trim();
        const trailingArticle = normalized.match(/^(.+?)\s*,?\s+(l|el|la|els|les)$/);
        const articleMoved = trailingArticle ? `${trailingArticle[2]} ${trailingArticle[1]}` : normalized;
        return articleMoved
            .replace(/^(l|el|la|els|les)\s+/, "")
            .replaceAll(/\s+/g, " ")
            .trim();
    }
    function normalizeDistrictName(value) {
        return normalizePlaceName(value)
            .replace(/^districte\s+(de\s+|del\s+|de la\s+|d\s+)?/, "")
            .replaceAll(/\s+/g, " ")
            .trim();
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
    function formatNumber(value) {
        const parsed = Number(asText(value));
        if (!Number.isFinite(parsed))
            return "-";
        return parsed.toLocaleString("ca-ES");
    }
    function hasPossibleMissingDecimal(value) {
        const parsed = Number(asText(value));
        return Number.isInteger(parsed) && Math.abs(parsed) % 10 === 5;
    }
    function isExactFive(value) {
        return Number(asText(value)) === 5;
    }
    function formatPossibleMissingDecimal(value) {
        const raw = asText(value).trim();
        const parsed = Number(raw);
        if (!Number.isFinite(parsed))
            return "";
        if (parsed === 625)
            return (parsed / 1000).toLocaleString("ca-ES", { maximumFractionDigits: 3 });
        return (parsed / 10).toLocaleString("ca-ES", { maximumFractionDigits: 2 });
    }
    function formatDateFromUnix(value) {
        const seconds = Number(value);
        if (!Number.isFinite(seconds) || seconds <= 0)
            return "";
        try {
            return new Intl.DateTimeFormat("ca-ES", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
            }).format(new Date(seconds * 1000));
        }
        catch {
            return "";
        }
    }
    function isCurrentDateInsideSchoolCourse(course, today = new Date()) {
        const match = String(course || "").match(/^(\d{4})\s*\/\s*(\d{4})$/);
        if (!match)
            return true;
        const startYear = Number(match[1]);
        const endYear = Number(match[2]);
        if (!Number.isFinite(startYear) || !Number.isFinite(endYear))
            return true;
        const currentDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
        const courseStart = new Date(startYear, 8, 1).getTime();
        const courseEnd = new Date(endYear, 7, 31).getTime();
        return currentDay >= courseStart && currentDay <= courseEnd;
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
    async function fetchEnrollmentDatasetInfo() {
        const response = await fetch(MATRICULA_METADATA_URL);
        const raw = await response.text();
        let metadata = null;
        try {
            metadata = JSON.parse(raw);
        }
        catch {
            throw new Error("No s'ha pogut llegir la metadata de matrícula.");
        }
        if (!response.ok) {
            throw new Error(metadata?.message || "No s'ha pogut consultar la metadata de matrícula.");
        }
        const updatedAt = formatDateFromUnix(metadata?.rowsUpdatedAt || metadata?.viewLastModified || metadata?.publicationDate);
        return {
            updatedAt: updatedAt || "-",
            sourceUrl: MATRICULA_SOURCE_URL,
        };
    }
    async function getEnrollmentCourse() {
        const query = "SELECT max(curs) as current_curs WHERE curs is not null";
        const response = await fetch(`${MATRICULA_RESOURCE_URL}?$query=${encodeURIComponent(query)}`);
        const raw = await response.text();
        let rows = null;
        try {
            rows = JSON.parse(raw);
        }
        catch {
            throw new Error("No s'ha pogut determinar l'últim curs de matrícula.");
        }
        if (!response.ok || !Array.isArray(rows) || !rows.length) {
            throw new Error("No s'ha pogut determinar l'últim curs de matrícula.");
        }
        const current = asText(rows[0]?.current_curs);
        if (!current) {
            throw new Error("No s'ha pogut determinar l'últim curs de matrícula.");
        }
        return current;
    }
    function getEnrollmentSortRank(row) {
        const code = normalizeText(`${asText(row.codi_estudis)} ${asText(row.codi_ensenyament)}`);
        const name = normalizeText(`${asText(row.nom_ensenyament)} ${asText(row.nom_estudis)}`);
        if (code.includes("einf") || name.includes("infantil"))
            return 0;
        if (code.includes("epri") || name.includes("primaria"))
            return 1;
        if (code.includes("eso") || name.includes("secundaria"))
            return 2;
        if (code.includes("batx") || name.includes("batxillerat"))
            return 3;
        if (code.includes("cfp") ||
            code.includes("fp") ||
            code.includes("pfi") ||
            code.includes("ife") ||
            name.includes("formacio professional") ||
            name.includes("cicle formatiu") ||
            name.includes("itinerari formatiu")) {
            return 4;
        }
        return 5;
    }
    function sortEnrollmentRows(rows) {
        const teachingBaseName = (row) => normalizeText(asText(row.nom_ensenyament)).replace(/\s*-\s*nivell\s+(basic|intermedi|avancat)\s*$/, "");
        const languageLevelRank = (row) => {
            const name = normalizeText(asText(row.nom_ensenyament));
            if (name.includes("nivell basic"))
                return 0;
            if (name.includes("nivell intermedi"))
                return 1;
            if (name.includes("nivell avancat"))
                return 2;
            return 3;
        };
        return [...rows].sort((a, b) => {
            const rankDiff = getEnrollmentSortRank(a) - getEnrollmentSortRank(b);
            if (rankDiff !== 0)
                return rankDiff;
            const baseNameDiff = teachingBaseName(a).localeCompare(teachingBaseName(b), "ca");
            if (baseNameDiff !== 0)
                return baseNameDiff;
            const levelRankDiff = languageLevelRank(a) - languageLevelRank(b);
            if (levelRankDiff !== 0)
                return levelRankDiff;
            const nameDiff = asText(a.nom_ensenyament).localeCompare(asText(b.nom_ensenyament), "ca");
            if (nameDiff !== 0)
                return nameDiff;
            return toInt(a.nivell) - toInt(b.nivell);
        });
    }
    async function fetchEnrollmentRows(code) {
        const [course, datasetInfo] = await Promise.all([getEnrollmentCourse(), fetchEnrollmentDatasetInfo()]);
        const query = "SELECT codi_estudis, codi_ensenyament, nom_ensenyament, nivell, sum(matr_cules_total) as matricules_total, sum(unitats) as grups " +
            `WHERE curs = '${escapeSoql(course)}' AND codi_centre = '${escapeSoql(code)}' AND matr_cules_total is not null ` +
            "GROUP BY codi_estudis, codi_ensenyament, nom_ensenyament, nivell LIMIT 5000";
        const response = await fetch(`${MATRICULA_RESOURCE_URL}?$query=${encodeURIComponent(query)}`);
        const raw = await response.text();
        let rows = null;
        try {
            rows = JSON.parse(raw);
        }
        catch {
            throw new Error("No s'ha pogut llegir la matrícula del centre.");
        }
        if (!response.ok) {
            throw new Error(rows?.message || "No s'ha pogut consultar la matrícula del centre.");
        }
        return {
            course,
            updatedAt: datasetInfo.updatedAt,
            rows: Array.isArray(rows) ? sortEnrollmentRows(rows) : [],
            sourceUrl: datasetInfo.sourceUrl,
        };
    }
    async function getTeachingStaffCourse() {
        if (teachingStaffCoursePromise)
            return teachingStaffCoursePromise;
        teachingStaffCoursePromise = (async () => {
            const query = "SELECT max(curs) as current_curs WHERE curs is not null";
            const response = await fetch(`${TEACHING_STAFF_RESOURCE_URL}?$query=${encodeURIComponent(query)}`);
            const raw = await response.text();
            let rows = null;
            try {
                rows = JSON.parse(raw);
            }
            catch {
                throw new Error("No s'ha pogut determinar l'últim curs de personal docent.");
            }
            if (!response.ok || !Array.isArray(rows) || !rows.length) {
                throw new Error("No s'ha pogut determinar l'últim curs de personal docent.");
            }
            const current = asText(rows[0]?.current_curs);
            if (!current) {
                throw new Error("No s'ha pogut determinar l'últim curs de personal docent.");
            }
            return current;
        })();
        return teachingStaffCoursePromise;
    }
    async function fetchTeachingStaffTotal(code) {
        try {
            const course = await getTeachingStaffCourse();
            const query = `SELECT total WHERE curs = '${escapeSoql(course)}' AND codi_centre = '${escapeSoql(code)}' LIMIT 1`;
            const response = await fetch(`${TEACHING_STAFF_RESOURCE_URL}?$query=${encodeURIComponent(query)}`);
            const raw = await response.text();
            let rows = null;
            try {
                rows = JSON.parse(raw);
            }
            catch {
                return "Sense dades";
            }
            if (!response.ok || !Array.isArray(rows) || !rows.length)
                return "Sense dades";
            const total = Number(asText(rows[0]?.total));
            if (!Number.isFinite(total))
                return "Sense dades";
            return `${total.toLocaleString("ca-ES")} docents`;
        }
        catch {
            return "Sense dades";
        }
    }
    async function getTeachingStaffSpecialtiesCourse() {
        if (teachingStaffSpecialtiesCoursePromise)
            return teachingStaffSpecialtiesCoursePromise;
        teachingStaffSpecialtiesCoursePromise = (async () => {
            const query = "SELECT max(curs) as current_curs WHERE curs is not null";
            const response = await fetch(`${TEACHING_STAFF_SPECIALTIES_RESOURCE_URL}?$query=${encodeURIComponent(query)}`);
            const raw = await response.text();
            let rows = null;
            try {
                rows = JSON.parse(raw);
            }
            catch {
                throw new Error("No s'ha pogut determinar l'últim curs de plantilles docents.");
            }
            if (!response.ok || !Array.isArray(rows) || !rows.length) {
                throw new Error("No s'ha pogut determinar l'últim curs de plantilles docents.");
            }
            const current = asText(rows[0]?.current_curs);
            if (!current) {
                throw new Error("No s'ha pogut determinar l'últim curs de plantilles docents.");
            }
            return current;
        })();
        return teachingStaffSpecialtiesCoursePromise;
    }
    async function fetchTeachingStaffSpecialties(code) {
        const course = await getTeachingStaffSpecialtiesCourse();
        const query = "SELECT codi_lloc_desc, total_dot, ocu_def " +
            `WHERE curs = '${escapeSoql(course)}' AND codi_centre = '${escapeSoql(code)}' ` +
            "ORDER BY codi_lloc_desc LIMIT 5000";
        const response = await fetch(`${TEACHING_STAFF_SPECIALTIES_RESOURCE_URL}?$query=${encodeURIComponent(query)}`);
        const raw = await response.text();
        let rows = null;
        try {
            rows = JSON.parse(raw);
        }
        catch {
            throw new Error("No s'han pogut llegir les especialitats del personal docent.");
        }
        if (!response.ok) {
            throw new Error(rows?.message || "No s'han pogut consultar les especialitats del personal docent.");
        }
        return {
            course,
            rows: Array.isArray(rows) ? rows : [],
            sourceUrl: TEACHING_STAFF_SPECIALTIES_SOURCE_URL,
        };
    }
    async function fetchEducationalServices() {
        if (educationalServicesPromise)
            return educationalServicesPromise;
        educationalServicesPromise = (async () => {
            const response = await fetch(EDUCATIONAL_SERVICES_URL);
            if (!response.ok)
                throw new Error("No s'ha pogut carregar la relació de serveis educatius.");
            const payload = await response.json();
            return Array.isArray(payload?.services) ? payload.services : [];
        })();
        return educationalServicesPromise;
    }
    function serviceMatchesMunicipality(service, municipality) {
        const target = normalizePlaceName(municipality);
        if (!target)
            return false;
        return (service.municipalities || []).some((item) => normalizePlaceName(item) === target);
    }
    function serviceMatchesDistrict(service, district) {
        const target = normalizeDistrictName(district);
        if (!target)
            return false;
        return normalizeDistrictName(service.district) === target;
    }
    async function resolveEducationalService(row) {
        const municipality = asText(row.nom_municipi);
        if (!municipality)
            return null;
        const services = await fetchEducationalServices();
        const municipalityMatches = services.filter((service) => serviceMatchesMunicipality(service, municipality));
        if (!municipalityMatches.length)
            return null;
        if (municipalityMatches.length === 1)
            return municipalityMatches[0];
        const district = asText(row.nom_dm);
        if (district) {
            const districtMatch = municipalityMatches.find((service) => serviceMatchesDistrict(service, district));
            if (districtMatch)
                return districtMatch;
        }
        return null;
    }
    async function attachEducationalService(data, row) {
        if (!row || data.status !== "ok")
            return data;
        try {
            data.educational_service = await resolveEducationalService(row);
        }
        catch {
            data.educational_service = null;
        }
        return data;
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
    function parseUtmCoordinatePair(pair) {
        const [xValue, yValue] = pair.trim().split(/\s+/).map(Number);
        if (!Number.isFinite(xValue) || !Number.isFinite(yValue))
            return null;
        const converted = utmToLatLon(31, xValue, yValue, true);
        return [converted.lon, converted.lat];
    }
    function parseWktPolygonRings(value) {
        const body = value.trim().replace(/^POLYGON\s*\(\(/i, "").replace(/\)\)\s*$/i, "");
        if (!body)
            return [];
        return body.split(/\)\s*,\s*\(/).map((ring) => ring
            .split(",")
            .map(parseUtmCoordinatePair)
            .filter((point) => Boolean(point)));
    }
    function wktToGeoJsonGeometry(value) {
        const trimmed = value.trim();
        if (/^POLYGON\s*\(\(/i.test(trimmed)) {
            return {
                type: "Polygon",
                coordinates: parseWktPolygonRings(trimmed),
            };
        }
        if (/^MULTIPOLYGON\s*\(\(\(/i.test(trimmed)) {
            const body = trimmed.replace(/^MULTIPOLYGON\s*\(\(\(/i, "").replace(/\)\)\)\s*$/i, "");
            return {
                type: "MultiPolygon",
                coordinates: body.split(/\)\)\s*,\s*\(\(/).map(parseWktPolygonRings),
            };
        }
        return null;
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
        const infoButton = byId("infoButton");
        const infoModalBackdrop = byId("infoModalBackdrop");
        const closeInfoModalButton = byId("closeInfoModal");
        const mapModalBackdrop = byId("mapModalBackdrop");
        const closeMapModalButton = byId("closeMapModal");
        const mapLeafletContainer = byId("mapLeaflet");
        const openMapLink = byId("openMapLink");
        const mapCoordsLabel = byId("mapCoordsLabel");
        const territorialMapModalBackdrop = byId("territorialMapModalBackdrop");
        const closeTerritorialMapModalButton = byId("closeTerritorialMapModal");
        const territorialNameLabel = byId("territorialNameLabel");
        const territorialMapContainer = byId("territorialMap");
        const comarcaMapModalBackdrop = byId("comarcaMapModalBackdrop");
        const closeComarcaMapModalButton = byId("closeComarcaMapModal");
        const comarcaNameLabel = byId("comarcaNameLabel");
        const comarcaMapContainer = byId("comarcaMap");
        const municipiMapModalBackdrop = byId("municipiMapModalBackdrop");
        const closeMunicipiMapModalButton = byId("closeMunicipiMapModal");
        const municipiNameLabel = byId("municipiNameLabel");
        const municipiMapContainer = byId("municipiMap");
        const educationalServiceMapModalBackdrop = byId("educationalServiceMapModalBackdrop");
        const closeEducationalServiceMapModalButton = byId("closeEducationalServiceMapModal");
        const educationalServiceNameLabel = byId("educationalServiceNameLabel");
        const educationalServiceMapContainer = byId("educationalServiceMap");
        const codesModalBackdrop = byId("codesModalBackdrop");
        const closeCodesModalButton = byId("closeCodesModal");
        const codesModalBody = byId("codesModalBody");
        const enrollmentModalBackdrop = byId("enrollmentModalBackdrop");
        const closeEnrollmentModalButton = byId("closeEnrollmentModal");
        const enrollmentDescription = byId("enrollmentDescription");
        const enrollmentModalBody = byId("enrollmentModalBody");
        const teachingStaffSpecialtiesModalBackdrop = byId("teachingStaffSpecialtiesModalBackdrop");
        const closeTeachingStaffSpecialtiesModalButton = byId("closeTeachingStaffSpecialtiesModal");
        const teachingStaffSpecialtiesDescription = byId("teachingStaffSpecialtiesDescription");
        const teachingStaffSpecialtiesModalBody = byId("teachingStaffSpecialtiesModalBody");
        const staffDataWarningModalBackdrop = byId("staffDataWarningModalBackdrop");
        const closeStaffDataWarningModalButton = byId("closeStaffDataWarningModal");
        const staffDataWarningText = byId("staffDataWarningText");
        let centreMap = null;
        let centreMapLayer = null;
        const territorialMapState = { map: null, layer: null, centreLayer: null };
        const comarcaMapState = { map: null, layer: null, centreLayer: null };
        const municipiMapState = { map: null, layer: null, centreLayer: null };
        const educationalServiceMapState = { map: null, layer: null, centreLayer: null };
        let territorialFeaturesPromise = null;
        let comarquesFeaturesPromise = null;
        let municipisFeaturesPromise = null;
        let currentCentreForTerritorial = null;
        let currentMunicipalityForMap = "";
        let currentDistrictForMap = "";
        let currentEducationalServiceForMap = null;
        let currentCentreCode = "";
        const setMessage = (text, isError = false) => {
            messageEl.textContent = text;
            messageEl.classList.toggle("error", isError);
        };
        const buildCellValue = (label, value) => {
            const safeValue = value || "";
            const isEmailField = /correu/i.test(label) && /@/.test(safeValue);
            const isPhoneField = /telef|tel[eè]fon/i.test(label);
            const isWebField = /url|web/i.test(label);
            const isAddressField = normalizeText(label) === "adreca";
            const isTerritorialField = normalizeText(label) === "area territorial";
            const isComarcaField = normalizeText(label) === "comarca";
            const isMunicipiField = normalizeText(label) === "municipi";
            const phoneNumber = isPhoneField ? normalizePhoneNumber(safeValue) : "";
            const webUrl = isWebField ? normalizeWebUrl(safeValue) : "";
            const escaped = escapeHtml(safeValue);
            if (isEmailField) {
                return `<div class="coord-with-map"><span>${escaped}</span><button class="copy-btn" data-copy="${escaped}" data-copy-message="Correu copiat al porta-retalls." type="button">Copiar</button></div>`;
            }
            if (phoneNumber) {
                const safePhone = escapeHtml(phoneNumber);
                return `<div class="coord-with-map"><span>${escaped}</span><button class="phone-copy-btn" data-copy-phone="${safePhone}" type="button">Copiar</button><a class="call-btn" href="tel:${safePhone}">Trucar</a></div>`;
            }
            if (webUrl) {
                const normalizedUrl = /^https?:\/\//i.test(webUrl) ? webUrl : `http://${webUrl}`;
                const safeOpenUrl = escapeHtml(normalizedUrl);
                return `<div class="coord-with-map"><span>${escaped}</span><button class="copy-btn copy-btn-light" data-copy="${escaped}" data-copy-message="URL copiada al porta-retalls." type="button">Copiar</button><button class="web-btn" data-open-url="${safeOpenUrl}" type="button">Web</button></div>`;
            }
            if (isAddressField) {
                const mapX = escapeHtml(currentCentreForTerritorial?.x || "");
                const mapY = escapeHtml(currentCentreForTerritorial?.y || "");
                const mapName = encodeURIComponent(String(currentCentreForTerritorial?.name || "").trim());
                if (mapX && mapY) {
                    return `<div class="coord-with-map"><span>${escaped}</span><button class="map-btn" type="button" data-map-x="${mapX}" data-map-y="${mapY}" data-map-name="${mapName}">Veure mapa</button></div>`;
                }
            }
            if (isTerritorialField && safeValue && safeValue !== "-") {
                const centreName = escapeHtml(currentCentreForTerritorial?.name || "");
                const centreX = escapeHtml(currentCentreForTerritorial?.x || "");
                const centreY = escapeHtml(currentCentreForTerritorial?.y || "");
                return `<div class="coord-with-map"><span>${escaped}</span><button class="territorial-map-btn" data-territorial-name="${escaped}" data-centre-name="${centreName}" data-centre-x="${centreX}" data-centre-y="${centreY}" type="button">Veure mapa</button></div>`;
            }
            if (isComarcaField && safeValue && safeValue !== "-") {
                const centreName = escapeHtml(currentCentreForTerritorial?.name || "");
                const centreX = escapeHtml(currentCentreForTerritorial?.x || "");
                const centreY = escapeHtml(currentCentreForTerritorial?.y || "");
                return `<div class="coord-with-map"><span>${escaped}</span><button class="comarca-map-btn" data-comarca-name="${escaped}" data-centre-name="${centreName}" data-centre-x="${centreX}" data-centre-y="${centreY}" type="button">Veure mapa</button></div>`;
            }
            if (isMunicipiField && safeValue && safeValue !== "-") {
                const centreName = escapeHtml(currentCentreForTerritorial?.name || "");
                const centreX = escapeHtml(currentCentreForTerritorial?.x || "");
                const centreY = escapeHtml(currentCentreForTerritorial?.y || "");
                const municipalityName = escapeHtml((currentMunicipalityForMap || safeValue).replace(/\s*\(.*\)\s*$/, ""));
                return `<div class="coord-with-map"><span>${escaped}</span><button class="municipi-map-btn" data-municipi-name="${municipalityName}" data-centre-name="${centreName}" data-centre-x="${centreX}" data-centre-y="${centreY}" type="button">Veure mapa</button></div>`;
            }
            return escaped;
        };
        const row = (label, value) => `<tr><th>${escapeHtml(label)}</th><td>${buildCellValue(label, value)}</td></tr>`;
        const buildCodeRow = (codeValue) => {
            const codeSafe = escapeHtml(codeValue || "");
            return `<tr><th>Codi centre</th><td>${codeSafe}</td></tr>`;
        };
        const buildCodesButtonRow = () => '<tr><th>Codis</th><td><button class="codes-btn" type="button">Veure codis</button></td></tr>';
        const buildEnrollmentButtonRow = (studiesValue) => {
            const safeStudies = escapeHtml(studiesValue || "-");
            return `<tr><th>Estudis</th><td><div class="coord-with-map"><span>${safeStudies}</span><button class="enrollment-btn" type="button">Veure matrícula</button></div></td></tr>`;
        };
        const buildTeachingStaffRow = (teachingStaffValue) => {
            const safeValue = escapeHtml(teachingStaffValue || "Sense dades");
            const button = teachingStaffValue && teachingStaffValue !== "Sense dades"
                ? '<button class="teaching-staff-specialties-btn" type="button">Veure espacialitats</button>'
                : "";
            return `<tr><th>Personal docent</th><td><div class="coord-with-map"><span>${safeValue}</span>${button}</div></td></tr>`;
        };
        const buildEducationalServiceRow = (service) => {
            const name = service?.name || "-";
            const safeName = escapeHtml(name);
            const centreName = escapeHtml(currentCentreForTerritorial?.name || "");
            const centreX = escapeHtml(currentCentreForTerritorial?.x || "");
            const centreY = escapeHtml(currentCentreForTerritorial?.y || "");
            const mapButton = service
                ? `<button class="educational-service-map-btn" data-centre-name="${centreName}" data-centre-x="${centreX}" data-centre-y="${centreY}" type="button">Veure mapa</button>`
                : "";
            const webUrl = normalizeWebUrl(service?.web || "");
            if (!webUrl) {
                return `<tr><th>Servei educatiu</th><td><div class="coord-with-map"><span>${safeName}</span>${mapButton}</div></td></tr>`;
            }
            const normalizedUrl = /^https?:\/\//i.test(webUrl) ? webUrl : `http://${webUrl}`;
            const safeOpenUrl = escapeHtml(normalizedUrl);
            return `<tr><th>Servei educatiu</th><td><div class="coord-with-map educational-service-actions"><span>${safeName}</span>${mapButton}<button class="web-btn web-se-btn" data-open-url="${safeOpenUrl}" type="button">Web SE</button></div></td></tr>`;
        };
        const closeMapModal = () => {
            mapModalBackdrop.classList.add("hidden");
        };
        const closeInfoModal = () => {
            infoModalBackdrop.classList.add("hidden");
        };
        const openInfoModal = () => {
            infoModalBackdrop.classList.remove("hidden");
        };
        const closeTerritorialMapModal = () => {
            territorialMapModalBackdrop.classList.add("hidden");
        };
        const closeComarcaMapModal = () => {
            comarcaMapModalBackdrop.classList.add("hidden");
        };
        const closeMunicipiMapModal = () => {
            municipiMapModalBackdrop.classList.add("hidden");
        };
        const closeEducationalServiceMapModal = () => {
            educationalServiceMapModalBackdrop.classList.add("hidden");
        };
        const closeCodesModal = () => {
            codesModalBackdrop.classList.add("hidden");
        };
        const openCodesModal = () => {
            codesModalBackdrop.classList.remove("hidden");
        };
        const closeEnrollmentModal = () => {
            enrollmentModalBackdrop.classList.add("hidden");
        };
        const closeTeachingStaffSpecialtiesModal = () => {
            teachingStaffSpecialtiesModalBackdrop.classList.add("hidden");
        };
        const closeStaffDataWarningModal = () => {
            staffDataWarningModalBackdrop.classList.add("hidden");
        };
        const openStaffDataWarningModal = (value, possibleValue) => {
            staffDataWarningText.textContent =
                `És possible que aquesta dada no sigui correcta perquè pot faltar el decimal al dataset original. ` +
                    `El valor de ${value} podria correspondre a ${possibleValue}.`;
            staffDataWarningModalBackdrop.classList.remove("hidden");
        };
        const openEnrollmentModal = async () => {
            if (!currentCentreCode)
                return;
            enrollmentDescription.textContent = "Carregant matrícula...";
            enrollmentModalBody.innerHTML = "";
            enrollmentModalBackdrop.classList.remove("hidden");
            try {
                const enrollment = await fetchEnrollmentRows(currentCentreCode);
                const courseWarning = isCurrentDateInsideSchoolCourse(enrollment.course)
                    ? ""
                    : " ⚠️";
                enrollmentDescription.innerHTML =
                    `Dades del curs ${escapeHtml(enrollment.course)}. ` +
                        `${escapeHtml(courseWarning)} ` +
                        `Última actualització: ${escapeHtml(enrollment.updatedAt)}. ` +
                        `<a href="${escapeHtml(enrollment.sourceUrl)}" target="_blank" rel="noopener noreferrer">Font</a>`;
                if (!enrollment.rows.length) {
                    enrollmentModalBody.innerHTML = '<tr><td colspan="2">No hi ha dades de matrícula per a aquest centre en l\'últim curs.</td></tr>';
                    return;
                }
                enrollmentModalBody.innerHTML = enrollment.rows
                    .map((row) => {
                    const name = escapeHtml(asText(row.nom_ensenyament) || "-");
                    const level = escapeHtml(asText(row.nivell) || "-");
                    const total = escapeHtml(asText(row.matricules_total) || "0");
                    const groups = escapeHtml(asText(row.grups) || "0");
                    return `<tr><th>${name}</th><td>${level}</td><td>${total}</td><td>${groups}</td></tr>`;
                })
                    .join("");
            }
            catch (error) {
                enrollmentDescription.textContent = `Error de connexió: ${error.message}`;
                enrollmentModalBody.innerHTML = "";
            }
        };
        const openTeachingStaffSpecialtiesModal = async () => {
            if (!currentCentreCode)
                return;
            teachingStaffSpecialtiesDescription.textContent = "Carregant especialitats...";
            teachingStaffSpecialtiesModalBody.innerHTML = "";
            teachingStaffSpecialtiesModalBackdrop.classList.remove("hidden");
            try {
                const specialties = await fetchTeachingStaffSpecialties(currentCentreCode);
                teachingStaffSpecialtiesDescription.innerHTML =
                    `Dades del curs ${escapeHtml(specialties.course)}. ` +
                        `<a href="${escapeHtml(specialties.sourceUrl)}" target="_blank" rel="noopener noreferrer">Font</a>`;
                if (!specialties.rows.length) {
                    teachingStaffSpecialtiesModalBody.innerHTML = '<tr><td colspan="3">No hi ha dades d\'especialitats per a aquest centre.</td></tr>';
                    return;
                }
                const renderSpecialtyNumber = (value, warnExactFive) => {
                    const formatted = formatNumber(value);
                    const showWarning = hasPossibleMissingDecimal(value) && (!isExactFive(value) || warnExactFive);
                    const warningButton = showWarning
                        ? `<button class="staff-data-warning-btn" type="button" data-warning-value="${escapeHtml(formatted)}" data-warning-possible-value="${escapeHtml(formatPossibleMissingDecimal(value))}" aria-label="Avís: possible decimal absent" title="Possible decimal absent">⚠️</button>`
                        : "";
                    return `<span class="specialty-number-cell"><span>${escapeHtml(formatted)}</span>${warningButton}</span>`;
                };
                teachingStaffSpecialtiesModalBody.innerHTML = specialties.rows
                    .map((item) => {
                    const warnExactFive = isExactFive(item.total_dot) && isExactFive(item.ocu_def);
                    return `<tr><td>${escapeHtml(asText(item.codi_lloc_desc) || "-")}</td>` +
                        `<td>${renderSpecialtyNumber(item.total_dot, warnExactFive)}</td>` +
                        `<td>${renderSpecialtyNumber(item.ocu_def, warnExactFive)}</td></tr>`;
                })
                    .join("");
            }
            catch (error) {
                teachingStaffSpecialtiesDescription.textContent = `Error de connexió: ${error.message}`;
                teachingStaffSpecialtiesModalBody.innerHTML = "";
            }
        };
        const normalizeTerritorialName = (value) => normalizeText(value)
            .replaceAll(/['’.,]/g, " ")
            .replaceAll(/\bserveis?\s+territorials?\s+(de|del|de la|de l)\b/g, " ")
            .replaceAll(/\bservei\s+territorial\s+(de|del|de la|de l)\b/g, " ")
            .replaceAll(/\s*-\s*/g, " ")
            .replaceAll(/\s+/g, " ")
            .trim();
        const normalizeComarcaName = (value) => normalizeText(value)
            .replaceAll(/['’.,]/g, " ")
            .replaceAll(/\bcomarca\b/g, " ")
            .replaceAll(/\s+/g, " ")
            .trim();
        const normalizeMunicipiName = (value) => normalizeText(value)
            .replaceAll(/['’.,]/g, " ")
            .replaceAll(/\bmunicipi\b/g, " ")
            .replaceAll(/\s+/g, " ")
            .trim();
        const escapeRegExp = (value) => value.replaceAll(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const containsWholeTerm = (text, term) => {
            if (!text || !term)
                return false;
            const pattern = new RegExp(`(^|\\s)${escapeRegExp(term)}(\\s|$)`);
            return pattern.test(text);
        };
        const getTerritorialAliases = (value) => {
            const normalized = normalizeTerritorialName(value);
            const aliases = [normalized];
            if (normalized === "consorci educacio barcelona" || normalized === "consorci d educacio barcelona") {
                aliases.push("consorci d educacio de barcelona", "consorci educacio de barcelona");
            }
            if (normalized === "terres ebre")
                aliases.push("terres de l ebre");
            if (normalized === "maresme valles oriental")
                aliases.push("maresme - valles oriental");
            return aliases;
        };
        const loadTerritorialFeatures = async () => {
            if (territorialFeaturesPromise)
                return territorialFeaturesPromise;
            territorialFeaturesPromise = fetch(TERRITORIAL_SERVICES_URL)
                .then((response) => {
                if (!response.ok)
                    throw new Error("No s'ha pogut carregar el mapa territorial.");
                return response.json();
            })
                .then((geojson) => (Array.isArray(geojson?.features) ? geojson.features : []))
                .catch(() => []);
            return territorialFeaturesPromise;
        };
        const findTerritorialFeature = (territorialName, features) => {
            const targets = getTerritorialAliases(territorialName);
            for (const feature of features) {
                const featureName = normalizeTerritorialName(asText(feature?.properties?.nom));
                if (!featureName)
                    continue;
                if (targets.includes(featureName))
                    return feature;
                if (targets.some((target) => featureName.includes(target) || target.includes(featureName)))
                    return feature;
            }
            return null;
        };
        const loadComarquesFeatures = async () => {
            if (comarquesFeaturesPromise)
                return comarquesFeaturesPromise;
            comarquesFeaturesPromise = fetch(COMARQUES_URL)
                .then((response) => {
                if (!response.ok)
                    throw new Error("No s'ha pogut carregar el mapa de comarques.");
                return response.json();
            })
                .then((geojson) => (Array.isArray(geojson?.features) ? geojson.features : []))
                .catch(() => []);
            return comarquesFeaturesPromise;
        };
        const findComarcaFeature = (comarcaName, features) => {
            const target = normalizeComarcaName(comarcaName);
            if (!target)
                return null;
            for (const feature of features) {
                const featureName = normalizeComarcaName(asText(feature?.properties?.nom_comar || feature?.properties?.NOM_COMAR));
                if (!featureName)
                    continue;
                if (featureName === target)
                    return feature;
                if (featureName.includes(target) || target.includes(featureName))
                    return feature;
            }
            return null;
        };
        const loadMunicipisFeatures = async () => {
            if (municipisFeaturesPromise)
                return municipisFeaturesPromise;
            municipisFeaturesPromise = fetch(MUNICIPIS_URL)
                .then((response) => {
                if (!response.ok)
                    throw new Error("No s'ha pogut carregar el mapa de municipis.");
                return response.json();
            })
                .then((geojson) => (Array.isArray(geojson?.features) ? geojson.features : []))
                .catch(() => []);
            return municipisFeaturesPromise;
        };
        const loadBarcelonaDistrictFeatures = async () => {
            if (barcelonaDistrictsFeaturesPromise)
                return barcelonaDistrictsFeaturesPromise;
            barcelonaDistrictsFeaturesPromise = fetch(BARCELONA_DISTRICTS_URL)
                .then((response) => {
                if (!response.ok)
                    throw new Error("No s'ha pogut carregar el mapa de districtes de Barcelona.");
                return response.json();
            })
                .then((rows) => {
                if (!Array.isArray(rows))
                    return [];
                return rows
                    .map((row) => {
                    const geometry = wktToGeoJsonGeometry(asText(row?.geometria_etrs89));
                    if (!geometry)
                        return null;
                    return {
                        type: "Feature",
                        properties: {
                            name: asText(row?.nom_districte),
                            code: asText(row?.Codi_Districte),
                        },
                        geometry,
                    };
                })
                    .filter(Boolean);
            })
                .catch(() => []);
            return barcelonaDistrictsFeaturesPromise;
        };
        const findMunicipiFeature = (municipiName, features) => {
            const target = normalizeMunicipiName(municipiName);
            if (!target)
                return null;
            for (const feature of features) {
                const featureName = normalizeMunicipiName(asText(feature?.properties?.nom_muni || feature?.properties?.NOM_MUNI));
                if (!featureName)
                    continue;
                if (featureName === target)
                    return feature;
            }
            for (const feature of features) {
                const featureName = normalizeMunicipiName(asText(feature?.properties?.nom_muni || feature?.properties?.NOM_MUNI));
                if (!featureName)
                    continue;
                if (containsWholeTerm(featureName, target))
                    return feature;
            }
            return null;
        };
        const getMunicipiFeatureName = (feature) => asText(feature?.properties?.nom_muni || feature?.properties?.NOM_MUNI);
        const getBarcelonaDistrictFeatureName = (feature) => asText(feature?.properties?.name || feature?.properties?.nom_districte);
        const findBarcelonaDistrictFeature = (districtName, features) => {
            const target = normalizeDistrictName(districtName);
            if (!target)
                return null;
            return features.find((feature) => normalizeDistrictName(getBarcelonaDistrictFeatureName(feature)) === target) || null;
        };
        const findEducationalServiceMunicipiFeatures = (service, features) => {
            const selected = new Map();
            (service.municipalities || []).forEach((municipality) => {
                const target = normalizePlaceName(municipality);
                if (!target)
                    return;
                const feature = features.find((item) => normalizePlaceName(getMunicipiFeatureName(item)) === target) || findMunicipiFeature(municipality, features);
                if (!feature)
                    return;
                selected.set(normalizePlaceName(getMunicipiFeatureName(feature)), feature);
            });
            return Array.from(selected.values());
        };
        const getOrCreateLeafletMap = (state, container, leaflet) => {
            if (state.map)
                return state.map;
            state.map = leaflet.map(container, {
                zoomControl: true,
                scrollWheelZoom: true,
            });
            leaflet.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>',
                maxZoom: 18,
            }).addTo(state.map);
            return state.map;
        };
        const clearPolygonMapState = (state) => {
            if (state.layer) {
                state.layer.remove();
                state.layer = null;
            }
            if (state.centreLayer) {
                state.centreLayer.remove();
                state.centreLayer = null;
            }
        };
        const addCentreMarker = (leaflet, map, centreName, centreX, centreY) => {
            const x = Number(centreX);
            const y = Number(centreY);
            if (!Number.isFinite(x) || !Number.isFinite(y))
                return null;
            const converted = utmToLatLon(31, x, y, true);
            const markerLabel = (centreName || "Centre educatiu").trim() || "Centre educatiu";
            const schoolIcon = leaflet.icon({
                iconUrl: "assets/icona.png",
                iconSize: [20, 30],
                iconAnchor: [10, 29],
                popupAnchor: [0, -24],
                tooltipAnchor: [0, -24],
            });
            const centreLayer = leaflet.layerGroup().addTo(map);
            leaflet
                .marker([converted.lat, converted.lon], { icon: schoolIcon })
                .bindTooltip(markerLabel, {
                direction: "top",
                offset: [0, -15],
                opacity: 0.95,
            })
                .addTo(centreLayer);
            return centreLayer;
        };
        const openPolygonMapModal = async (config, centreName, centreX, centreY) => {
            config.label.textContent = `${config.labelPrefix}: ${config.name}`;
            config.backdrop.classList.remove("hidden");
            const leaflet = window.L;
            if (!leaflet) {
                setMessage(config.noLeafletMessage, true);
                return;
            }
            const map = getOrCreateLeafletMap(config.state, config.container, leaflet);
            const features = await config.loadFeatures();
            clearPolygonMapState(config.state);
            const selectedFeature = config.findFeature(config.name, features);
            if (!selectedFeature) {
                setMessage(config.missingMessage, true);
                return;
            }
            const polygonLayer = leaflet
                .geoJSON(selectedFeature, {
                style: {
                    color: "#a8141a",
                    weight: 2,
                    opacity: 0.9,
                    fillColor: "#d8232a",
                    fillOpacity: 0.32,
                },
            })
                .addTo(map);
            config.state.layer = polygonLayer;
            config.state.centreLayer = addCentreMarker(leaflet, map, centreName, centreX, centreY);
            window.setTimeout(() => {
                map.invalidateSize();
                map.fitBounds(polygonLayer.getBounds(), { padding: [20, 20] });
            }, 0);
        };
        const openTerritorialMapModal = (territorialName, centreName, centreX, centreY) => openPolygonMapModal({
            name: territorialName,
            labelPrefix: "Àrea Territorial",
            missingMessage: "No s'ha trobat el polígon del servei territorial.",
            noLeafletMessage: "No s'ha pogut carregar el mapa territorial.",
            backdrop: territorialMapModalBackdrop,
            label: territorialNameLabel,
            container: territorialMapContainer,
            state: territorialMapState,
            loadFeatures: loadTerritorialFeatures,
            findFeature: findTerritorialFeature,
        }, centreName, centreX, centreY);
        const openComarcaMapModal = (comarcaName, centreName, centreX, centreY) => openPolygonMapModal({
            name: comarcaName,
            labelPrefix: "Comarca",
            missingMessage: "No s'ha trobat el polígon de la comarca.",
            noLeafletMessage: "No s'ha pogut carregar el mapa de comarca.",
            backdrop: comarcaMapModalBackdrop,
            label: comarcaNameLabel,
            container: comarcaMapContainer,
            state: comarcaMapState,
            loadFeatures: loadComarquesFeatures,
            findFeature: findComarcaFeature,
        }, centreName, centreX, centreY);
        const openMunicipiMapModal = (municipiName, centreName, centreX, centreY) => openPolygonMapModal({
            name: municipiName,
            labelPrefix: "Municipi",
            missingMessage: "No s'ha trobat el polígon del municipi.",
            noLeafletMessage: "No s'ha pogut carregar el mapa de municipi.",
            backdrop: municipiMapModalBackdrop,
            label: municipiNameLabel,
            container: municipiMapContainer,
            state: municipiMapState,
            loadFeatures: loadMunicipisFeatures,
            findFeature: findMunicipiFeature,
        }, centreName, centreX, centreY);
        const openEducationalServiceMapModal = async (service, centreMunicipality, centreDistrict, centreName, centreX, centreY) => {
            const districtName = service.district || centreDistrict;
            const useBarcelonaDistrict = normalizePlaceName(centreMunicipality) === "barcelona" && Boolean(districtName);
            const municipalitiesCount = service.municipalities?.length || 0;
            educationalServiceNameLabel.textContent = useBarcelonaDistrict
                ? `${service.name} · ${districtName}`
                : `${service.name}${municipalitiesCount ? ` · ${municipalitiesCount} municipis` : ""}`;
            educationalServiceMapModalBackdrop.classList.remove("hidden");
            const leaflet = window.L;
            if (!leaflet) {
                setMessage("No s'ha pogut carregar el mapa del servei educatiu.", true);
                return;
            }
            const map = getOrCreateLeafletMap(educationalServiceMapState, educationalServiceMapContainer, leaflet);
            clearPolygonMapState(educationalServiceMapState);
            let selectedFeatures;
            if (useBarcelonaDistrict) {
                const districtFeature = findBarcelonaDistrictFeature(districtName, await loadBarcelonaDistrictFeatures());
                selectedFeatures = districtFeature ? [districtFeature] : [];
            }
            else {
                selectedFeatures = findEducationalServiceMunicipiFeatures(service, await loadMunicipisFeatures());
            }
            if (!selectedFeatures.length) {
                setMessage("No s'han trobat els polígons del servei educatiu.", true);
                return;
            }
            const highlightedArea = useBarcelonaDistrict ? normalizeDistrictName(districtName) : normalizePlaceName(centreMunicipality);
            const polygonLayer = leaflet
                .geoJSON({
                type: "FeatureCollection",
                features: selectedFeatures,
            }, {
                style: (feature) => {
                    const featureName = useBarcelonaDistrict ? getBarcelonaDistrictFeatureName(feature) : getMunicipiFeatureName(feature);
                    const isCentreArea = (useBarcelonaDistrict ? normalizeDistrictName(featureName) : normalizePlaceName(featureName)) === highlightedArea;
                    return {
                        color: "#a8141a",
                        weight: isCentreArea ? 3 : 1.5,
                        opacity: 0.9,
                        fillColor: "#d8232a",
                        fillOpacity: isCentreArea ? 0.34 : 0.22,
                    };
                },
                onEachFeature: (feature, layer) => {
                    const name = useBarcelonaDistrict ? getBarcelonaDistrictFeatureName(feature) : getMunicipiFeatureName(feature);
                    if (name)
                        layer.bindTooltip(name, { sticky: true, opacity: 0.95 });
                },
            })
                .addTo(map);
            educationalServiceMapState.layer = polygonLayer;
            educationalServiceMapState.centreLayer = addCentreMarker(leaflet, map, centreName, centreX, centreY);
            window.setTimeout(() => {
                map.invalidateSize();
                map.fitBounds(polygonLayer.getBounds(), { padding: [20, 20] });
            }, 0);
        };
        const openMapModal = (xValue, yValue, centreName) => {
            const x = Number(xValue);
            const y = Number(yValue);
            if (!Number.isFinite(x) || !Number.isFinite(y)) {
                setMessage("Les coordenades no són vàlides.", true);
                return;
            }
            const converted = utmToLatLon(31, x, y, true);
            const lat = converted.lat;
            const lon = converted.lon;
            const leaflet = window.L;
            if (!leaflet) {
                setMessage("No s'ha pogut carregar el mapa.", true);
                return;
            }
            if (!centreMap) {
                centreMap = leaflet.map(mapLeafletContainer, {
                    zoomControl: true,
                    scrollWheelZoom: true,
                });
                leaflet.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>',
                    maxZoom: 18,
                }).addTo(centreMap);
            }
            if (centreMapLayer) {
                centreMapLayer.remove();
                centreMapLayer = null;
            }
            const markerLabel = (centreName || "Centre educatiu").trim() || "Centre educatiu";
            const schoolIcon = leaflet.icon({
                iconUrl: "assets/icona.png",
                iconSize: [40, 60],
                iconAnchor: [20, 59],
                popupAnchor: [0, -50],
                tooltipAnchor: [0, -50],
            });
            centreMapLayer = leaflet.layerGroup().addTo(centreMap);
            leaflet
                .marker([lat, lon], { icon: schoolIcon })
                .bindTooltip(markerLabel, {
                direction: "top",
                offset: [0, -15],
                opacity: 0.95,
            })
                .addTo(centreMapLayer);
            openMapLink.href = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=16/${lat}/${lon}`;
            mapCoordsLabel.textContent = `X: ${xValue} | Y: ${yValue} | Lat: ${lat.toFixed(6)} | Lon: ${lon.toFixed(6)}`;
            mapModalBackdrop.classList.remove("hidden");
            window.setTimeout(() => {
                centreMap.invalidateSize();
                centreMap.setView([lat, lon], 15);
            }, 0);
        };
        const renderData = async (data) => {
            const fields = { ...(data.fields || {}) };
            const rows = [];
            const studies = [];
            currentCentreCode = String((data.centre && data.centre.code) || data.requested_code || "").trim();
            const teachingStaffTotal = currentCentreCode ? await fetchTeachingStaffTotal(currentCentreCode) : "Sense dades";
            currentCentreForTerritorial = {
                name: (data.centre && data.centre.name) || "",
                x: (data.coordinates && data.coordinates.x) || "",
                y: (data.coordinates && data.coordinates.y) || "",
            };
            currentEducationalServiceForMap = data.educational_service || null;
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
            const isStudyActive = (value) => {
                const raw = String(value || "").trim();
                if (!raw || raw === "-")
                    return false;
                const normalized = normalizeText(raw);
                if (!normalized)
                    return false;
                if (["0", "n", "no", "false", "fals", "cap"].includes(normalized))
                    return false;
                const numeric = Number(normalized.replace(",", "."));
                if (Number.isFinite(numeric))
                    return numeric > 0;
                return true;
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
            const cursValue = pullFieldByLabel([
                "Curs",
            ]);
            const addressValue = pullFieldByLabel([
                "Adreça",
                "Adreca",
            ]);
            const naturalesaValue = pullFieldByLabel([
                "Naturalesa",
                "Nom naturalesa",
            ]);
            const titularitatValue = pullFieldByLabel([
                "Titularitat",
                "Nom titularitat",
            ]);
            const codes = [
                {
                    label: "Codi naturalesa",
                    value: pullFieldByLabel(["Codi naturalesa"]),
                },
                {
                    label: "Codi titularitat",
                    value: pullFieldByLabel(["Codi titularitat"]),
                },
                {
                    label: "Codi delegació",
                    value: pullFieldByLabel(["Codi delegació", "Codi delegacio"]),
                },
                {
                    label: "Codi comarca",
                    value: pullFieldByLabel(["Codi comarca"]),
                },
                {
                    label: "Codi municipi",
                    value: pullFieldByLabel(["Codi municipi"]),
                },
                {
                    label: "Codi municipi (6)",
                    value: pullFieldByLabel(["Codi municipi (6)"]),
                },
                {
                    label: "Codi districte municipal",
                    value: pullFieldByLabel(["Codi districte municipal"]),
                },
                {
                    label: "Codi localitat",
                    value: pullFieldByLabel(["Codi localitat"]),
                },
            ];
            const postalCodeValue = pullFieldByLabel([
                "Codi postal",
            ]);
            const phoneValue = pullFieldByLabel([
                "Telèfon del centre",
                "Telefon del centre",
            ]);
            const territorialValue = pullFieldByLabel([
                "Àrea Territorial",
                "Area Territorial",
                "Nom delegació",
                "Nom delegacio",
            ]);
            const comarcaValue = pullFieldByLabel([
                "Comarca",
                "Nom comarca",
            ]);
            STUDY_KEYS.forEach((studyKey) => {
                const label = prettifyKey(studyKey);
                if (!(label in fields))
                    return;
                const value = String(fields[label] ?? "");
                delete fields[label];
                if (!isStudyActive(value))
                    return;
                studies.push(studyKey.toUpperCase());
            });
            const municipalityValue = pullFieldByLabel([
                "Població",
                "Poblacio",
                "Nom municipi",
            ]);
            const localityValue = pullFieldByLabel([
                "Localitat",
                "Nom localitat",
            ]);
            const districtNameValue = pullFieldByLabel([
                "Nom districte municipal",
                "Nom districte",
            ]);
            currentDistrictForMap = districtNameValue || "";
            const municipalityDisplay = municipalityValue && localityValue && normalizeText(municipalityValue) !== normalizeText(localityValue)
                ? `${municipalityValue} (${localityValue})`
                : municipalityValue || localityValue || "-";
            currentMunicipalityForMap = municipalityValue || localityValue || "";
            rows.push(buildCodeRow((data.centre && data.centre.code) || data.requested_code || ""));
            rows.push(row("Nom centre", (data.centre && data.centre.name) || ""));
            rows.push(row("Naturalesa", naturalesaValue || "-"));
            rows.push(row("Titularitat", titularitatValue || "-"));
            rows.push(row("Correu electrònic del centre", emailValue || "-"));
            rows.push(row("URL pàgina web centre", webValue || "-"));
            rows.push(row("Telèfon del centre", phoneValue || "-"));
            rows.push(row("Adreça", addressValue || "-"));
            rows.push(row("Municipi", municipalityDisplay));
            if (districtNameValue)
                rows.push(row("Nom districte municipal", districtNameValue));
            rows.push(row("Codi postal", postalCodeValue || "-"));
            rows.push(row("Àrea Territorial", territorialValue || "-"));
            rows.push(buildEducationalServiceRow(data.educational_service || null));
            rows.push(row("Comarca", comarcaValue || "-"));
            rows.push(row("Curs", cursValue || "-"));
            rows.push(buildEnrollmentButtonRow(studies.length ? studies.join(" - ") : "-"));
            rows.push(buildTeachingStaffRow(teachingStaffTotal));
            rows.push(buildCodesButtonRow());
            codesModalBody.innerHTML = codes
                .map((code) => `<tr><th>${escapeHtml(code.label)}</th><td>${escapeHtml(code.value || "-")}</td></tr>`)
                .join("");
            Object.entries(fields).forEach(([label, value]) => {
                if (label === "Coordenades")
                    return;
                if (label === "Coordenada UTM X")
                    return;
                if (label === "Coordenada UTM Y")
                    return;
                if (label === "Coordenada Geo X")
                    return;
                if (label === "Coordenada Geo Y")
                    return;
                if (label === "Geo 1")
                    return;
                if (label === "Any")
                    return;
                const displayValue = Array.isArray(value) ? value.join(" | ") : String(value ?? "");
                rows.push(row(label, displayValue));
            });
            resultBody.innerHTML = rows.join("");
            resultTable.classList.remove("hidden");
            metaEl.classList.add("hidden");
            metaEl.textContent = "";
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
            const selected = pickBestRow(rows);
            return attachEducationalService(rowToFitxaData(code, selected), selected);
        };
        const searchFitxaByTextFromSocrata = async (text) => {
            const allRows = dedupeByCode(await getCurrentCourseRows());
            const needle = normalizeText(text);
            const filtered = allRows.filter((row) => {
                const centreName = normalizeText(asText(row.denominaci_completa));
                const municipalityName = normalizeText(asText(row.nom_municipi));
                return centreName.includes(needle) || municipalityName.includes(needle);
            });
            return sortRowsByNameRelevance(filtered, text);
        };
        const loadCentre = async () => {
            const query = codeInput.value.trim();
            setMessage("Carregant dades...");
            hideMatchChooser();
            resultTable.classList.add("hidden");
            metaEl.classList.add("hidden");
            if (!query) {
                setMessage("Has d'indicar el codi, el nom del centre o el municipi.", true);
                return;
            }
            const isCodeSearch = /^\d{8}$/.test(query);
            loadButton.disabled = true;
            try {
                if (!isCodeSearch && apiBase) {
                    setMessage("Amb backend extern, la cerca per nom o municipi no està activada. Introdueix un codi de centre.", true);
                    return;
                }
                if (!apiBase) {
                    if (isCodeSearch) {
                        const data = await fetchFitxaFromSocrata(query);
                        if (data.status !== "ok") {
                            setMessage(data.message || "No s'ha pogut carregar el centre.", true);
                            return;
                        }
                        await renderData(data);
                        setMessage("");
                        return;
                    }
                    const matches = await searchFitxaByTextFromSocrata(query);
                    if (!matches.length) {
                        setMessage("No s'ha trobat cap centre amb aquest nom o municipi.", true);
                        return;
                    }
                    if (matches.length === 1) {
                        const selected = matches[0];
                        const code = asText(selected.codi_centre);
                        const data = await attachEducationalService(rowToFitxaData(code, selected), selected);
                        await renderData(data);
                        setMessage("");
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
                await renderData(data);
                setMessage("");
            }
            catch (error) {
                setMessage(`Error de connexió: ${error.message}`, true);
            }
            finally {
                loadButton.disabled = false;
            }
        };
        loadButton.addEventListener("click", loadCentre);
        infoButton.addEventListener("click", openInfoModal);
        closeInfoModalButton.addEventListener("click", closeInfoModal);
        closeMapModalButton.addEventListener("click", closeMapModal);
        closeTerritorialMapModalButton.addEventListener("click", closeTerritorialMapModal);
        closeComarcaMapModalButton.addEventListener("click", closeComarcaMapModal);
        closeMunicipiMapModalButton.addEventListener("click", closeMunicipiMapModal);
        closeEducationalServiceMapModalButton.addEventListener("click", closeEducationalServiceMapModal);
        closeCodesModalButton.addEventListener("click", closeCodesModal);
        closeEnrollmentModalButton.addEventListener("click", closeEnrollmentModal);
        closeTeachingStaffSpecialtiesModalButton.addEventListener("click", closeTeachingStaffSpecialtiesModal);
        closeStaffDataWarningModalButton.addEventListener("click", closeStaffDataWarningModal);
        infoModalBackdrop.addEventListener("click", (event) => {
            if (event.target === infoModalBackdrop)
                closeInfoModal();
        });
        mapModalBackdrop.addEventListener("click", (event) => {
            if (event.target === mapModalBackdrop)
                closeMapModal();
        });
        territorialMapModalBackdrop.addEventListener("click", (event) => {
            if (event.target === territorialMapModalBackdrop)
                closeTerritorialMapModal();
        });
        comarcaMapModalBackdrop.addEventListener("click", (event) => {
            if (event.target === comarcaMapModalBackdrop)
                closeComarcaMapModal();
        });
        municipiMapModalBackdrop.addEventListener("click", (event) => {
            if (event.target === municipiMapModalBackdrop)
                closeMunicipiMapModal();
        });
        educationalServiceMapModalBackdrop.addEventListener("click", (event) => {
            if (event.target === educationalServiceMapModalBackdrop)
                closeEducationalServiceMapModal();
        });
        codesModalBackdrop.addEventListener("click", (event) => {
            if (event.target === codesModalBackdrop)
                closeCodesModal();
        });
        enrollmentModalBackdrop.addEventListener("click", (event) => {
            if (event.target === enrollmentModalBackdrop)
                closeEnrollmentModal();
        });
        teachingStaffSpecialtiesModalBackdrop.addEventListener("click", (event) => {
            if (event.target === teachingStaffSpecialtiesModalBackdrop)
                closeTeachingStaffSpecialtiesModal();
        });
        staffDataWarningModalBackdrop.addEventListener("click", (event) => {
            if (event.target === staffDataWarningModalBackdrop)
                closeStaffDataWarningModal();
        });
        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape" && !infoModalBackdrop.classList.contains("hidden"))
                closeInfoModal();
            if (event.key === "Escape" && !mapModalBackdrop.classList.contains("hidden"))
                closeMapModal();
            if (event.key === "Escape" && !territorialMapModalBackdrop.classList.contains("hidden"))
                closeTerritorialMapModal();
            if (event.key === "Escape" && !comarcaMapModalBackdrop.classList.contains("hidden"))
                closeComarcaMapModal();
            if (event.key === "Escape" && !municipiMapModalBackdrop.classList.contains("hidden"))
                closeMunicipiMapModal();
            if (event.key === "Escape" && !educationalServiceMapModalBackdrop.classList.contains("hidden"))
                closeEducationalServiceMapModal();
            if (event.key === "Escape" && !codesModalBackdrop.classList.contains("hidden"))
                closeCodesModal();
            if (event.key === "Escape" && !enrollmentModalBackdrop.classList.contains("hidden"))
                closeEnrollmentModal();
            if (event.key === "Escape" && !teachingStaffSpecialtiesModalBackdrop.classList.contains("hidden"))
                closeTeachingStaffSpecialtiesModal();
            if (event.key === "Escape" && !staffDataWarningModalBackdrop.classList.contains("hidden"))
                closeStaffDataWarningModal();
        });
        teachingStaffSpecialtiesModalBody.addEventListener("click", (event) => {
            const target = event.target;
            const warningButton = target.closest(".staff-data-warning-btn");
            if (warningButton) {
                openStaffDataWarningModal(warningButton.dataset.warningValue || "", warningButton.dataset.warningPossibleValue || "");
            }
        });
        resultBody.addEventListener("click", async (event) => {
            const target = event.target;
            const codesButton = target.closest(".codes-btn");
            if (codesButton) {
                openCodesModal();
                return;
            }
            const enrollmentButton = target.closest(".enrollment-btn");
            if (enrollmentButton) {
                await openEnrollmentModal();
                return;
            }
            const teachingStaffSpecialtiesButton = target.closest(".teaching-staff-specialties-btn");
            if (teachingStaffSpecialtiesButton) {
                await openTeachingStaffSpecialtiesModal();
                return;
            }
            const copyButton = target.closest(".copy-btn");
            if (copyButton) {
                const text = copyButton.dataset.copy || "";
                if (!text)
                    return;
                try {
                    await navigator.clipboard.writeText(text);
                    setMessage(copyButton.dataset.copyMessage || "Text copiat al porta-retalls.");
                }
                catch {
                    setMessage("No s'ha pogut copiar el text.", true);
                }
                return;
            }
            const mapButton = target.closest(".map-btn");
            if (mapButton) {
                const encodedName = mapButton.dataset.mapName || "";
                let centreName = "";
                try {
                    centreName = decodeURIComponent(encodedName);
                }
                catch {
                    centreName = encodedName;
                }
                openMapModal(mapButton.dataset.mapX || "", mapButton.dataset.mapY || "", centreName);
                return;
            }
            const territorialMapButton = target.closest(".territorial-map-btn");
            if (territorialMapButton) {
                const territorialName = territorialMapButton.dataset.territorialName || "";
                if (!territorialName)
                    return;
                openTerritorialMapModal(territorialName, territorialMapButton.dataset.centreName || "", territorialMapButton.dataset.centreX || "", territorialMapButton.dataset.centreY || "");
                return;
            }
            const comarcaMapButton = target.closest(".comarca-map-btn");
            if (comarcaMapButton) {
                const comarcaName = comarcaMapButton.dataset.comarcaName || "";
                if (!comarcaName)
                    return;
                openComarcaMapModal(comarcaName, comarcaMapButton.dataset.centreName || "", comarcaMapButton.dataset.centreX || "", comarcaMapButton.dataset.centreY || "");
                return;
            }
            const municipiMapButton = target.closest(".municipi-map-btn");
            if (municipiMapButton) {
                const municipiName = municipiMapButton.dataset.municipiName || "";
                if (!municipiName)
                    return;
                openMunicipiMapModal(municipiName, municipiMapButton.dataset.centreName || "", municipiMapButton.dataset.centreX || "", municipiMapButton.dataset.centreY || "");
                return;
            }
            const educationalServiceMapButton = target.closest(".educational-service-map-btn");
            if (educationalServiceMapButton) {
                if (!currentEducationalServiceForMap)
                    return;
                openEducationalServiceMapModal(currentEducationalServiceForMap, currentMunicipalityForMap, currentDistrictForMap, educationalServiceMapButton.dataset.centreName || "", educationalServiceMapButton.dataset.centreX || "", educationalServiceMapButton.dataset.centreY || "");
                return;
            }
            const phoneCopyButton = target.closest(".phone-copy-btn");
            if (phoneCopyButton) {
                const phoneNumber = phoneCopyButton.dataset.copyPhone || "";
                if (!phoneNumber)
                    return;
                try {
                    await navigator.clipboard.writeText(phoneNumber);
                    setMessage("Telèfon copiat al porta-retalls.");
                }
                catch {
                    setMessage("No s'ha pogut copiar el telèfon.", true);
                }
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
                await renderData(data);
                setMessage("");
            }
            catch (error) {
                setMessage(`Error de connexió: ${error.message}`, true);
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
