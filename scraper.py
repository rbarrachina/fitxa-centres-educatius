import datetime as dt
import html
import json
import re
import urllib.parse
import urllib.request
from collections import OrderedDict

BASE_URL = "https://aplicacions.gestioeducativa.gencat.cat/e13_fdc/mapaProgramacio.do?centre={code}"
MAPA_ESCOLAR_TYPEAHEAD_URL = "https://mapaescolar.gencat.cat/MOE/services/centres/findTypeahead?"
NO_INFO_MARKER = "No consta informaci"


def _clean_text(raw: str) -> str:
    text = re.sub(r"<!--.*?-->", " ", raw, flags=re.S)
    text = re.sub(r"<script\b[^>]*>.*?</script>", " ", text, flags=re.S | re.I)
    text = re.sub(r"<style\b[^>]*>.*?</style>", " ", text, flags=re.S | re.I)
    text = re.sub(r"<[^>]+>", " ", text)
    text = html.unescape(text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def _strip_label(label: str) -> str:
    label = label.strip()
    if label.endswith(":"):
        label = label[:-1].strip()
    return label


def _extract_label_from_td(td_html: str) -> str | None:
    match = re.search(
        r'<span[^>]*class="[^"]*textpetitnegre[^"]*"[^>]*>(.*?)</span>',
        td_html,
        flags=re.S | re.I,
    )
    if not match:
        return None

    label = _clean_text(match.group(1))
    label = _strip_label(label)
    return label or None


def _extract_value_from_td(td_html: str) -> str:
    chunks = re.findall(
        r'<span[^>]*class="[^"]*inputtext[^"]*"[^>]*>(.*?)</span>',
        td_html,
        flags=re.S | re.I,
    )
    if chunks:
        values = [_clean_text(chunk) for chunk in chunks]
        values = [value for value in values if value]
        if values:
            return " | ".join(values)

    value = _clean_text(td_html)
    return value


def _add_field(fields: OrderedDict[str, object], label: str, value: str) -> None:
    if label not in fields:
        fields[label] = value
        return

    current = fields[label]
    if isinstance(current, str):
        if not current and value:
            fields[label] = value
            return
        if current and not value:
            return

    if isinstance(current, list):
        if not value:
            return
        if value not in current:
            current.append(value)
        return

    if current != value:
        fields[label] = [current, value]


def fetch_centre_html(centre_code: str, timeout: int = 20) -> str:
    code = centre_code.strip()
    if not re.fullmatch(r"\d{8}", code):
        raise ValueError("El codi de centre ha de tenir exactament 8 digits.")

    url = BASE_URL.format(code=urllib.parse.quote(code))
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 (compatible; MapesCentreBot/1.0)",
            "Accept-Language": "ca,es;q=0.9,en;q=0.8",
        },
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        raw = response.read()

    for encoding in ("utf-8", "latin-1", "cp1252"):
        try:
            return raw.decode(encoding)
        except UnicodeDecodeError:
            continue

    return raw.decode("latin-1", errors="replace")


def parse_centre_html(centre_code: str, html_text: str) -> dict:
    if NO_INFO_MARKER.lower() in html_text.lower():
        return {
            "requested_code": centre_code,
            "status": "not_found",
            "source_url": BASE_URL.format(code=centre_code),
            "message": "No consta informacio per aquest centre.",
            "fields": {},
        }

    info = {
        "requested_code": centre_code,
        "status": "ok",
        "source_url": BASE_URL.format(code=centre_code),
        "fetched_at": dt.datetime.now(dt.timezone.utc).isoformat(),
        "centre": {},
        "coordinates": {},
        "fields": OrderedDict(),
    }

    header_match = re.search(
        r'<td[^>]*class="info2"[^>]*>\s*(\d{8})\s*</td>\s*<td[^>]*class="info2"[^>]*>(.*?)</td>',
        html_text,
        flags=re.S | re.I,
    )
    if header_match:
        info["centre"]["code"] = header_match.group(1)
        info["centre"]["name"] = _clean_text(header_match.group(2))

    html_no_comments = re.sub(r"<!--.*?-->", " ", html_text, flags=re.S)

    rows = re.findall(r"<tr\b[^>]*>(.*?)</tr>", html_no_comments, flags=re.S | re.I)
    for row in rows:
        cells = re.findall(r"<td\b[^>]*>(.*?)</td>", row, flags=re.S | re.I)
        if len(cells) < 2:
            continue

        for idx in range(len(cells) - 1):
            label = _extract_label_from_td(cells[idx])
            if not label:
                continue

            next_cell = cells[idx + 1]
            if _extract_label_from_td(next_cell):
                continue

            value = _extract_value_from_td(next_cell)
            _add_field(info["fields"], label, value)

    x_match = re.search(
        r'<input[^>]*name="coordenadaX"[^>]*value="([^"]*)"', html_text, flags=re.I
    )
    y_match = re.search(
        r'<input[^>]*name="coordenadaY"[^>]*value="([^"]*)"', html_text, flags=re.I
    )
    if x_match:
        info["coordinates"]["x"] = x_match.group(1).strip()
    if y_match:
        info["coordinates"]["y"] = y_match.group(1).strip()

    if "Aquest centre no disposa d'imatge exterior." in html_no_comments:
        _add_field(
            info["fields"],
            "Fotografia exterior de l'edifici",
            "Aquest centre no disposa d'imatge exterior.",
        )
    if "Aquest centre no disposa d'imatge interior." in html_no_comments:
        _add_field(
            info["fields"],
            "Fotografia interior de l'edifici",
            "Aquest centre no disposa d'imatge interior.",
        )

    return info


def fetch_centre_data(centre_code: str) -> dict:
    html_text = fetch_centre_html(centre_code)
    return parse_centre_html(centre_code.strip(), html_text)


def _normalize_text(value: str) -> str:
    import unicodedata

    text = unicodedata.normalize("NFD", value or "")
    text = "".join(ch for ch in text if unicodedata.category(ch) != "Mn")
    text = re.sub(r"\s+", " ", text).strip().lower()
    return text


def fetch_mapa_escolar_codes_by_name(centre_name: str, timeout: int = 20) -> dict:
    name = (centre_name or "").strip()
    if not name:
        raise ValueError("El nom del centre es obligatori.")

    payload = {
        "nom": name,
        "codiCentre": None,
        "codiServeiTerritorial": "",
        "codiComarca": "",
        "codiMunicipi": "",
        "codiDistricte": "",
    }
    request = urllib.request.Request(
        MAPA_ESCOLAR_TYPEAHEAD_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "User-Agent": "Mozilla/5.0 (compatible; MapesCentreBot/1.0)",
            "Accept": "application/json, text/plain, */*",
            "Content-Type": "application/json",
            "Origin": "https://mapaescolar.gencat.cat",
            "Referer": "https://mapaescolar.gencat.cat/",
        },
        method="POST",
    )

    with urllib.request.urlopen(request, timeout=timeout) as response:
        raw = response.read().decode("utf-8", errors="replace")

    data = json.loads(raw or "{}")
    centres = data.get("centres") or []
    if not centres:
        return {
            "status": "not_found",
            "requested_name": name,
            "code": None,
            "matched_name": None,
            "total_matches": 0,
            "matches": [],
            "source_url": MAPA_ESCOLAR_TYPEAHEAD_URL,
        }

    normalized_input = _normalize_text(name)

    def rank(item: dict) -> tuple[int, int]:
        code = (item.get("codiCentre") or "").strip()
        result_value = _normalize_text(item.get("resultValue") or "")
        full_name = _normalize_text(item.get("nom") or "")

        exact = normalized_input in {result_value, full_name}
        starts = result_value.startswith(normalized_input) or full_name.startswith(normalized_input)
        contains = normalized_input in result_value or normalized_input in full_name
        score = 0
        if exact:
            score = 3
        elif starts:
            score = 2
        elif contains:
            score = 1
        return (score, -len(code))

    ranked = sorted(centres, key=rank, reverse=True)
    top = ranked[0]

    details = _build_centre_details(top)
    matches = []
    for centre in ranked:
        matches.append(
            {
                "code": centre.get("codiCentre"),
                "name": centre.get("nom") or centre.get("resultValue"),
                "address": centre.get("adresa"),
                "municipi": centre.get("nomMunicipi"),
            }
        )

    return {
        "status": "ok",
        "requested_name": name,
        "code": top.get("codiCentre"),
        "matched_name": top.get("nom") or top.get("resultValue"),
        "matched_municipi": top.get("nomMunicipi"),
        "details": details,
        "total_matches": len(ranked),
        "matches": matches,
        "source_url": MAPA_ESCOLAR_TYPEAHEAD_URL,
    }


def _build_centre_details(base_centre: dict) -> dict:
    details = {
        "mail": None,
        "phone": base_centre.get("telefon"),
        "web": None,
        "coord_x": base_centre.get("coordX"),
        "coord_y": base_centre.get("coordY"),
        "territorial_area_st": base_centre.get("nomSSTT"),
        "naturalesa": base_centre.get("nomNaturalesa"),
    }

    centre_code = (base_centre.get("codiCentre") or "").strip()
    if not centre_code:
        return details

    try:
        fitxa = fetch_centre_data(centre_code)
        if fitxa.get("status") == "ok":
            fields = fitxa.get("fields") or {}

            def get_field(*names: str) -> str | None:
                for name in names:
                    value = fields.get(name)
                    if isinstance(value, list):
                        value = next((v for v in value if v), None)
                    if value:
                        return str(value).strip()
                return None

            details["mail"] = get_field(
                "Correu electrònic del centre",
                "Correu electrònic departamental",
            )
            details["phone"] = details["phone"] or get_field("Telèfon del centre")
            details["web"] = get_field("URL pàgina web centre")
            details["coord_x"] = (fitxa.get("coordinates") or {}).get("x") or details["coord_x"]
            details["coord_y"] = (fitxa.get("coordinates") or {}).get("y") or details["coord_y"]
            details["territorial_area_st"] = details["territorial_area_st"] or get_field("Àrea Territorial")
            details["naturalesa"] = details["naturalesa"] or get_field("Naturalesa")
    except Exception:
        pass

    return details


def fetch_mapa_escolar_detail_by_code(centre_code: str, timeout: int = 20) -> dict:
    code = (centre_code or "").strip()
    if not re.fullmatch(r"\d{8}", code):
        raise ValueError("El codi de centre ha de tenir exactament 8 digits.")

    payload = {
        "nom": None,
        "codiCentre": code,
        "codiServeiTerritorial": "",
        "codiComarca": "",
        "codiMunicipi": "",
        "codiDistricte": "",
    }
    request = urllib.request.Request(
        MAPA_ESCOLAR_TYPEAHEAD_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "User-Agent": "Mozilla/5.0 (compatible; MapesCentreBot/1.0)",
            "Accept": "application/json, text/plain, */*",
            "Content-Type": "application/json",
            "Origin": "https://mapaescolar.gencat.cat",
            "Referer": "https://mapaescolar.gencat.cat/",
        },
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        raw = response.read().decode("utf-8", errors="replace")

    data = json.loads(raw or "{}")
    centres = data.get("centres") or []
    if not centres:
        return {
            "status": "not_found",
            "code": code,
            "matched_name": None,
            "matched_municipi": None,
            "details": {},
            "source_url": MAPA_ESCOLAR_TYPEAHEAD_URL,
        }

    selected = next((c for c in centres if (c.get("codiCentre") or "").strip() == code), centres[0])
    return {
        "status": "ok",
        "code": code,
        "matched_name": selected.get("nom") or selected.get("resultValue"),
        "matched_municipi": selected.get("nomMunicipi"),
        "details": _build_centre_details(selected),
        "source_url": MAPA_ESCOLAR_TYPEAHEAD_URL,
    }


def main() -> None:
    import argparse

    parser = argparse.ArgumentParser(description="Extreu dades d'un centre des de la fitxa de la Generalitat.")
    parser.add_argument("centre", help="Codi de centre de 8 digits")
    parser.add_argument("--pretty", action="store_true", help="Sortida JSON formatejada")
    args = parser.parse_args()

    data = fetch_centre_data(args.centre)
    if args.pretty:
        print(json.dumps(data, ensure_ascii=False, indent=2))
    else:
        print(json.dumps(data, ensure_ascii=False))


if __name__ == "__main__":
    main()
