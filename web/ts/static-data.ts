(() => {
  type StaticCentre = {
    code: string;
    name: string;
    municipi: string;
    mail: string;
    phone: string;
    web: string;
    coord_x: string;
    coord_y: string;
    territorial_area_st: string;
    naturalesa: string;
    address: string;
    source_url: string;
  };

  type StaticDataPayload = {
    generated_at?: string;
    source?: string;
    centres: StaticCentre[];
  };

  type StaticApi = {
    load: () => Promise<StaticCentre[]>;
    normalize: (value: string) => string;
    search: (query: string) => StaticCentre[];
    byCode: (code: string) => Promise<StaticCentre | null>;
    sourceUrl: () => Promise<string>;
  };

  type MapesWindow = Window & {
    StaticCentres?: StaticApi;
  };

  const win = window as MapesWindow;
  const STATIC_JSON_URL = "./data/centres.json";

  let cachePromise: Promise<StaticDataPayload> | null = null;
  let cacheCentres: StaticCentre[] = [];

  function normalize(value: string): string {
    return (value || "")
      .normalize("NFD")
      .replaceAll(/[\u0300-\u036f]/g, "")
      .replaceAll(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  async function loadPayload(): Promise<StaticDataPayload> {
    if (cachePromise) return cachePromise;
    cachePromise = (async () => {
      const response = await fetch(STATIC_JSON_URL);
      if (!response.ok) {
        throw new Error(`No s'ha pogut carregar ${STATIC_JSON_URL}`);
      }
      const payload = (await response.json()) as StaticDataPayload;
      if (!payload || !Array.isArray(payload.centres)) {
        throw new Error("El fitxer de dades estatiques no te format valid.");
      }
      cacheCentres = payload.centres;
      return payload;
    })();
    return cachePromise;
  }

  function buildRankedSearch(items: StaticCentre[], query: string): StaticCentre[] {
    const normalizedInput = normalize(query);
    const ranked = items
      .map((item) => {
        const name = normalize(item.name);
        const municipi = normalize(item.municipi);
        const code = (item.code || "").trim();
        const hay = `${name} ${municipi} ${code}`.trim();

        let score = 0;
        if (code === normalizedInput || name === normalizedInput) score = 4;
        else if (name.startsWith(normalizedInput)) score = 3;
        else if (hay.includes(normalizedInput)) score = 2;
        else score = 0;

        return { item, score };
      })
      .filter((entry) => entry.score > 0)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
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
    search: (query: string) => {
      const normalized = normalize(query);
      if (!normalized) return [];
      return buildRankedSearch(cacheCentres, query);
    },
    byCode: async (code: string) => {
      const payload = await loadPayload();
      const exact = (code || "").trim();
      if (!exact) return null;
      return payload.centres.find((item) => (item.code || "").trim() === exact) || null;
    },
    sourceUrl: async () => (await loadPayload()).source || "",
  };
})();
