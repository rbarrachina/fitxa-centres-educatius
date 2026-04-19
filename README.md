# Mapes de centres educatius

Aplicació per consultar informació de centres educatius de Catalunya.

## Estat actual del projecte

El mode principal és **estàtic**:
- la web publicada a GitHub Pages carrega dades en viu des de l'API oberta `kvmv-ahh4` (Socrata),
- es pot cercar per codi o per nom de centre,
- si hi ha múltiples resultats, es mostra un llistat per triar.

També hi ha un backend `FastAPI` **opcional** per a mode servidor.

## Requisits

- Node.js 18+ (recomanat 20+)

Opcional, només si vols backend:
- Python 3.10+

## Desenvolupament frontend (mode estàtic)

Instal·la dependències i compila:

```bash
npm install
npm run build
```

Si modifiques `web/ts/fitxa-centre.ts`, torna a executar `npm run build` per regenerar `web/js/fitxa-centre.js`.

Per provar-ho en local com a web estàtica:

```bash
python3 -m http.server 8000
```

Obre: `http://127.0.0.1:8000/web/`

## GitHub Pages

El workflow publica el directori `web/` a GitHub Pages i compila TypeScript abans del deploy.

## Backend opcional (FastAPI)

Si vols usar backend propi:

```bash
pip install -r requirements.txt
python3 server.py --host 127.0.0.1 --port 8000
```

Mode desenvolupament (autoreload):

```bash
python3 server.py --host 127.0.0.1 --port 8000 --reload
```

API disponible:
- `GET /api/centre/{codi}`

Per forçar el frontend a usar backend, configura `window.MAPES_API_BASE` a `web/index.html`.
En aquest mode, la cerca per nom no està activada: el backend actual només resol consultes per codi de centre.

## Estructura

- `web/index.html`: interfície principal.
- `web/ts/fitxa-centre.ts`: lògica frontend (cerca, llistat, render, popup mapa).
- `web/js/fitxa-centre.js`: JavaScript compilat des de TypeScript.
- `main.py`, `server.py`, `scraper.py`: backend opcional.
- `.github/workflows/pages.yml`: build i desplegament de GitHub Pages.

## Llicència

Aquest projecte es distribueix sota la llicència `CC BY-SA 4.0`.
Consulta [LICENSE](/Users/rafa/Documents/Repos/Mapes/LICENSE).
