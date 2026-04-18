(() => {
    const win = window;
    const STATIC_JSON_URL = "./data/centres.json";
    let cachePromise = null;
    let cacheCentres = [];
    function normalize(value) {
        return (value || "")
            .normalize("NFD")
            .replaceAll(/[\u0300-\u036f]/g, "")
            .replaceAll(/\s+/g, " ")
            .trim()
            .toLowerCase();
    }
    async function loadPayload() {
        if (cachePromise)
            return cachePromise;
        cachePromise = (async () => {
            const response = await fetch(STATIC_JSON_URL);
            if (!response.ok) {
                throw new Error(`No s'ha pogut carregar ${STATIC_JSON_URL}`);
            }
            const payload = (await response.json());
            if (!payload || !Array.isArray(payload.centres)) {
                throw new Error("El fitxer de dades estatiques no te format valid.");
            }
            cacheCentres = payload.centres;
            return payload;
        })();
        return cachePromise;
    }
    function buildRankedSearch(items, query) {
        const normalizedInput = normalize(query);
        const ranked = items
            .map((item) => {
            const name = normalize(item.name);
            const municipi = normalize(item.municipi);
            const code = (item.code || "").trim();
            const hay = `${name} ${municipi} ${code}`.trim();
            let score = 0;
            if (code === normalizedInput || name === normalizedInput)
                score = 4;
            else if (name.startsWith(normalizedInput))
                score = 3;
            else if (hay.includes(normalizedInput))
                score = 2;
            else
                score = 0;
            return { item, score };
        })
            .filter((entry) => entry.score > 0)
            .sort((a, b) => {
            if (b.score !== a.score)
                return b.score - a.score;
            return a.item.name.localeCompare(b.item.name, "ca");
        });
        return ranked.map((entry) => entry.item);
    }
    win.StaticCentres = {
        load: async () => {
            const payload = await loadPayload();
            return payload.centres;
        },
        normalize,
        search: (query) => {
            const normalized = normalize(query);
            if (!normalized)
                return [];
            return buildRankedSearch(cacheCentres, query);
        },
        byCode: async (code) => {
            const payload = await loadPayload();
            const exact = (code || "").trim();
            if (!exact)
                return null;
            return payload.centres.find((item) => (item.code || "").trim() === exact) || null;
        },
        sourceUrl: async () => (await loadPayload()).source || "",
    };
})();
