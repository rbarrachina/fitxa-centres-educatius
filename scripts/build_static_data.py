from __future__ import annotations

import datetime as dt
import json
import re
import urllib.parse
import urllib.request
from pathlib import Path

DATASET_ID = "kvmv-ahh4"
SOCRATA_BASE = "https://analisi.transparenciacatalunya.cat"
VIEWS_API_URL = f"{SOCRATA_BASE}/api/views/{DATASET_ID}"
RESOURCE_API_URL = f"{SOCRATA_BASE}/resource/{DATASET_ID}.json"
DATASET_PUBLIC_URL = f"{SOCRATA_BASE}/d/{DATASET_ID}"
OUTPUT_PATH = Path(__file__).resolve().parents[1] / "web" / "data" / "centres.json"


def _normalize(value: str) -> str:
    import unicodedata

    text = unicodedata.normalize("NFD", value or "")
    text = "".join(ch for ch in text if unicodedata.category(ch) != "Mn")
    text = re.sub(r"[^a-zA-Z0-9]+", " ", text).strip().lower()
    return text


def _fetch_json(url: str, timeout: int = 30) -> dict | list:
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": "MapesStaticBuilder/1.0",
            "Accept": "application/json",
        },
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        raw = response.read().decode("utf-8", errors="replace")
    return json.loads(raw)


def _column_by_patterns(columns: list[dict], patterns: list[list[str]]) -> str | None:
    for column in columns:
        field_name = str(column.get("fieldName") or "").strip()
        display_name = str(column.get("name") or "").strip()
        hay = _normalize(f"{field_name} {display_name}")
        if not hay:
            continue
        for pattern in patterns:
            if all(token in hay for token in pattern):
                return field_name
    return None


def _pick_columns(columns: list[dict]) -> dict[str, str | None]:
    return {
        "code": _column_by_patterns(columns, [["codi", "centre"]]),
        "name": _column_by_patterns(columns, [["denominacio"], ["nom", "centre"]]),
        "municipi": _column_by_patterns(columns, [["nom", "municipi"], ["municipi"]]),
        "mail": _column_by_patterns(columns, [["correu"], ["mail"]]),
        "phone": _column_by_patterns(columns, [["telefon"]]),
        "web": _column_by_patterns(columns, [["url", "web"], ["pagina", "web"], ["web"]]),
        "coord_x": _column_by_patterns(columns, [["utm", "x"], ["coord", "x"]]),
        "coord_y": _column_by_patterns(columns, [["utm", "y"], ["coord", "y"]]),
        "territorial_area_st": _column_by_patterns(columns, [["servei", "territorial"], ["sstt"]]),
        "naturalesa": _column_by_patterns(columns, [["naturalesa"]]),
        "address": _column_by_patterns(columns, [["adreca"], ["adresa"]]),
    }


def _as_text(value: object) -> str:
    if value is None:
        return ""
    return str(value).strip()


def _fetch_rows(select_fields: list[str], page_size: int = 50000) -> list[dict]:
    rows: list[dict] = []
    offset = 0

    while True:
        params = {
            "$limit": str(page_size),
            "$offset": str(offset),
            "$select": ",".join(select_fields),
        }
        url = f"{RESOURCE_API_URL}?{urllib.parse.urlencode(params)}"
        page = _fetch_json(url)
        if not isinstance(page, list):
            break
        if not page:
            break

        rows.extend(page)
        if len(page) < page_size:
            break
        offset += page_size

    return rows


def _normalize_code(raw_code: str) -> str:
    code = re.sub(r"\D+", "", raw_code or "")
    if len(code) < 8:
        code = code.zfill(8)
    return code if len(code) == 8 else ""


def _prefer(new: dict, old: dict) -> dict:
    new_score = sum(1 for v in new.values() if isinstance(v, str) and v)
    old_score = sum(1 for v in old.values() if isinstance(v, str) and v)
    return new if new_score >= old_score else old


def main() -> None:
    metadata = _fetch_json(VIEWS_API_URL)
    if not isinstance(metadata, dict):
        raise RuntimeError("No s'ha pogut llegir la metadata del dataset.")

    columns = metadata.get("columns") or []
    if not isinstance(columns, list) or not columns:
        raise RuntimeError("El dataset no te la llista de columnes esperada.")

    selected_columns = _pick_columns(columns)
    required = ["code", "name"]
    missing_required = [key for key in required if not selected_columns.get(key)]
    if missing_required:
        raise RuntimeError(f"No s'han pogut identificar columnes obligatòries: {', '.join(missing_required)}")

    select_fields = sorted({field for field in selected_columns.values() if field})
    rows = _fetch_rows(select_fields=select_fields)

    by_code: dict[str, dict] = {}
    for row in rows:
        if not isinstance(row, dict):
            continue

        code = _normalize_code(_as_text(row.get(selected_columns["code"] or "")))
        if not code:
            continue

        centre = {
            "code": code,
            "name": _as_text(row.get(selected_columns["name"] or "")),
            "municipi": _as_text(row.get(selected_columns["municipi"] or "")),
            "mail": _as_text(row.get(selected_columns["mail"] or "")),
            "phone": _as_text(row.get(selected_columns["phone"] or "")),
            "web": _as_text(row.get(selected_columns["web"] or "")),
            "coord_x": _as_text(row.get(selected_columns["coord_x"] or "")),
            "coord_y": _as_text(row.get(selected_columns["coord_y"] or "")),
            "territorial_area_st": _as_text(row.get(selected_columns["territorial_area_st"] or "")),
            "naturalesa": _as_text(row.get(selected_columns["naturalesa"] or "")),
            "address": _as_text(row.get(selected_columns["address"] or "")),
            "source_url": DATASET_PUBLIC_URL,
        }

        if not centre["name"]:
            continue

        current = by_code.get(code)
        by_code[code] = _prefer(centre, current) if current else centre

    centres = sorted(by_code.values(), key=lambda item: (item["name"].lower(), item["code"]))
    payload = {
        "generated_at": dt.datetime.now(dt.timezone.utc).isoformat(),
        "source": DATASET_PUBLIC_URL,
        "dataset_id": DATASET_ID,
        "count": len(centres),
        "centres": centres,
    }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[OK] Fitxer generat: {OUTPUT_PATH} ({len(centres)} centres)")


if __name__ == "__main__":
    main()
