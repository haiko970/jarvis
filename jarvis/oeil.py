"""L'œil de Jarvis : la planète en direct sur la Terre de Jarvis.

Toutes les données sont réelles et viennent de sources publiques :
- ✈️ avions : adsb.lol (signaux ADS-B captés par des bénévoles), sans clé ;
- 🎖️ avions militaires du monde entier : adsb.lol, sans clé ;
- 🚢 bateaux : AISstream (monde entier, clé gratuite) et Digitraffic (Finlande et Baltique, sans clé) ;
- 🛰️ satellites : orbites de CelesTrak, calculées par Jarvis (même méthode que pour l'ISS) ;
- 🌋 séismes : USGS (institut géologique américain), mis à jour chaque minute ;
- 📷 caméras publiques : Londres (TfL), Finlande (Digitraffic), et le monde entier avec Windy (clé gratuite).

Les avions et les bateaux sont demandés autour de l'endroit que tu regardes sur la Terre
(les services gratuits ne donnent pas toute la planète d'un coup)."""

import datetime
import json
import math
import threading
import time
from pathlib import Path

import httpx

from . import ciel, config

AGENT = {"User-Agent": "Jarvis (assistant personnel)", "Digitraffic-User": "Jarvis"}
RAYON_NM = 250  # rayon de la zone des avions, en milles nautiques (le maximum d'adsb.lol, ~460 km)
SAT_GROUPES = {  # nom dans Jarvis → groupe CelesTrak
    "principaux": ["stations", "visual"],
    "starlink": ["starlink"],
    "gps": ["gnss"],
    "meteo": ["weather"],
    "tous": ["active"],
}
SAT_FICHIER = Path.home() / ".jarvis_satellites.json"  # orbites gardées 6 h (CelesTrak demande de ne pas abuser)

_cache: dict = {}
_verrou = threading.Lock()


def _get(url: str, headers: dict | None = None, timeout: float = 15):
    r = httpx.get(url, headers={**AGENT, **(headers or {})}, timeout=timeout, follow_redirects=True)
    r.raise_for_status()
    return r


def _cached(cle: str, duree: float, fabrique):
    """Garde un résultat quelques secondes pour ne pas surcharger les services gratuits."""
    with _verrou:
        item = _cache.get(cle)
        if item and time.time() - item[0] < duree:
            return item[1]
    try:
        valeur = fabrique()
    except Exception:
        if item:  # le service ne répond pas : on garde la dernière réponse
            return item[1]
        raise
    with _verrou:
        _cache[cle] = (time.time(), valeur)
    return valeur


# ---------- ✈️ Avions ----------
def _avion(a: dict) -> dict | None:
    if a.get("lat") is None or a.get("lon") is None:
        return None
    alt = a.get("alt_baro")
    return {
        "id": a.get("hex", ""),
        "vol": (a.get("flight") or "").strip(),
        "immat": a.get("r", ""),
        "modele": a.get("t", ""),
        "lat": round(a["lat"], 4),
        "lon": round(a["lon"], 4),
        "alt": 0 if alt == "ground" else round((alt or a.get("alt_geom") or 0) * 0.3048),  # en mètres
        "sol": alt == "ground",
        "vitesse": round((a.get("gs") or 0) * 1.852),  # en km/h
        "cap": a.get("track") if a.get("track") is not None else a.get("true_heading"),
        "age": a.get("seen_pos", 0),  # secondes depuis la dernière position
        "urgence": a.get("emergency") not in (None, "none"),
    }


def avions(lat: float, lon: float, rayon_nm: int = RAYON_NM) -> dict:
    lat, lon = round(lat * 2) / 2, round(lon * 2) / 2  # zones d'un demi-degré : le cache sert à tout le monde

    def fabrique():
        d = _get(f"https://api.adsb.lol/v2/lat/{lat}/lon/{lon}/dist/{rayon_nm}").json()
        return [p for p in map(_avion, d.get("ac") or []) if p]

    return {"centre": [lat, lon], "zones": [[lat, lon]], "rayon_km": round(rayon_nm * 1.852), "heure": time.time(),
            "avions": _cached(f"avions:{lat}:{lon}:{rayon_nm}", 8, fabrique)}


def _point(lat: float, lon: float, cap: float, km: float) -> tuple[float, float]:
    """Le point à « km » kilomètres dans la direction « cap » (en degrés)."""
    d, c, p1, l1 = km / 6371, math.radians(cap), math.radians(lat), math.radians(lon)
    p2 = math.asin(math.sin(p1) * math.cos(d) + math.cos(p1) * math.sin(d) * math.cos(c))
    l2 = l1 + math.atan2(math.sin(c) * math.sin(d) * math.cos(p1), math.cos(d) - math.sin(p1) * math.sin(p2))
    return math.degrees(p2), (math.degrees(l2) + 540) % 360 - 180


def avions_large(lat: float, lon: float) -> dict:
    """Les avions sur une grande zone (~3 000 km) : 7 zones voisines demandées en même temps."""
    from concurrent.futures import ThreadPoolExecutor

    centres = [(lat, lon)] + [_point(lat, lon, cap, 780) for cap in range(0, 360, 60)]
    with ThreadPoolExecutor(max_workers=7) as pool:
        zones = list(pool.map(lambda c: _zone_sure(*c), centres))
    vus, tous = set(), []
    for z in zones:
        for a in z.get("avions", []):
            if a["id"] not in vus:
                vus.add(a["id"]); tous.append(a)
    ok = [z for z in zones if "avions" in z]
    if not ok:
        raise RuntimeError(zones[0].get("erreur", "adsb.lol ne répond pas"))
    return {"centre": [lat, lon], "zones": [z["centre"] for z in ok], "rayon_km": round(RAYON_NM * 1.852),
            "heure": time.time(), "avions": tous}


def _zone_sure(lat: float, lon: float) -> dict:
    try:
        return avions(max(-85, min(85, lat)), lon)
    except Exception as e:
        return {"erreur": str(e)}


def avions_militaires() -> dict:
    def fabrique():
        d = _get("https://api.adsb.lol/v2/mil").json()
        return [p for p in map(_avion, d.get("ac") or []) if p]

    return {"heure": time.time(), "avions": _cached("mil", 15, fabrique)}


# ---------- 🌋 Séismes ----------
def seismes() -> dict:
    def fabrique():
        d = _get("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson").json()
        out = []
        for f in d.get("features", []):
            p, c = f["properties"], f["geometry"]["coordinates"]
            if p.get("mag") is None:
                continue
            out.append({"id": f.get("id"), "lat": c[1], "lon": c[0], "profondeur": round(c[2] or 0),
                        "mag": round(p["mag"], 1), "lieu": p.get("place") or "", "heure": p["time"] / 1000,
                        "tsunami": bool(p.get("tsunami")), "lien": p.get("url", "")})
        return sorted(out, key=lambda s: -s["mag"])

    return {"heure": time.time(), "seismes": _cached("seismes", 60, fabrique)}


# ---------- 🛰️ Satellites ----------
_sat_objets: dict = {}  # groupe CelesTrak → (heure, [(nom, Satrec)])


def _orbites(groupe: str) -> list[tuple[str, str, str]]:
    """Les orbites (TLE) d'un groupe CelesTrak, gardées 6 heures sur le disque."""
    try:
        disque = json.loads(SAT_FICHIER.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        disque = {}
    item = disque.get(groupe)
    if item and time.time() - item["heure"] < 6 * 3600:
        return item["tle"]
    try:
        texte = _get(f"https://celestrak.org/NORAD/elements/gp.php?GROUP={groupe}&FORMAT=TLE", timeout=30).text
        lignes = [l.rstrip() for l in texte.splitlines() if l.strip()]
        tle = [(lignes[i].strip(), lignes[i + 1], lignes[i + 2]) for i in range(0, len(lignes) - 2, 3)
               if lignes[i + 1].startswith("1 ") and lignes[i + 2].startswith("2 ")]
        if not tle:
            raise ValueError("réponse vide")
        disque[groupe] = {"heure": time.time(), "tle": tle}
        SAT_FICHIER.write_text(json.dumps(disque), encoding="utf-8")
        return tle
    except Exception:
        if item:  # pas d'internet : les orbites de la veille restent bonnes
            return item["tle"]
        raise


def _satrecs(groupe: str) -> list:
    from sgp4.api import Satrec

    item = _sat_objets.get(groupe)
    if item and time.time() - item[0] < 3600:
        return item[1]
    objets = []
    for nom, l1, l2 in _orbites(groupe):
        try:
            objets.append((nom, int(l1[2:7]), Satrec.twoline2rv(l1, l2)))
        except Exception:
            continue
    _sat_objets[groupe] = (time.time(), objets)
    return objets


def _position(sat, jd: float) -> tuple[float, float, float] | None:
    day = math.floor(jd - 0.5) + 0.5
    erreur, r, _ = sat.sgp4(day, jd - day)
    if erreur:
        return None
    g = ciel._sidereal(jd)
    x, y = math.cos(g) * r[0] + math.sin(g) * r[1], -math.sin(g) * r[0] + math.cos(g) * r[1]
    lon = math.degrees(math.atan2(y, x))
    lat = math.degrees(math.atan2(r[2], math.hypot(x, y)))
    return round(lat, 3), round((lon + 540) % 360 - 180, 3), round(math.sqrt(sum(c * c for c in r)) - ciel.EARTH_RADIUS)


def satellites(nom: str = "principaux") -> dict:
    """Où sont les satellites maintenant et dans une minute (la page fait glisser entre les deux)."""
    groupes = SAT_GROUPES.get(nom, SAT_GROUPES["principaux"])

    def fabrique():
        maintenant = datetime.datetime.now(datetime.timezone.utc)
        jd0 = ciel._julian(maintenant)
        jd1 = ciel._julian(maintenant + datetime.timedelta(minutes=1))
        vus, out = set(), []
        for groupe in groupes:
            for nom_sat, numero, sat in _satrecs(groupe):
                if numero in vus:
                    continue
                vus.add(numero)
                a, b = _position(sat, jd0), _position(sat, jd1)
                if a and b:
                    out.append([nom_sat, a[0], a[1], a[2], b[0], b[1], numero])
        return {"t0": maintenant.timestamp(), "satellites": out}

    return {"groupe": nom, **_cached(f"sat:{nom}", 20, fabrique)}


# ---------- Distances ----------
def _distance_km(lat1, lon1, lat2, lon2) -> float:
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 6371 * 2 * math.asin(math.sqrt(a))


# ---------- 🚢 Bateaux ----------
class _AISStream:
    """Connexion permanente à AISstream : les bateaux arrivent en direct dans la zone regardée."""

    def __init__(self):
        self.bateaux: dict = {}
        self.zone = None  # (lat, lon) du centre demandé
        self.demande = 0.0  # dernière fois que la page a demandé des bateaux
        self.erreur = ""
        self.ws = None
        self.thread = None

    def voir(self, lat: float, lon: float) -> None:
        self.demande = time.time()
        if self.zone is None or abs(lat - self.zone[0]) > 4 or abs(((lon - self.zone[1] + 540) % 360) - 180) > 6:
            self.zone = (lat, lon)
            if self.ws:  # nouvelle zone : on se réabonne
                try:
                    self.ws.close()
                except Exception:
                    pass
        if not self.thread or not self.thread.is_alive():
            self.thread = threading.Thread(target=self._boucle, daemon=True)
            self.thread.start()

    def _boucle(self) -> None:
        import websocket

        while time.time() - self.demande < 180:  # personne ne regarde depuis 3 min : on coupe
            cle = config.get_secret("aisstream_cle")
            if not cle:
                self.erreur = "pas de clé"
                return
            lat, lon = self.zone
            boite = [[max(-90, lat - 9), lon - 14], [min(90, lat + 9), lon + 14]]
            try:
                self.ws = websocket.create_connection("wss://stream.aisstream.io/v0/stream", timeout=20)
                self.ws.send(json.dumps({"APIKey": cle, "BoundingBoxes": [boite],
                                         "FilterMessageTypes": ["PositionReport", "ShipStaticData",
                                                                "StandardClassBPositionReport"]}))
                self.erreur = ""
                while time.time() - self.demande < 180 and self.zone == (lat, lon):
                    self._message(json.loads(self.ws.recv()))
            except Exception as e:
                if self.zone == (lat, lon):
                    self.erreur = str(e) or "connexion coupée"
                    time.sleep(5)
            finally:
                try:
                    self.ws.close()
                except Exception:
                    pass
                self.ws = None

    def _message(self, m: dict) -> None:
        if "error" in m:
            raise RuntimeError(m["error"])
        meta = m.get("MetaData") or {}
        mmsi = meta.get("MMSI")
        if not mmsi:
            return
        b = self.bateaux.setdefault(mmsi, {"id": mmsi})
        b["nom"] = (meta.get("ShipName") or b.get("nom") or "").strip()
        if meta.get("latitude") is not None:
            b["lat"], b["lon"] = round(meta["latitude"], 4), round(meta["longitude"], 4)
        corps = (m.get("Message") or {}).get(m.get("MessageType"), {})
        if "Sog" in corps:
            b["vitesse"] = round(corps["Sog"] * 1.852, 1)
            b["cap"] = corps.get("TrueHeading") if corps.get("TrueHeading", 511) != 511 else corps.get("Cog")
        if m.get("MessageType") == "ShipStaticData":
            b["destination"] = (corps.get("Destination") or "").strip()
            b["genre"] = corps.get("Type")
        b["heure"] = time.time()

    def liste(self) -> list:
        limite = time.time() - 900  # on oublie les bateaux muets depuis 15 minutes
        for mmsi in [k for k, b in self.bateaux.items() if b.get("heure", 0) < limite]:
            del self.bateaux[mmsi]
        return [b for b in self.bateaux.values() if "lat" in b]


_ais = _AISStream()


def _bateaux_digitraffic() -> list:
    def fabrique():
        noms = {v["mmsi"]: v for v in _get("https://meri.digitraffic.fi/api/ais/v1/vessels").json()}
        out = []
        for f in _get("https://meri.digitraffic.fi/api/ais/v1/locations").json().get("features", []):
            p, (lon, lat) = f["properties"], f["geometry"]["coordinates"][:2]
            v = noms.get(p["mmsi"], {})
            cap = p.get("heading") if p.get("heading", 511) != 511 else p.get("cog")
            out.append({"id": p["mmsi"], "nom": (v.get("name") or "").strip(), "lat": round(lat, 4), "lon": round(lon, 4),
                        "vitesse": round((p.get("sog") or 0) * 1.852, 1), "cap": cap, "genre": v.get("shipType"),
                        "destination": (v.get("destination") or "").strip(), "heure": p.get("timestampExternal", 0) / 1000})
        return out

    return _cached("digitraffic", 30, fabrique)


def bateaux(lat: float, lon: float) -> dict:
    info = {"heure": time.time(), "sources": [], "bateaux": []}
    vus = set()
    if config.get_secret("aisstream_cle"):
        _ais.voir(lat, lon)
        info["sources"].append("AISstream")
        info["erreur"] = _ais.erreur
        for b in _ais.liste():
            vus.add(b["id"])
            info["bateaux"].append(b)
    try:
        for b in _bateaux_digitraffic():
            if b["id"] not in vus:
                info["bateaux"].append(b)
        info["sources"].append("Digitraffic")
    except Exception:
        pass
    return info


# ---------- 📷 Caméras publiques ----------
def _cameras_tfl() -> list:
    def fabrique():
        out = []
        for c in _get("https://api.tfl.gov.uk/Place/Type/JamCam", timeout=30).json():
            props = {p["key"]: p["value"] for p in c.get("additionalProperties", [])}
            if props.get("available") == "false" or not props.get("imageUrl"):
                continue
            out.append({"id": c["id"], "nom": c.get("commonName", ""), "lat": c["lat"], "lon": c["lon"],
                        "image": props["imageUrl"], "video": props.get("videoUrl", ""), "source": "TfL Londres"})
        return out

    return _cached("cam:tfl", 3600, fabrique)


def _cameras_finlande() -> list:
    def fabrique():
        out = []
        for f in _get("https://tie.digitraffic.fi/api/weathercam/v1/stations", timeout=30).json().get("features", []):
            p = f["properties"]
            presets = [x["id"] for x in p.get("presets", []) if x.get("inCollection", True)]
            if not presets or p.get("collectionStatus") == "REMOVED_PERMANENTLY":
                continue
            lon, lat = f["geometry"]["coordinates"][:2]
            out.append({"id": p["id"], "nom": p.get("name", "").replace("_", " "), "lat": lat, "lon": lon,
                        "image": f"https://weathercam.digitraffic.fi/{presets[0]}.jpg",
                        "vues": [f"https://weathercam.digitraffic.fi/{x}.jpg" for x in presets], "source": "Digitraffic Finlande"})
        return out

    return _cached("cam:fin", 3600, fabrique)


def _cameras_windy(lat: float, lon: float) -> list:
    cle = config.get_secret("windy_cle")
    if not cle:
        return []
    lat, lon = round(lat), round(lon)

    def fabrique():
        r = _get(f"https://api.windy.com/webcams/api/v3/webcams?nearby={lat},{lon},250&limit=50"
                 "&include=images,location,player", headers={"x-windy-api-key": cle}).json()
        out = []
        for w in r.get("webcams", []):
            loc, img, player = w.get("location") or {}, (w.get("images") or {}).get("current") or {}, w.get("player") or {}
            if loc.get("latitude") is None:
                continue
            out.append({"id": f"windy-{w.get('webcamId')}", "nom": w.get("title", ""), "lat": loc["latitude"],
                        "lon": loc["longitude"], "image": img.get("preview") or img.get("thumbnail") or "",
                        "lecteur": player.get("live") or player.get("day") or "", "source": "Windy"})
        return out

    return _cached(f"cam:windy:{lat}:{lon}", 540, fabrique)  # les liens d'images Windy expirent après 10 min


def cameras(lat: float | None = None, lon: float | None = None) -> dict:
    out, erreurs = [], []
    for nom, f in (("Londres", _cameras_tfl), ("Finlande", _cameras_finlande)):
        try:
            out += f()
        except Exception as e:
            erreurs.append(f"{nom} : {e}")
    if lat is not None:
        try:
            out += _cameras_windy(lat, lon)
        except Exception as e:
            erreurs.append(f"Windy : {e}")
    return {"cameras": out, "windy": bool(config.get_secret("windy_cle")), "erreurs": erreurs}


def cles_ok() -> dict:
    return {"aisstream": bool(config.get_secret("aisstream_cle")), "windy": bool(config.get_secret("windy_cle"))}


# ---------- Ce que Jarvis peut répondre à voix haute ----------
TOOLS = [
    {
        "name": "avions_au_dessus",
        "description": "Les avions qui volent en ce moment au-dessus de chez l'utilisateur (données réelles en direct).",
        "input_schema": {"type": "object", "properties": {}, "required": [], "additionalProperties": False},
    },
    {
        "name": "seismes_recents",
        "description": "Les tremblements de terre des dernières 24 heures dans le monde (données réelles de l'USGS).",
        "input_schema": {"type": "object", "properties": {}, "required": [], "additionalProperties": False},
    },
]

DIRECTIONS = ["nord", "nord-est", "est", "sud-est", "sud", "sud-ouest", "ouest", "nord-ouest"]


def _avions_au_dessus() -> str:
    lat, lon, ville = ciel._coords()
    proches = []
    for a in avions(lat, lon, 40)["avions"]:
        if a["sol"]:
            continue
        d = _distance_km(lat, lon, a["lat"], a["lon"])
        cap = math.degrees(math.atan2(math.radians(a["lon"] - lon) * math.cos(math.radians(lat)), math.radians(a["lat"] - lat)))
        proches.append((d, DIRECTIONS[round(cap / 45) % 8], a))
    proches.sort(key=lambda x: x[0])
    if not proches:
        return f"Aucun avion repéré en ce moment à moins de 75 km de {ville}."
    lignes = [f"{len(proches)} avion(s) en vol à moins de 75 km de {ville}. Les plus proches :"]
    for d, direction, a in proches[:6]:
        nom = a["vol"] or a["immat"] or a["id"]
        lignes.append(f"- {nom} ({a['modele'] or 'modèle inconnu'}) à {round(d)} km au {direction}, "
                      f"{a['alt']} m d'altitude, {a['vitesse']} km/h")
    return "\n".join(lignes)


def _seismes_recents() -> str:
    liste = seismes()["seismes"]
    if not liste:
        return "Aucun séisme enregistré ces dernières 24 heures."
    texte = [f"{len(liste)} séismes enregistrés dans le monde ces dernières 24 heures. Les plus forts :"]
    for s in liste[:4]:
        heure = datetime.datetime.fromtimestamp(s["heure"]).strftime("%H h %M")
        texte.append(f"- magnitude {s['mag']} : {s['lieu']} (à {heure}, {s['profondeur']} km de profondeur)"
                     + (" — alerte tsunami" if s["tsunami"] else ""))
    try:
        lat, lon, ville = ciel._coords()
        d, s = min((_distance_km(lat, lon, s["lat"], s["lon"]), s) for s in liste)
        texte.append(f"Le plus proche de {ville} : magnitude {s['mag']}, {s['lieu']}, à {round(d)} km.")
    except Exception:
        pass
    return "\n".join(texte)


HANDLERS = {"avions_au_dessus": _avions_au_dessus, "seismes_recents": _seismes_recents}
