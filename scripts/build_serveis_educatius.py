#!/usr/bin/env python3
import csv
import io
import json
import pathlib
import urllib.request


SHEET_ID = "1l_0DXbgPhhoaHEA_oCdz2rR_6ZeVF0ZPWagyuZkOeq0"
SHEET_NAME = "Serveis"
SHEET_CSV_URL = (
    f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/gviz/tq"
    f"?tqx=out:csv&sheet={SHEET_NAME}"
)
MAP_URL = (
    "https://edumet.cat/areatac/presentacions/index_json.php"
    f"?config=ConfigTotsSEZ&id={SHEET_ID}"
)
OUTPUT_PATH = pathlib.Path("web/data/serveis-educatius.json")


def clean(value):
    return str(value or "").strip()


def split_municipalities(value):
    raw = clean(value)
    if not raw:
        return []

    parts = raw.splitlines() if "\n" in raw or "\r" in raw else raw.split(",")
    return [part.strip() for part in parts if part.strip()]


def main():
    with urllib.request.urlopen(SHEET_CSV_URL) as response:
        csv_text = response.read().decode("utf-8-sig")

    rows = csv.DictReader(io.StringIO(csv_text))
    services = []
    for row in rows:
        if clean(row.get("Tipus nomLlegendaMapa ocult")) != "SEZ":
            continue

        name = clean(row.get("SE ocult")) or clean(row.get("Nom selFiltre taula:visu"))
        if not name:
            continue

        municipalities = split_municipalities(
            row.get("Llista_municipis_zona ocult") or row.get("Municipis_zona ocult")
        )
        if not municipalities:
            municipality = clean(row.get("Municipi selFiltre ocult"))
            if municipality:
                municipalities = [municipality]

        services.append(
            {
                "code": clean(row.get("Codi_Zona ocult")),
                "sez_code": clean(row.get("Codi_SEI ocult")),
                "name": name,
                "territorial_area": clean(row.get("ST taula:visu")),
                "headquarters_municipality": clean(row.get("Municipi selFiltre ocult")),
                "district": clean(row.get("DM ocult")),
                "municipalities": municipalities,
                "web": clean(row.get("Web taula:url:visu")),
            }
        )

    services.sort(key=lambda item: (item["territorial_area"], item["code"], item["name"]))
    payload = {
        "source": {
            "map_url": MAP_URL,
            "sheet_id": SHEET_ID,
            "sheet_name": SHEET_NAME,
            "csv_url": SHEET_CSV_URL,
        },
        "services": services,
    }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {len(services)} SEZ records to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
