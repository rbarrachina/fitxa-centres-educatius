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

## Estructura

- `web/index.html`: interfície principal.
- `web/ts/fitxa-centre.ts`: lògica frontend (cerca, llistat, render, popup mapa).
- `web/js/fitxa-centre.js`: JavaScript compilat des de TypeScript.
- `main.py`, `server.py`, `scraper.py`: backend opcional.
- `.github/workflows/pages.yml`: build i desplegament de GitHub Pages.
