# Consulta de Centres Educatius de Catalunya (Dades Obertes)

Aplicació web per consultar fitxes de centres educatius de Catalunya i visualitzar-ne la ubicació sobre mapa (centre, àrea territorial, servei educatiu, comarca i municipi).

## Funcionalitats

- Cerca per codi de centre (8 dígits), nom del centre o municipi.
- Selecció de centre quan hi ha múltiples coincidències.
- Fitxa amb camps principals (nom, naturalesa, titularitat, adreça, municipi, etc.).
- Botons d'acció (copiar, web, telèfon amb enllaç `tel:`, veure mapa).
- Fila `Codis` amb botó `Veure codis` per obrir un popup amb codis administratius.
- Fila `Estudis` amb botó `Veure matrícula` per obrir un popup amb la matrícula d'alumnes de l'últim curs disponible.
  - Mostra `Nom ensenyament`, `Nivell`, `Matrícula` i `Grups`.
  - Ordena els resultats per INF, PRIM, SEC, BATX, FP i altres.
  - En idiomes, ordena els nivells com a bàsic, intermedi i avançat.
  - Inclou el curs de les dades, la data de l'última actualització del dataset i l'enllaç a la font.
  - Si el curs del dataset no correspon al curs escolar actual, mostra un avís `⚠️`. El curs escolar es considera de l'1 de setembre al 31 d'agost.
- Fila `Servei educatiu` amb el Servei Educatiu de Zona associat, botó `Web SE` quan la font en proporciona l'URL i botó `Veure mapa`.
- El camp `Nom districte municipal` només es mostra si té valor.
- Mapes en modal:
  - ubicació del centre,
  - àrea territorial,
  - servei educatiu,
  - comarca,
  - municipi.
- Els popups no superen l'alçada de la finestra i mostren desplaçament vertical quan el contingut és llarg.

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

- Regenerar el fitxer local de Serveis Educatius de Zona:

```bash
npm run build:serveis-educatius
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

2. Matrícula d'alumnes per ensenyament i nivell (Socrata)
   - URL dataset: `https://analisi.transparenciacatalunya.cat/Educaci-/Alumnes-matriculats-per-ensenyament-i-unitats-dels/xvme-26kg/about_data`
   - API usada: `https://analisi.transparenciacatalunya.cat/resource/xvme-26kg.json`
   - Metadata usada per obtenir l'última actualització: `https://analisi.transparenciacatalunya.cat/api/views/xvme-26kg`
   - La consulta usa només l'últim `curs` disponible i agrupa per centre, ensenyament i `nivell`.
   - Mostra `matr_cules_total` com a matrícula i `unitats` com a grups.

3. Àrees territorials (fitxer local al repositori)
   - Fitxer: `web/data/serveis-territorials-simplificat.geojson`
   - Origen del recurs: `https://github.com/rbarrachina/recollida_excedent`

4. Serveis Educatius de Zona (fitxer local al repositori)
   - Fitxer: `web/data/serveis-educatius.json`
   - Origen del recurs: `https://edumet.cat/areatac/presentacions/index_json.php?config=ConfigTotsSEZ&id=1l_0DXbgPhhoaHEA_oCdz2rR_6ZeVF0ZPWagyuZkOeq0`
   - Full públic usat per generar-lo: `https://docs.google.com/spreadsheets/d/1l_0DXbgPhhoaHEA_oCdz2rR_6ZeVF0ZPWagyuZkOeq0/gviz/tq?tqx=out:csv&sheet=Serveis`
   - Regeneració: `npm run build:serveis-educatius`
   - La correspondència es fa per municipi; en el cas de Barcelona, per municipi i districte municipal.

5. Comarques (ICGC Geoserveis)
   - Endpoint: `https://geoserveis.icgc.cat/vector01/rest/services/rtpc_carrers/MapServer/5/query?where=1%3D1&outFields=NOM_COMAR&outSR=4326&f=geojson`

6. Municipis (ICGC Geoserveis)
   - Endpoint: `https://geoserveis.icgc.cat/vector01/rest/services/rtpc_carrers/MapServer/4/query?where=1%3D1&outFields=NOM_MUNI&outSR=4326&f=geojson`

7. Districtes de Barcelona (Open Data BCN)
   - Dataset: `https://opendata-ajuntament.barcelona.cat/data/ca/dataset/20170706-districtes-barris`
   - Recurs usat: `BarcelonaCiutat_Districtes.json`
   - Endpoint: `https://opendata-ajuntament.barcelona.cat/data/dataset/20170706-districtes-barris/resource/5f8974a7-7937-4b50-acbc-89204d570df9/download`
   - S'usa per pintar només el districte en els Serveis Educatius de Zona de Barcelona ciutat.

8. Cartografia base (Leaflet + OpenStreetMap tiles)
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

### 3) Dataset de matrícula d'alumnes (`xvme-26kg`)

- Metadata de l'API Socrata: `license.name = "See Terms of Use"`.
- Atribució indicada a metadata: `Departament d'Educació`.
- Enllaç d'atribució/llicències: `https://administraciodigital.gencat.cat/ca/dades/dades-obertes/informacio-practica/llicencies/`

### 4) Serveis Educatius de Zona

- Origen: mapa públic `Relació de Serveis Educatius`.
- URL: `https://edumet.cat/areatac/presentacions/index_json.php?config=ConfigTotsSEZ&id=1l_0DXbgPhhoaHEA_oCdz2rR_6ZeVF0ZPWagyuZkOeq0`
- Les condicions de reutilització depenen de la font original publicada.

### 5) Geoinformació ICGC (serveis de comarca/municipi)

- Pàgina oficial de reutilització ICGC: `https://www.icgc.cat/ca/LICGC/Informacio-publica/Transparencia/Reutilitzacio-de-la-informacio`
- Segons aquesta pàgina, la llicència general de la geoinformació ICGC és **CC BY 4.0** (amb obligació de citació de la font).

### 6) Open Data BCN (districtes de Barcelona)

- Origen: Ajuntament de Barcelona, portal Open Data BCN.
- Dataset: `https://opendata-ajuntament.barcelona.cat/data/ca/dataset/20170706-districtes-barris`
- Recurs: `BarcelonaCiutat_Districtes.json`.
- Cal revisar la fitxa del dataset per confirmar les condicions de reutilització vigents.

### 7) OpenStreetMap (cartografia base)

- Llicència de les dades: **Open Data Commons Open Database License (ODbL)**.
- Pàgina oficial: `https://www.openstreetmap.org/copyright`
- Cal mantenir atribució a OpenStreetMap contributors.

### 8) Leaflet

- Llicència: **BSD 2-Clause**.
- Fitxer oficial de llicència: `https://github.com/Leaflet/Leaflet/blob/main/LICENSE`

### 9) Fitxer territorial local (`serveis-territorials-simplificat.geojson`)

- Origen: repositori `rbarrachina/recollida_excedent`.
- El repositori inclou llicència **CC BY-SA 4.0** (fitxer `LICENSE`).

## Llicència del projecte

Aquest repositori es distribueix sota **GNU Affero General Public License v3.0 or later (AGPL-3.0-or-later)**.

- Copyright: `Copyright (C) 2026 Rafa Barrachina`
- Fitxer local: `LICENSE`
- URL: `https://www.gnu.org/licenses/agpl-3.0.html`
- Codi font: `https://github.com/rbarrachina/fitxa-centres-educatius`
