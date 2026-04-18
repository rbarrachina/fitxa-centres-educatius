# Mapes de centres educatius

Aplicacio amb backend `FastAPI` i frontend en `TypeScript` per consultar centres educatius.

## Requisits

- Python 3.10+
- Node.js 18+

## Instal·lació

```bash
pip install -r requirements.txt
npm install
```

## Compilar frontend TypeScript

```bash
npm run build
```

## Executar servidor (FastAPI)

```bash
python3 server.py --host 127.0.0.1 --port 8000
```

Mode desenvolupament (autoreload):

```bash
python3 server.py --host 127.0.0.1 --port 8000 --reload
```

Obre `http://127.0.0.1:8000` al navegador.

## API

- `GET /api/centre/{codi}`
- `GET /api/mapa-escolar/codi?nom={nom_o_text}`
- `GET /api/mapa-escolar/detall?codi={codi_centre}`

## GitHub Pages (estat actual)

- La part visual (`web/`) es pot publicar a GitHub Pages.
- Les crides `api/...` no funcionaran a Pages perquè el backend `FastAPI` (Python) no s'executa a GitHub Pages.

## Estructura

- `main.py`: app `FastAPI` (API + fitxers estàtics)
- `server.py`: llançador de `uvicorn`
- `scraper.py`: extracció de dades de centres
- `web/ts/*.ts`: codi font TypeScript del frontend
- `web/js/*.js`: JavaScript compilat
