"""Jeux installés (Steam et Epic Games) : les trouver et les lancer à la voix."""

import difflib
import glob
import json
import os
import platform
import re
import unicodedata
from pathlib import Path


def _schema(properties: dict, required: list[str]) -> dict:
    return {"type": "object", "properties": properties, "required": required, "additionalProperties": False}


TOOLS = [
    {
        "name": "lancer_jeu",
        "description": "Lance un jeu vidéo installé sur Steam ou Epic Games (ex. « Rocket League », « Fortnite »).",
        "input_schema": _schema({"nom": {"type": "string"}}, ["nom"]),
    },
    {
        "name": "lister_jeux",
        "description": "Liste les jeux vidéo installés sur l'ordinateur (Steam et Epic Games).",
        "input_schema": _schema({}, []),
    },
]

# Outils de Steam qui ne sont pas des jeux
NOT_GAMES = re.compile(r"redistributable|steamworks|proton|steam linux runtime|soundtrack|dedicated server|sdk", re.I)


def _simple(text: str) -> str:
    text = unicodedata.normalize("NFD", text.lower())
    text = "".join(c for c in text if unicodedata.category(c) != "Mn")
    text = re.sub(r"[^a-z0-9]+", " ", text).strip()
    # Chiffres romains → chiffres, pour que « gta 5 » trouve « Grand Theft Auto V »
    romans = {"ii": "2", "iii": "3", "iv": "4", "v": "5", "vi": "6", "vii": "7", "viii": "8", "ix": "9", "x": "10"}
    return " ".join(romans.get(w, w) for w in text.split())


def _steam_root() -> Path | None:
    candidates = []
    if platform.system() == "Windows":
        try:
            import winreg

            with winreg.OpenKey(winreg.HKEY_CURRENT_USER, r"Software\Valve\Steam") as key:
                candidates.append(winreg.QueryValueEx(key, "SteamPath")[0])
        except OSError:
            pass
        candidates += [r"C:\Program Files (x86)\Steam", r"C:\Program Files\Steam"]
    else:
        candidates += [str(Path.home() / ".steam/steam"), str(Path.home() / ".local/share/Steam")]
    return next((Path(c) for c in candidates if c and Path(c).exists()), None)


def steam_games() -> list[dict]:
    root = _steam_root()
    if not root:
        return []
    libraries = {root}
    vdf = root / "steamapps" / "libraryfolders.vdf"
    if vdf.exists():
        text = vdf.read_text(encoding="utf-8", errors="replace")
        libraries |= {Path(p.replace("\\\\", "\\")) for p in re.findall(r'"path"\s+"([^"]+)"', text)}
    games = []
    for library in libraries:
        for manifest in glob.glob(str(library / "steamapps" / "appmanifest_*.acf")):
            text = Path(manifest).read_text(encoding="utf-8", errors="replace")
            appid, name = re.search(r'"appid"\s+"(\d+)"', text), re.search(r'"name"\s+"([^"]+)"', text)
            if appid and name and not NOT_GAMES.search(name[1]):
                games.append({"nom": name[1], "source": "Steam", "uri": f"steam://rungameid/{appid[1]}"})
    return games


def epic_games() -> list[dict]:
    folder = Path(os.environ.get("PROGRAMDATA", r"C:\ProgramData")) / "Epic" / "EpicGamesLauncher" / "Data" / "Manifests"
    games = []
    for item in glob.glob(str(folder / "*.item")):
        try:
            data = json.loads(Path(item).read_text(encoding="utf-8", errors="replace"))
        except ValueError:
            continue
        if data.get("bIsIncompleteInstall") or not data.get("DisplayName"):
            continue
        ids = f"{data.get('CatalogNamespace')}%3A{data.get('CatalogItemId')}%3A{data.get('AppName')}"
        games.append({
            "nom": data["DisplayName"], "source": "Epic Games",
            "uri": f"com.epicgames.launcher://apps/{ids}?action=launch&silent=true",
        })
    return games


def installed_games() -> list[dict]:
    seen, games = set(), []
    for g in steam_games() + epic_games():
        if g["nom"].lower() not in seen:
            seen.add(g["nom"].lower())
            games.append(g)
    return sorted(games, key=lambda g: g["nom"].lower())


def find_game(name: str, games: list[dict]) -> dict | None:
    wanted = _simple(name)
    if not wanted:
        return None
    names = {_simple(g["nom"]): g for g in games}
    if wanted in names:
        return names[wanted]
    # « rocket » trouve « Rocket League », « gta 5 » trouve « Grand Theft Auto V »… autant que possible
    contains = [g for key, g in names.items() if wanted in key or key in wanted]
    if contains:
        return min(contains, key=lambda g: len(g["nom"]))
    initials = {
        "".join(w if w.isdigit() else w[0] for w in key.split()): g for key, g in names.items() if len(key.split()) > 1
    }
    compact = wanted.replace(" ", "")
    if compact in initials:
        return initials[compact]
    starts = [g for key, g in initials.items() if len(compact) >= 2 and key.startswith(compact)]
    if len(starts) == 1:  # « gta » trouve « Grand Theft Auto V » s'il n'y a pas d'ambiguïté
        return starts[0]
    close = difflib.get_close_matches(wanted, list(names), n=1, cutoff=0.55)
    return names[close[0]] if close else None


def lancer_jeu(nom: str) -> str:
    games = installed_games()
    if not games:
        return "Je ne trouve aucun jeu Steam ou Epic Games installé sur cet ordinateur."
    game = find_game(nom, games)
    if not game:
        return f"Je ne trouve pas « {nom} » parmi les jeux installés. Jeux disponibles : " + ", ".join(g["nom"] for g in games[:25])
    if platform.system() == "Windows":
        os.startfile(game["uri"])
    else:
        import webbrowser

        webbrowser.open(game["uri"])
    return f"Lancement de {game['nom']} ({game['source']})."


def lister_jeux() -> str:
    games = installed_games()
    if not games:
        return "Aucun jeu Steam ou Epic Games trouvé sur cet ordinateur."
    return f"{len(games)} jeux installés : " + ", ".join(f"{g['nom']} ({g['source']})" for g in games)


HANDLERS = {"lancer_jeu": lancer_jeu, "lister_jeux": lister_jeux}
