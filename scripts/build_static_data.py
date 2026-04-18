from __future__ import annotations

import datetime as dt
import json
import re
import urllib.parse
import urllib.request
from pathlib import Path

DATASET_ID = "kvmv-ahh4"
SOCRATA_BASE = "https://analisi.transparenciacatalunya.cat"
RESOURCE_API_URL = f"{SOCRATA_BASE}/resource/{DATASET_ID}.json"
DATASET_PUBLIC_URL = f"{SOCRATA_BASE}/d/{DATASET_ID}"
OUTPUT_PATH = Path(__file__).resolve().parents[1] / "web" / "data" / "centres.json"

SELECT_FIELDS = [
    "curs",
    "any",
    "codi_centre",
    "denominaci_completa",
    "codi_naturalesa",
    "nom_naturalesa",
    "codi_titularitat",
    "nom_titularitat",
    "adre_a",
    "codi_postal",
    "tel_fon",
    "codi_delegaci",
    "nom_delegaci",
    "codi_comarca",
    "nom_comarca",
    "codi_municipi",
    "codi_municipi_6",
    "nom_municipi",
    "codi_districte_municipal",
    "nom_dm",
    "codi_localitat",
    "nom_localitat",
    "coordenades_utm_x",
    "coordenades_utm_y",
    "coordenades_geo_x",
    "coordenades_geo_y",
    "e_mail_centre",
    "url",
    "imatge",
    "einf1c",
    "einf2c",
    "epri",
    "eso",
    "batx",
    "aa01",
    "cfpm",
    "ppas",
    "aa03",
    "cfps",
    "ee",
    "ife",
    "pfi",
    "pa01",
    "cfam",
    "pa02",
    "cfas",
    "esdi",
    "escm",
    "escs",
    "adr",
    "crbc",
    "idi",
    "dane",
    "danp",
    "dans",
    "muse",
    "musp",
    "muss",
    "tegm",
    "tegs",
    "estr",
    "adults",
    "geo_1",
]


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


def _as_text(value: object) -> str:
    if value is None:
        return ""
    return str(value).strip()


def _fetch_rows(page_size: int = 50000) -> list[dict]:
    rows: list[dict] = []
    offset = 0

    select_sql = ", ".join(SELECT_FIELDS)
    while True:
        query = (
            f"SELECT {select_sql} "
            "WHERE codi_centre IS NOT NULL "
            f"ORDER BY any DESC, curs DESC LIMIT {page_size} OFFSET {offset}"
        )
        url = f"{RESOURCE_API_URL}?{urllib.parse.urlencode({'$query': query})}"
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


def _merge_prefer_latest(base: dict, older: dict) -> dict:
    merged = dict(base)
    for key, old_value in older.items():
        if key in {"_any", "_curs"}:
            continue
        if not merged.get(key) and old_value:
            merged[key] = old_value
    return merged


def _to_int(value: str) -> int:
    try:
        return int((value or "").strip())
    except Exception:
        return 0


def main() -> None:
    rows = _fetch_rows()

    by_code: dict[str, dict] = {}
    for row in rows:
        if not isinstance(row, dict):
            continue

        code = _normalize_code(_as_text(row.get("codi_centre")))
        if not code:
            continue

        year = _to_int(_as_text(row.get("any")))
        cours = _to_int(_as_text(row.get("curs")))

        address_main = _as_text(row.get("adre_a"))
        postal_code = _as_text(row.get("codi_postal"))
        address = address_main
        if address_main and postal_code:
            address = f"{address_main} ({postal_code})"

        centre = {
            "code": code,
            "name": _as_text(row.get("denominaci_completa")),
            "municipi": _as_text(row.get("nom_municipi")),
            "mail": _as_text(row.get("e_mail_centre")),
            "phone": _as_text(row.get("tel_fon")),
            "web": _as_text(row.get("url")),
            "coord_x": _as_text(row.get("coordenades_utm_x")),
            "coord_y": _as_text(row.get("coordenades_utm_y")),
            "territorial_area_st": _as_text(row.get("nom_delegaci")),
            "naturalesa": _as_text(row.get("nom_naturalesa")),
            "address": address,
            "source_url": DATASET_PUBLIC_URL,
            "_any": year,
            "_curs": cours,
        }

        if not centre["name"]:
            continue

        current = by_code.get(code)
        if not current:
            by_code[code] = centre
            continue

        current_rank = (int(current.get("_any", 0)), int(current.get("_curs", 0)))
        new_rank = (year, cours)
        if new_rank > current_rank:
            by_code[code] = _merge_prefer_latest(centre, current)
        elif new_rank == current_rank:
            by_code[code] = _merge_prefer_latest(current, centre)
        else:
            by_code[code] = _merge_prefer_latest(current, centre)

    centres = sorted(by_code.values(), key=lambda item: (item["name"].lower(), item["code"]))
    for centre in centres:
        centre.pop("_any", None)
        centre.pop("_curs", None)

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
