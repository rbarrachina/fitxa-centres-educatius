# Consulta de Centres Educatius de Catalunya (Dades Obertes)

Aplicació web per consultar fitxes de centres educatius de Catalunya i visualitzar-ne la ubicació sobre mapa (centre, àrea territorial, comarca i municipi).

## Funcionalitats

- Cerca per codi de centre (8 dígits), nom del centre o municipi.
- Selecció de centre quan hi ha múltiples coincidències.
- Fitxa amb camps principals (nom, naturalesa, titularitat, adreça, municipi, etc.).
- Botons d'acció (copiar, web, telèfon amb enllaç `tel:`, veure mapa).
- Fila `Codis` amb botó `Veure codis` per obrir un popup amb codis administratius.
- El camp `Nom districte municipal` només es mostra si té valor.
- Mapes en modal:
  - ubicació del centre,
  - àrea territorial,
  - comarca,
  - municipi.

## Arquitectura

### Frontend (principal)

- Aplicació estàtica publicable a `web/`.
- TypeScript font: `src/fitxa-centre.ts`.
- JavaScript compilat: `web/js/fitxa-centre.js`.
- Estils: `web/css/fitxa-centre.css`.
- Pàgina: `web/index.html`.
- Entrada d'arrel per desenvolupament local: `index.html`, que redirigeix a `web/`.

### Backend (opcional)

Existeix backend FastAPI opcional a `backend/` per mode servidor, però el flux principal actual és frontend estàtic.

## Requisits

- Node.js 18+ (recomanat 20+)
- npm
- Python 3.10+

## Execució en local

1. Instal·lar dependències i compilar TS:

```bash
npm install
npm run build
```

2. Servir l'aplicació estàtica:

```bash
npm run serve
```

3. Obrir:

`http://127.0.0.1:8000/`

## Modes d'execució

- Mode estàtic (principal): `npm run serve`
- Mode backend opcional (FastAPI): `npm run backend`
- Si es vol forçar ús de backend des del frontend estàtic, definir `window.MAPES_API_BASE` a `web/index.html`.

## Desenvolupament

- Qualsevol canvi a `src/fitxa-centre.ts` requereix recompilar:

```bash
npm run build
```

- Script disponible en watch:

```bash
npm run build:watch
```

- Backend opcional:

```bash
pip install -r requirements.txt
npm run backend
```

## Fonts externes de dades i serveis

L'aplicació consumeix dades i serveis externs en temps d'execució:

1. Dades de centres docents (Socrata)
   - URL dataset: `https://analisi.transparenciacatalunya.cat/d/kvmv-ahh4`
   - API usada: `https://analisi.transparenciacatalunya.cat/resource/kvmv-ahh4.json`

2. Àrees territorials (fitxer local al repositori)
   - Fitxer: `web/data/serveis-territorials-simplificat.geojson`
   - Origen del recurs: `https://github.com/rbarrachina/recollida_excedent`

3. Comarques (ICGC Geoserveis)
   - Endpoint: `https://geoserveis.icgc.cat/vector01/rest/services/rtpc_carrers/MapServer/5/query?where=1%3D1&outFields=NOM_COMAR&outSR=4326&f=geojson`

4. Municipis (ICGC Geoserveis)
   - Endpoint: `https://geoserveis.icgc.cat/vector01/rest/services/rtpc_carrers/MapServer/4/query?where=1%3D1&outFields=NOM_MUNI&outSR=4326&f=geojson`

5. Cartografia base (Leaflet + OpenStreetMap tiles)
   - Leaflet CDN: `https://unpkg.com/leaflet@1.9.4/dist/leaflet.js`
   - Tiles OSM: `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`

## Llicències i atribució de tercers

> Important: les condicions de reutilització poden canviar; cal revisar periòdicament la metadata de cada font.

### 1) Dataset de centres (`kvmv-ahh4`)

- Metadata de l'API Socrata: `license.name = "See Terms of Use"`.
- Atribució indicada a metadata: `Departament d'Educació`.
- Enllaç d'atribució/llicències: `https://administraciodigital.gencat.cat/ca/dades/dades-obertes/informacio-practica/llicencies/`

### 2) Dataset de comarques (`r97w-2njr`, com a referència d'origen)

- Metadata de l'API Socrata: `license.name = "See Terms of Use"`.
- Atribució indicada a metadata: `Institut Cartogràfic i Geològic de Catalunya (ICGC)`.
- Enllaç d'atribució/llicències: `https://administraciodigital.gencat.cat/ca/dades/dades-obertes/informacio-practica/llicencies/`

### 3) Geoinformació ICGC (serveis de comarca/municipi)

- Pàgina oficial de reutilització ICGC: `https://www.icgc.cat/ca/LICGC/Informacio-publica/Transparencia/Reutilitzacio-de-la-informacio`
- Segons aquesta pàgina, la llicència general de la geoinformació ICGC és **CC BY 4.0** (amb obligació de citació de la font).

### 4) OpenStreetMap (cartografia base)

- Llicència de les dades: **Open Data Commons Open Database License (ODbL)**.
- Pàgina oficial: `https://www.openstreetmap.org/copyright`
- Cal mantenir atribució a OpenStreetMap contributors.

### 5) Leaflet

- Llicència: **BSD 2-Clause**.
- Fitxer oficial de llicència: `https://github.com/Leaflet/Leaflet/blob/main/LICENSE`

### 6) Fitxer territorial local (`serveis-territorials-simplificat.geojson`)

- Origen: repositori `rbarrachina/recollida_excedent`.
- El repositori inclou llicència **CC BY-SA 4.0** (fitxer `LICENSE`).

## Llicència del projecte

Aquest repositori es distribueix sota **CC BY-SA 4.0**.

- Fitxer local: `LICENSE`
- URL: `https://creativecommons.org/licenses/by-sa/4.0/`
