# Consulta de Centres Educatius de Catalunya (Dades Obertes)

Aplicació web per consultar fitxes de centres educatius de Catalunya i visualitzar-ne la ubicació sobre mapa (centre, àrea territorial, servei educatiu, comarca i municipi).

## Funcionalitats

- Cerca per codi de centre (8 dígits), nom del centre o municipi.
- Pàgina pròpia per a cada centre amb URL descriptiva formada per codi, nom i població: `/centre/XXXXXXXX-nom-centre-poblacio/`.
- Redirecció permanent de les antigues URLs basades només en el codi cap a la URL descriptiva canònica.
- Directori SEO navegable amb la jerarquia Catalunya → àrea territorial → municipi → centre.
- Índex alfabètic de tots els municipis a `/municipis/`, amb enllaços HTML cap a les pàgines municipals canòniques.
- Breadcrumbs visibles i dades estructurades `BreadcrumbList` a les pàgines del directori i a les fitxes.
- L'antic paràmetre `?codi=XXXXXXXX` redirigeix a la nova URL de la fitxa.
- Selecció de centre quan hi ha múltiples coincidències.
- Quan una cerca només té una coincidència, s'obre directament la pàgina pròpia del centre.
- Quan l'usuari torna enrere des d'una fitxa, es recuperen la consulta i els resultats anteriors.
- Fitxa amb camps principals (nom, naturalesa, titularitat, adreça, municipi, etc.).
- Botons d'acció (copiar, web, telèfon amb enllaç `tel:`, veure mapa).
- Fila `Codis` amb botó `Veure codis` per desplegar sota la fila un acordió amb els codis administratius.
- Fila `Estudis` amb botó `Veure matrícula` per desplegar sota la fila un acordió amb la matrícula d'alumnes de l'últim curs disponible.
  - Mostra `Nom ensenyament`, `Nivell`, `Matrícula` i `Grups`.
  - Ordena els resultats per INF, PRIM, SEC, BATX, FP i altres.
  - En idiomes, ordena els nivells com a bàsic, intermedi i avançat.
  - Inclou el curs de les dades, la data de l'última actualització del dataset i l'enllaç a la font.
  - Si el curs del dataset no correspon al curs escolar actual, mostra un avís `⚠️`. El curs escolar es considera de l'1 de setembre al 31 d'agost.
- Fila `Personal docent` amb el total de docents del centre en l'últim curs disponible; si no hi ha dades, mostra `Sense dades`.
  - Quan hi ha dades, el botó `Veure especialitats` desplega un acordió amb `Especialitat`, `Dotació` i `Ocupació definitiva`.
- Fila `Servei educatiu` amb el Servei Educatiu de Zona associat, botó `Web SE` quan la font en proporciona l'URL i botó `Veure mapa`.
- El camp `Nom districte municipal` només es mostra si té valor.
- Mapes integrats dins de la fitxa, just sota la fila corresponent:
  - ubicació del centre,
  - àrea territorial,
  - servei educatiu,
  - comarca,
  - municipi.
- Els controls de mapa, matrícula, codis i especialitats mostren una fletxa avall quan estan plegats i amunt quan estan desplegats. Només es permet tenir un acordió obert alhora.
- Durant la càrrega d'un mapa només es mostra l'estat de càrrega; el llenç del mapa apareix quan està preparat per evitar la sensació visual de dos panells superposats.
- Els popups no superen l'alçada de la finestra i mostren desplaçament vertical quan el contingut és llarg.

## Disseny de la interfície

La interfície utilitza un disseny minimalista i integrat a tota la finestra del navegador:

- El contingut principal no està tancat dins d'una capsa o targeta exterior; forma part directament del fons de la pàgina.
- La capçalera conté només la identitat de l'aplicació i el selector de tema, per mantenir l'accés principal net.
- L'autoria, l'any, el repositori, la llicència i els crèdits de tercers es presenten en un peu de pàgina compacte, que és la ubicació habitual per a aquesta informació secundària i legal.
- La portada prioritza una jerarquia clara: etiqueta de context, títol principal, descripció breu i cercador.
- Es manté la paleta verda original mitjançant variables CSS, amb degradats suaus i superfícies translúcides.
- Tota la interfície utilitza la tipografia variable `Inter`, allotjada localment al projecte per evitar dependències externes en temps d'execució.
- La capçalera incorpora un selector de tema clar/fosc amb icones de sol i lluna.
- En la primera visita, el tema fosc és el predeterminat; quan l'usuari el canvia, la selecció es conserva a `localStorage` amb la clau `centres-theme`.
- El tema s'aplica abans de carregar els estils per evitar un flaix de color incorrecte, i el botó actualitza l'etiqueta accessible segons l'acció disponible.
- El cercador agrupa el camp de text i l'acció principal en una única superfície visual.
- El botó `Cerca` s'inspira en la interacció `Download for Mac` d'Amicro: mostra una lupa abans del text en repòs i, en hover, la substitueix suaument per una fletxa després del text.
- El color del botó `Cerca` utilitza un verd profund amb un degradat i una ombra continguts, adaptats específicament als temes clar i fosc perquè destaqui sense desentonar amb la resta de superfícies.
- En desplaçar-se pels resultats o per una fitxa llarga, el cercador queda fixat temporalment a la part superior de la finestra per mantenir disponible una nova consulta.
- A les pàgines de centre, el nom del centre és el títol principal i el cercador adopta una disposició compacta dins de la capçalera, al costat de la marca; en mòbil ocupa una segona línia de la mateixa capçalera.
- Una cerca amb diverses coincidències feta des d'una fitxa torna a la vista normal de resultats de la portada.
- Les coincidències no tenen un desplaçament intern independent: tots els resultats formen part del desplaçament general de la pàgina.
- En iniciar una cerca vàlida, la pàgina es desplaça automàticament fins al context del cercador i els resultats; el moviment és suau excepte quan el sistema indica que cal reduir les animacions.
- El titular i la resta de la portada queden per sobre del viewport després de la cerca i tornen a aparèixer quan l'usuari es desplaça cap amunt.
- Els botons principals tenen forma de píndola, estats de focus visibles i microinteraccions breus en passar-hi el cursor o prémer-los.
- Els botons d'acció de la fitxa, dels resultats i dels popups comparteixen la mateixa forma de píndola translúcida, vora fina i resposta visual suau; el botó `Cerca` conserva més contrast com a acció principal.
- Tots aquests botons secundaris mantenen una alçada comuna de `38px`, també quan hi ha diverses accions dins de la mateixa fila.
- En el tema clar, tots els botons secundaris comparteixen el verd clar de la superfície `Web`; `Cerca` conserva el verd fosc per mantenir la jerarquia principal.
- Cada botó amb text incorpora abans una icona representativa de la seva acció. La fletxa de `Veure mapa` indica el desplegament i la de `Tria` indica l'accés a la fitxa seleccionada.
- El botó `Tria` adopta una microinteracció inspirada en `Text Reveal`: la fletxa gira 45 graus en hover i el botó escala suaument en hover i en prémer-lo, mentre el text es manté fix.
- Les taules i les llistes de coincidències conserven una estructura diferenciada per facilitar la lectura de les dades, amb vores i ombres discretes.
- En pantalles de fins a `760px`, el cercador passa a disposició vertical, el títol adapta la mida i els controls secundaris es simplifiquen.
- La interfície evita el desplaçament horitzontal en dispositius mòbils.

Els elements i identificadors que utilitza el JavaScript (`#code`, `#load`, `#message`, `#fitxaMatches` i `#resultTable`) es mantenen separats de les decisions purament visuals. Això permet continuar modificant l'estil sense alterar el funcionament de la cerca.

Els canvis de presentació es concentren principalment en:

- `web/index.html`: estructura semàntica de la capçalera, la portada, el cercador i el peu de pàgina.
- `web/css/fitxa-centre.css`: paleta, composició, components, transicions i comportament responsive.

## Arquitectura

### Frontend (principal)

- Aplicació estàtica publicable a `web/`.
- TypeScript font: `src/fitxa-centre.ts`.
- JavaScript compilat: `web/js/fitxa-centre.js`.
- Estils: `web/css/fitxa-centre.css`.
- Pàgina: `web/index.html`.
- Entrada d'arrel per desenvolupament local: `index.html`, que redirigeix a `web/`.

### Pàgines de centre i directori territorial a Vercel

- Funció: `api/centre.mjs`.
- Ruta pública: `/centre/:code-:nom-:poblacio/`.
- La funció consulta el dataset de centres en cada visita i retorna una resposta HTML que ja conté el nom, les metadades i les dades principals del centre.
- La resposta utilitza `Cache-Control: no-store`; no es conserva una còpia fixa de la fitxa.
- El JavaScript completa després les accions, els mapes, la matrícula i les especialitats docents mantenint la mateixa taula i el mateix disseny de la cerca actual.
- Un codi inexistent retorna `404`; una incidència temporal de Dades Obertes retorna `503`.
- `api/directori.mjs` genera pàgines HTML per a Catalunya, cada àrea territorial i cada municipi, amb llistes completes d’enllaços rastrejables.
- `web/index.html` incorpora directament els dos accessos compactes al directori d’àrees territorials i a l’índex de municipis, sense desplegar-hi les llistes completes.
- La portada declara dades estructurades `WebSite` perquè Google identifiqui el nom, l’idioma i la URL canònica del projecte.
- Cada fitxa declara `EducationalOrganization` amb un identificador estable, la pàgina principal de l’entitat i les dades reals disponibles de contacte, web, adreça i geolocalització.
- `api/home.mjs` serveix la mateixa portada estàtica en el servidor local de desenvolupament.
- `api/sitemap.mjs` genera el `sitemap.xml` amb la portada, el directori, les àrees territorials, els municipis i les fitxes descriptives del curs actual.

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

En el desplegament de Vercel, es pot obrir directament una fitxa concreta amb el codi de centre de 8 dígits:

`https://fitxa-centres.vercel.app/centre/08012345-institut-exemple-sabadell/`

## Modes d'execució

- Mode estàtic (principal): `npm run serve`
- Mode backend opcional (FastAPI): `npm run backend`
- Si es vol forçar ús de backend des del frontend estàtic, definir `window.MAPES_API_BASE` a `web/index.html`.

## Desplegament a Vercel

El fitxer `vercel.json` configura Vercel perquè:

- executi `npm run build` a cada desplegament;
- publiqui la carpeta estàtica `web`;
- reescrigui `/centre/:centre/` cap a la funció que genera l'HTML de la fitxa i redirigeixi els slugs antics;
- serveixi el directori territorial a `/centres/`, `/centres/:area/` i `/centres/:area/:municipi/`;
- serveixi l’índex alfabètic de municipis a `/municipis/`;
- serveixi un sitemap dinàmic amb totes les pàgines canòniques del curs actual;
- generi automàticament un nou desplegament quan la integració de GitHub detecti canvis al repositori.

La branca de producció és `main`. Les altres branques poden generar desplegaments de previsualització des de Vercel.

## Desplegament a GitHub Pages

El workflow `.github/workflows/pages.yml` executa `npm run build:github-pages`. Aquest build:

- publica la portada i els recursos estàtics sota `/fitxa-centres-educatius/`;
- genera una còpia estàtica dels directoris de Catalunya, les àrees territorials i els municipis;
- manté tots els enllaços del directori dins del domini de GitHub Pages;
- obre les fitxes dels centres al cercador estàtic de GitHub mitjançant el paràmetre `codi`.

Vercel continua generant les seves pàgines dinàmiques amb URLs pròpies i no comparteix enllaços de navegació amb GitHub Pages.

## Desenvolupament

- Qualsevol canvi a `src/fitxa-centre.ts` requereix recompilar:

```bash
npm run build
```

- Executar les proves de les pàgines generades i del sitemap:

```bash
npm test
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

3. Personal docent en centres públics de titularitat del Departament d'Educació (Socrata)
   - URL dataset: `https://analisi.transparenciacatalunya.cat/Educaci-/Personal-docent-en-centres-p-blics-titularitat-del/2ip7-jdgh/about_data`
   - API usada: `https://analisi.transparenciacatalunya.cat/resource/2ip7-jdgh.json`
   - La consulta usa només l'últim `curs` disponible i mostra el camp `total`.
   - Si no hi ha registre per al centre consultat, mostra `Sense dades`.

4. Plantilles del personal docent dels centres públics i serveis educatius (Socrata)
   - URL dataset: `https://analisi.transparenciacatalunya.cat/Educaci-/Plantilles-del-personal-docent-dels-centres-p-blic/4fid-p2hv`
   - API usada: `https://analisi.transparenciacatalunya.cat/resource/4fid-p2hv.json`
   - La consulta usa només l'últim `curs` disponible i mostra `codi_lloc_desc`, `total_dot` i `ocu_def`.
   - Només es consulta des del botó d'especialitats quan el centre té dades de personal docent.
   - Els valors enters acabats en `5` es marquen amb un avís perquè poden correspondre a dades amb el decimal absent al dataset original; el valor exacte `5` només s'avisa quan `total_dot` i `ocu_def` són tots dos `5`, i el valor `625` es tracta com a possible `0,625`.

5. Àrees territorials (fitxer local al repositori)
   - Fitxer: `web/data/serveis-territorials-simplificat.geojson`
   - Origen del recurs: `https://github.com/rbarrachina/recollida_excedent`

6. Serveis Educatius de Zona (fitxer local al repositori)
   - Fitxer: `web/data/serveis-educatius.json`
   - Origen del recurs: `https://edumet.cat/areatac/presentacions/index_json.php?config=ConfigTotsSEZ&id=1l_0DXbgPhhoaHEA_oCdz2rR_6ZeVF0ZPWagyuZkOeq0`
   - Full públic usat per generar-lo: `https://docs.google.com/spreadsheets/d/1l_0DXbgPhhoaHEA_oCdz2rR_6ZeVF0ZPWagyuZkOeq0/gviz/tq?tqx=out:csv&sheet=Serveis`
   - Regeneració: `npm run build:serveis-educatius`
   - La correspondència es fa per municipi; en el cas de Barcelona, per municipi i districte municipal.

7. Comarques (ICGC Geoserveis)
   - Endpoint: `https://geoserveis.icgc.cat/vector01/rest/services/rtpc_carrers/MapServer/5/query?where=1%3D1&outFields=NOM_COMAR&outSR=4326&f=geojson`

8. Municipis (ICGC Geoserveis)
   - Endpoint: `https://geoserveis.icgc.cat/vector01/rest/services/rtpc_carrers/MapServer/4/query?where=1%3D1&outFields=NOM_MUNI&outSR=4326&f=geojson`

9. Districtes de Barcelona (Open Data BCN)
   - Dataset: `https://opendata-ajuntament.barcelona.cat/data/ca/dataset/20170706-districtes-barris`
   - Recurs usat: `BarcelonaCiutat_Districtes.json`
   - Endpoint: `https://opendata-ajuntament.barcelona.cat/data/dataset/20170706-districtes-barris/resource/5f8974a7-7937-4b50-acbc-89204d570df9/download`
   - S'usa per pintar només el districte en els Serveis Educatius de Zona de Barcelona ciutat.

10. Cartografia base (Leaflet + OpenStreetMap tiles)
   - Leaflet CDN: `https://unpkg.com/leaflet@1.9.4/dist/leaflet.js` i `leaflet.css`
   - El CSS i el JavaScript de Leaflet es carreguen sota demanda quan l'usuari desplega el primer mapa; no bloquegen la primera pintura de la portada.
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

### 4) Dataset de personal docent (`2ip7-jdgh`)

- Metadata de l'API Socrata: `license.name = "See Terms of Use"`.
- Atribució indicada a metadata: `Departament d'Educació`.
- Enllaç d'atribució/llicències: `https://administraciodigital.gencat.cat/ca/dades/dades-obertes/informacio-practica/llicencies/`

### 5) Dataset de plantilles docents (`4fid-p2hv`)

- Metadata de l'API Socrata: `license.name = "See Terms of Use"`.
- Atribució indicada a metadata: `Departament d'Educació`.
- Enllaç d'atribució/llicències: `https://administraciodigital.gencat.cat/ca/dades/dades-obertes/informacio-practica/llicencies/`

### 6) Serveis Educatius de Zona

- Origen: mapa públic `Relació de Serveis Educatius`.
- URL: `https://edumet.cat/areatac/presentacions/index_json.php?config=ConfigTotsSEZ&id=1l_0DXbgPhhoaHEA_oCdz2rR_6ZeVF0ZPWagyuZkOeq0`
- Les condicions de reutilització depenen de la font original publicada.

### 7) Geoinformació ICGC (serveis de comarca/municipi)

- Pàgina oficial de reutilització ICGC: `https://www.icgc.cat/ca/LICGC/Informacio-publica/Transparencia/Reutilitzacio-de-la-informacio`
- Segons aquesta pàgina, la llicència general de la geoinformació ICGC és **CC BY 4.0** (amb obligació de citació de la font).

### 8) Open Data BCN (districtes de Barcelona)

- Origen: Ajuntament de Barcelona, portal Open Data BCN.
- Dataset: `https://opendata-ajuntament.barcelona.cat/data/ca/dataset/20170706-districtes-barris`
- Recurs: `BarcelonaCiutat_Districtes.json`.
- Cal revisar la fitxa del dataset per confirmar les condicions de reutilització vigents.

### 9) OpenStreetMap (cartografia base)

- Llicència de les dades: **Open Data Commons Open Database License (ODbL)**.
- Pàgina oficial: `https://www.openstreetmap.org/copyright`
- Cal mantenir atribució a OpenStreetMap contributors.

### 10) Leaflet

- Llicència: **BSD 2-Clause**.
- Fitxer oficial de llicència: `https://github.com/Leaflet/Leaflet/blob/main/LICENSE`

### 11) Fitxer territorial local (`serveis-territorials-simplificat.geojson`)

- Origen: repositori `rbarrachina/recollida_excedent`.
- El repositori inclou llicència **CC BY-SA 4.0** (fitxer `LICENSE`).

### 12) Tipografia Inter

- Família tipogràfica: **Inter Variable**.
- Origen: projecte oficial d'[Inter](https://github.com/rsms/inter).
- Llicència: **SIL Open Font License 1.1 (OFL-1.1)**.
- Fitxer de font local: `web/assets/fonts/inter/InterVariable.woff2`.
- Còpia local de la llicència: `web/assets/fonts/inter/OFL.txt`.

## Llicència del projecte

Aquest repositori es distribueix sota **GNU Affero General Public License v3.0 or later (AGPL-3.0-or-later)**.

- Copyright: `Copyright (C) 2026 Rafa Barrachina`
- Fitxer local: `LICENSE`
- URL: `https://www.gnu.org/licenses/agpl-3.0.html`
- Codi font: `https://github.com/rbarrachina/fitxa-centres-educatius`
