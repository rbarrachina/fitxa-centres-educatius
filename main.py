from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from scraper import (
    fetch_centre_data,
    fetch_mapa_escolar_codes_by_name,
    fetch_mapa_escolar_detail_by_code,
)

BASE_DIR = Path(__file__).resolve().parent
WEB_DIR = BASE_DIR / "web"

app = FastAPI(title="Mapes de Centres Educatius")


@app.get("/api/centre/{centre_code}")
def get_centre(centre_code: str):
    try:
        data = fetch_centre_data(centre_code)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=502, detail=f"Error recuperant dades: {exc}") from exc

    status_code = 200 if data.get("status") == "ok" else 404
    return JSONResponse(content=data, status_code=status_code)


@app.get("/api/mapa-escolar/codi")
def get_mapa_escolar_code(nom: str = Query(default="", description="Nom del centre")):
    try:
        data = fetch_mapa_escolar_codes_by_name((nom or "").strip())
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=502, detail=f"Error recuperant dades de mapa escolar: {exc}") from exc

    status_code = 200 if data.get("status") == "ok" else 404
    return JSONResponse(content=data, status_code=status_code)


@app.get("/api/mapa-escolar/detall")
def get_mapa_escolar_detail(codi: str = Query(default="", description="Codi de centre")):
    try:
        data = fetch_mapa_escolar_detail_by_code((codi or "").strip())
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=502, detail=f"Error recuperant detall de mapa escolar: {exc}") from exc

    status_code = 200 if data.get("status") == "ok" else 404
    return JSONResponse(content=data, status_code=status_code)


app.mount("/", StaticFiles(directory=str(WEB_DIR), html=True), name="web")
