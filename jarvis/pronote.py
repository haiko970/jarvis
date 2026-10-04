"""Pronote : emploi du temps, devoirs et notes (via pronotepy, outil non officiel)."""

import datetime
import json
import threading
import uuid as uuid_lib
import unicodedata

from . import config

_client = None
_lock = threading.Lock()


def _schema(properties: dict, required: list[str]) -> dict:
    return {"type": "object", "properties": properties, "required": required, "additionalProperties": False}


TOOLS = [
    {
        "name": "emploi_du_temps",
        "description": (
            "Donne l'emploi du temps Pronote de l'utilisateur pour un jour ('aujourd'hui', 'demain', 'lundi', "
            "'JJ/MM'…), avec les cours annulés et les profs absents."
        ),
        "input_schema": _schema({"jour": {"type": "string"}}, []),
    },
    {
        "name": "devoirs",
        "description": "Donne les devoirs Pronote à faire pour les prochains jours (ou pour un jour précis).",
        "input_schema": _schema({"jour": {"type": "string", "description": "Facultatif : un jour précis"}}, []),
    },
    {
        "name": "notes",
        "description": "Donne les dernières notes Pronote de l'utilisateur (trimestre en cours).",
        "input_schema": _schema({"matiere": {"type": "string", "description": "Facultatif : filtrer une matière"}}, []),
    },
]


def ent_choices() -> dict[str, str]:
    """Les ENT que pronotepy sait utiliser pour se connecter."""
    import pronotepy.ent

    names = sorted(n for n in dir(pronotepy.ent) if not n.startswith("_") and callable(getattr(pronotepy.ent, n)))
    labels = {
        "qrcode": "📱 QR code Pronote (marche avec tous les ENT, recommandé)",
        "aucun": "Identifiant Pronote direct (sans ENT)",
        "ent_elyco": "e-lyco (Pays de la Loire)",
    }
    return labels | {n: n.replace("_", " ") for n in names if n not in labels}


def _qr_mode() -> bool:
    return config.load()["pronote_ent"] == "qrcode"


def _device_uuid() -> str:
    value = config.load()["pronote_uuid"]
    if not value:
        value = str(uuid_lib.uuid4())
        config.save({"pronote_uuid": value})
    return value


def _save_token(client) -> None:
    """Après chaque connexion par QR code, Pronote donne un nouveau jeton pour la fois suivante."""
    config.set_secret("pronote_jeton", json.dumps(client.export_credentials()))


def qr_login(qr: dict, pin: str) -> tuple[bool, str]:
    """Première connexion avec le QR code affiché dans Pronote et le code à 4 chiffres choisi."""
    import pronotepy

    global _client
    try:
        with _lock:
            client = pronotepy.Client.qrcode_login(
                qr, pin.strip(), uuid=_device_uuid(), device_name="Jarvis"
            )
            if not client.logged_in:
                return False, "Pronote a refusé la connexion."
            _save_token(client)
            config.save({"pronote_ent": "qrcode", "pronote_url": qr.get("url", "")})
            _client = client
            return True, f"Connecté à Pronote : bonjour {client.info.name} !"
    except pronotepy.QRCodeDecryptError:
        return False, "Code à 4 chiffres incorrect : recommence avec le même code que dans Pronote."
    except Exception as e:
        return False, (
            f"Échec de la connexion par QR code : {str(e).rstrip('.')}. Le QR code n'est valable que "
            "quelques minutes : génères-en un nouveau et réessaie."
        )


def configured() -> bool:
    if _qr_mode():
        return bool(config.get_secret("pronote_jeton"))
    s = config.load()
    return bool(s["pronote_url"] and s["pronote_identifiant"] and config.get_secret("pronote_mdp"))


def _clean_url(url: str) -> str:
    url = url.strip().split("?")[0].split("#")[0]
    if url.endswith("/pronote") or url.endswith("/pronote/"):
        url = url.rstrip("/") + "/eleve.html"
    return url


def _connect():
    import pronotepy
    import pronotepy.ent

    if _qr_mode():
        creds = json.loads(config.get_secret("pronote_jeton"))
        try:
            client = pronotepy.Client.token_login(**creds, device_name="Jarvis")
        except Exception as e:
            raise RuntimeError(
                f"La connexion à Pronote a expiré ({e}). Refais la connexion par QR code dans les réglages."
            ) from None
        _save_token(client)
        return client

    s = config.load()
    ent_name = s["pronote_ent"]
    ent = getattr(pronotepy.ent, ent_name) if ent_name and ent_name != "aucun" else None
    client = pronotepy.Client(
        _clean_url(s["pronote_url"]),
        username=s["pronote_identifiant"],
        password=config.get_secret("pronote_mdp"),
        ent=ent,
    )
    if not client.logged_in:
        raise RuntimeError("Connexion à Pronote refusée.")
    return client


def _get_client():
    """Garde la connexion ouverte (se connecter prend quelques secondes) et la renouvelle si besoin."""
    global _client
    if not configured():
        raise RuntimeError("Pronote n'est pas configuré. L'utilisateur peut le faire dans ⚙️ Réglages → Pronote.")
    if _client is not None:
        try:
            _client.session_check()
            if _qr_mode():
                _save_token(_client)  # le jeton a pu changer si pronotepy s'est reconnecté
            return _client
        except Exception:
            _client = None
    _client = _connect()
    return _client


def reset() -> None:
    global _client
    with _lock:
        _client = None


def test() -> tuple[bool, str]:
    reset()
    try:
        with _lock:
            client = _get_client()
            return True, f"Connecté à Pronote : bonjour {client.info.name} !"
    except Exception as e:
        hint = ""
        if "ENT" in type(e).__name__ or "ent" in str(e).lower():
            hint = " Vérifie ton identifiant et ton mot de passe e-lyco (ceux de l'ENT)."
        return False, f"Échec de la connexion à Pronote : {str(e).rstrip('.')}.{hint}"


def _simple(text: str) -> str:
    """Minuscules sans accents, pour comparer « maths » et « MATHÉMATIQUES »."""
    return "".join(c for c in unicodedata.normalize("NFD", text.lower()) if unicodedata.category(c) != "Mn")


def _hm(t: datetime.datetime) -> str:
    return t.strftime("%Hh%M")


def emploi_du_temps(jour: str = "") -> str:
    from .brief import french_date, parse_day

    day = parse_day(jour) or datetime.date.today()
    with _lock:
        lessons = _get_client().lessons(day)
    # Pour un même créneau, Pronote affiche le cours qui a le plus grand « num ».
    shown: dict = {}
    for lesson in lessons:
        key = (lesson.start, lesson.end)
        if key not in shown or (lesson.num or 0) > (shown[key].num or 0):
            shown[key] = lesson
    if not shown:
        return f"Aucun cours {french_date(day)}."
    lines = []
    for lesson in sorted(shown.values(), key=lambda l: l.start):
        subject = lesson.subject.name if lesson.subject else (lesson.status or "Cours")
        details = ", ".join(x for x in (lesson.teacher_name, f"salle {lesson.classroom}" if lesson.classroom else "") if x)
        line = f"- {_hm(lesson.start)}-{_hm(lesson.end)} : {subject}" + (f" ({details})" if details else "")
        if lesson.canceled:
            line += f" — ANNULÉ ({lesson.status or 'cours annulé'})"
        elif lesson.status:
            line += f" — {lesson.status}"
        if lesson.test:
            line += " — contrôle prévu"
        lines.append(line)
    return f"Emploi du temps du {french_date(day)} :\n" + "\n".join(lines)


def devoirs(jour: str = "") -> str:
    from .brief import french_date, parse_day

    day = parse_day(jour)
    start = day or datetime.date.today()
    end = day or start + datetime.timedelta(days=7)
    with _lock:
        homework = [h for h in _get_client().homework(start, end) if not h.done]
    if not homework:
        return "Aucun devoir à faire" + (f" pour {french_date(day)}." if day else " cette semaine.")
    lines = []
    for h in sorted(homework, key=lambda h: h.date):
        text = " ".join((h.description or "").split())[:200]
        lines.append(f"- Pour {french_date(h.date)} — {h.subject.name} : {text}")
    return "Devoirs à faire :\n" + "\n".join(lines)


def notes(matiere: str = "") -> str:
    with _lock:
        grades = list(_get_client().current_period.grades)
    if matiere:
        wanted = _simple(matiere).strip()[:4]  # « maths » → « math », trouve « MATHÉMATIQUES »
        filtered = [g for g in grades if wanted in _simple(g.subject.name)]
        # Abréviation non reconnue (ex. « SVT ») : on donne toutes les notes, l'IA fera le tri.
        grades = filtered or grades
    if not grades:
        return "Aucune note pour l'instant."
    lines = []
    for g in sorted(grades, key=lambda g: g.date, reverse=True)[:10]:
        line = f"- {g.date.strftime('%d/%m')} — {g.subject.name} : {g.grade}/{g.out_of}"
        if g.average:
            line += f" (moyenne de la classe {g.average})"
        if g.comment:
            line += f" « {g.comment} »"
        lines.append(line)
    return "Dernières notes :\n" + "\n".join(lines)


def brief_section() -> str:
    """Ce qui intéresse le brief du matin : les cours du jour et les devoirs pour demain."""
    today = datetime.date.today()
    tomorrow = today + datetime.timedelta(days=1)
    return emploi_du_temps("aujourd'hui") + "\n\n" + devoirs(tomorrow.isoformat())


HANDLERS = {"emploi_du_temps": emploi_du_temps, "devoirs": devoirs, "notes": notes}
