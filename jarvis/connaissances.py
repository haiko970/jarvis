"""La carte de connaissances : ce que Jarvis sait de l'utilisateur, rangé en points reliés entre eux.

Exemple : « Léa » ─ meilleure amie de ─► « moi », « Léa » ─ anniversaire ─► « 12 mars ».
Tout reste sur le PC, dans ~/.jarvis_connaissances.json."""

import datetime
import json
import re
import threading
import unicodedata
from pathlib import Path

from . import config

FICHIER = Path.home() / ".jarvis_connaissances.json"
TYPES = ["personne", "lieu", "ecole", "club", "jeu", "animal", "objet", "evenement", "date", "passion", "autre"]
MOI = "moi"
_lock = threading.Lock()


def _schema(properties: dict, required: list[str]) -> dict:
    return {"type": "object", "properties": properties, "required": required, "additionalProperties": False}


TOOLS = [
    {
        "name": "noter_connaissance",
        "description": (
            "Note une information durable sur l'utilisateur ou son entourage dans ta carte de connaissances, "
            "sous la forme sujet → lien → objet. Utilise « moi » pour parler de l'utilisateur. Exemples : "
            "(Léa, meilleure amie de, moi), (Léa, anniversaire le, 12 mars), (moi, joue à, Rocket League), "
            "(moi, va au lycée, Lycée Jules Verne). Appelle-le une fois par information."
        ),
        "input_schema": _schema({
            "sujet": {"type": "string"},
            "lien": {"type": "string", "description": "un verbe ou une relation courte, ex. « ami de », « habite à »"},
            "objet": {"type": "string"},
            "type_sujet": {"type": "string", "enum": TYPES},
            "type_objet": {"type": "string", "enum": TYPES},
        }, ["sujet", "lien", "objet"]),
    },
    {
        "name": "chercher_connaissance",
        "description": "Cherche tout ce que tu sais sur une personne, un lieu ou une chose dans ta carte de connaissances.",
        "input_schema": _schema({"sujet": {"type": "string"}}, ["sujet"]),
    },
    {
        "name": "oublier_connaissance",
        "description": "Efface de ta carte de connaissances un point (et tous ses liens), ou seulement un lien précis.",
        "input_schema": _schema({"sujet": {"type": "string"}, "lien": {"type": "string"}}, ["sujet"]),
    },
]


# ---------- Le fichier ----------
def _ident(name: str) -> str:
    text = unicodedata.normalize("NFD", (name or "").lower().replace("’", "'"))
    text = "".join(c for c in text if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]+", " ", text).strip()


_MOI_WORDS = {"moi", "je", "l utilisateur", "utilisateur", "toi", "me", "m"}


def _node_id(name: str) -> str:
    ident = _ident(name)
    prenom = _ident(config.load()["prenom"])
    return MOI if ident in _MOI_WORDS or (prenom and ident == prenom) else ident


def load() -> dict:
    try:
        data = json.loads(FICHIER.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        data = {}
    data.setdefault("noeuds", {})
    data.setdefault("liens", [])
    prenom = config.load()["prenom"].strip()
    data["noeuds"][MOI] = {"nom": prenom or "Moi", "type": "moi"}
    return data


def _save(data: dict) -> None:
    FICHIER.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")


def add(sujet: str, lien: str, objet: str, type_sujet: str = "", type_objet: str = "", source: str = "discussion") -> bool:
    """Ajoute un lien (et ses deux points). Renvoie False s'il existait déjà."""
    sujet, lien, objet = sujet.strip(), " ".join(lien.split()).strip(), objet.strip()
    if not (sujet and lien and objet):
        return False
    with _lock:
        data = load()
        ids = []
        for name, kind in ((sujet, type_sujet), (objet, type_objet)):
            node = _node_id(name)
            ids.append(node)
            if node not in data["noeuds"]:
                data["noeuds"][node] = {"nom": name[:1].upper() + name[1:], "type": kind if kind in TYPES else "autre"}
            elif kind in TYPES and data["noeuds"][node]["type"] == "autre":
                data["noeuds"][node]["type"] = kind
        de, vers = ids
        if de == vers:
            return False
        for l in data["liens"]:
            if l["de"] == de and l["vers"] == vers and _ident(l["rel"]) == _ident(lien):
                return False
        data["liens"].append({"de": de, "rel": lien, "vers": vers, "date": datetime.date.today().isoformat(), "source": source})
        _save(data)
    return True


def forget(sujet: str, lien: str = "") -> int:
    """Efface un point (avec ses liens) ou seulement les liens qui correspondent. Renvoie le nombre d'effacements."""
    node = find_node(sujet)
    if not node:
        return 0
    with _lock:
        data = load()
        before = len(data["liens"])
        if lien.strip():
            # « oublie que Léa joue au tennis » : le mot peut être le lien… ou l'autre bout du lien
            want = _ident(lien)

            def match(l: dict) -> bool:
                other = l["vers"] if l["de"] == node else l["de"]
                return node in (l["de"], l["vers"]) and (want in _ident(l["rel"]) or want in other or other in want)

            data["liens"] = [l for l in data["liens"] if not match(l)]
            removed = before - len(data["liens"])
        else:
            data["liens"] = [l for l in data["liens"] if node not in (l["de"], l["vers"])]
            removed = before - len(data["liens"]) + (node != MOI)
            if node != MOI:
                data["noeuds"].pop(node, None)
        # Les points qui ne sont plus reliés à rien disparaissent aussi
        used = {MOI} | {l["de"] for l in data["liens"]} | {l["vers"] for l in data["liens"]}
        data["noeuds"] = {k: v for k, v in data["noeuds"].items() if k in used}
        _save(data)
    return removed


def forget_link(de: str, rel: str, vers: str) -> None:
    with _lock:
        data = load()
        data["liens"] = [l for l in data["liens"] if not (l["de"] == de and l["rel"] == rel and l["vers"] == vers)]
        used = {MOI} | {l["de"] for l in data["liens"]} | {l["vers"] for l in data["liens"]}
        data["noeuds"] = {k: v for k, v in data["noeuds"].items() if k in used}
        _save(data)


def find_node(name: str) -> str | None:
    data = load()
    ident = _node_id(name)
    if ident in data["noeuds"]:
        return ident
    # « Léa Martin » trouve « Léa », « lycée » trouve « Lycée Jules Verne »
    candidates = [k for k in data["noeuds"] if k != MOI and (ident in k.split() or k in ident.split() or (len(ident) > 3 and ident in k))]
    return min(candidates, key=len) if candidates else None


def _fact(data: dict, l: dict) -> str:
    name = lambda k: "l'utilisateur" if k == MOI else data["noeuds"].get(k, {}).get("nom", k)
    return f"{name(l['de'])} → {l['rel']} → {name(l['vers'])}"


def about(node: str, depth: int = 2, limit: int = 30) -> list[str]:
    """Les faits autour d'un point (et de ses voisins proches)."""
    data = load()
    seen, frontier, facts = {node}, {node}, []
    for _ in range(depth):
        nxt = set()
        for l in data["liens"]:
            if l["de"] in frontier or l["vers"] in frontier:
                fact = _fact(data, l)
                if fact not in facts:
                    facts.append(fact)
                for k in (l["de"], l["vers"]):
                    if k not in seen and k != MOI:
                        seen.add(k); nxt.add(k)
        frontier = nxt
    return facts[:limit]


def context_for(text: str) -> str | None:
    """Ce que Jarvis doit avoir en tête pour répondre à cette phrase (points cités + ce qu'on sait de l'utilisateur)."""
    data = load()
    if not data["liens"]:
        return None
    phrase = f" {_ident(text)} "
    facts = []
    for node, info in data["noeuds"].items():
        if node == MOI or len(node) < 3:
            continue
        names = {node, _ident(info["nom"])}
        if any(f" {n} " in phrase for n in names) or any(len(w) > 3 and f" {w} " in phrase for w in node.split()):
            facts += [f for f in about(node, depth=1, limit=12) if f not in facts]
    if re.search(r"\b(je|j|moi|mon|ma|mes|m)\b", phrase):
        facts += [f for f in about(MOI, depth=1, limit=15) if f not in facts]
    if not facts:
        return None
    return "Extrait de ta carte de connaissances (à utiliser si c'est utile, sans le réciter) :\n" + "\n".join(f"- {f}" for f in facts[:30])


# ---------- Remplissage automatique à partir de ce que Jarvis connaît déjà ----------
def refresh_auto() -> None:
    """Ville, équipe préférée, jeux les plus joués, matières (Pronote) : mis à jour à chaque démarrage."""
    facts = []
    s = config.load()
    if s["ville"]:
        facts.append(("moi", "habite à", s["ville"], "lieu"))
    if s.get("equipe_nom") or s.get("equipe"):
        facts.append(("moi", "supporte", s.get("equipe_nom") or s["equipe"], "club"))
    try:
        from . import temps_jeu

        for g in temps_jeu.summary(30).get("jeux", [])[:5]:
            facts.append(("moi", "joue à", g["nom"], "jeu"))
    except Exception:
        pass
    try:
        from . import pronote

        if pronote.configured():
            today = datetime.date.today()
            subjects = set()
            for d in range(7):
                for lesson in pronote.lessons_data(today + datetime.timedelta(days=d)):
                    if lesson.get("matiere"):
                        subjects.add(lesson["matiere"].title())
            facts += [("moi", "a cours de", m, "ecole") for m in sorted(subjects)[:15]]
    except Exception:
        pass
    with _lock:
        data = load()
        data["liens"] = [l for l in data["liens"] if l.get("source") != "auto"]
        _save(data)
    for de, rel, vers, kind in facts:
        add(de, rel, vers, "", kind, source="auto")


# ---------- Ce que le cerveau peut faire ----------
def noter_connaissance(sujet: str, lien: str, objet: str, type_sujet: str = "", type_objet: str = "") -> str:
    if add(sujet, lien, objet, type_sujet, type_objet):
        return f"Noté dans la carte : {sujet} → {lien} → {objet}."
    return "C'était déjà dans la carte."


def chercher_connaissance(sujet: str) -> str:
    node = find_node(sujet)
    if not node:
        return f"Rien sur « {sujet} » dans la carte de connaissances."
    return f"Ce que tu sais sur {load()['noeuds'][node]['nom']} :\n" + "\n".join(f"- {f}" for f in about(node))


def oublier_connaissance(sujet: str, lien: str = "") -> str:
    n = forget(sujet, lien)
    return f"Effacé de la carte ({n} élément(s))." if n else f"Rien à effacer pour « {sujet} »."


HANDLERS = {
    "noter_connaissance": noter_connaissance,
    "chercher_connaissance": chercher_connaissance,
    "oublier_connaissance": oublier_connaissance,
}
