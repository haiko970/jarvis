"""Les « modules » que Jarvis va chercher avec son bras : la Terre, la météo, les marées…

Les phrases sont reconnues directement (sans passer par le cerveau) : « ouvre la carte »,
« montre la météo », « montre-moi le Japon », « range ça »…"""

import re
import unicodedata

# Ce qu'on peut ouvrir, avec les mots qui le désignent et ce que Jarvis répond
MODULES = {
    # (avant « terre » : « ma carte de connaissances » ne doit pas ouvrir la carte du monde)
    "connaissances": (r"carte de connaissances?|carte mentale|connaissances|(?:ta|ma) memoire|ma carte"
                      r"|ce que tu sais (?:sur|de) moi", "Voici ta carte de connaissances."),
    "terre": (r"carte|map|globe|terre|monde|planete|mappemonde|avions?|satellites?|bateaux|navires|seismes?"
              r"|tremblements? de terre|cameras?|webcams?|oeil|œil", "Voici la Terre, en direct."),
    "meteo": (r"meteo", "Voici la météo."),
    "marees": (r"marees?", "Voici les marées."),
    "journee": (r"journee|emploi du temps|agenda|planning|programme", "Voici ta journée."),
    "ciel": (r"ciel|lune|station spatiale|iss", "Voici le ciel."),
    "foot": (r"foot|football", "Voici le foot."),
    "vacances": (r"vacances|compte a rebours", "Voici le compte à rebours des vacances."),
    "jeux": (r"temps de jeu|statistiques de jeu|stats de jeu", "Voici ton temps de jeu."),
    "taches": (r"taches|liste de choses a faire|mails?|courriers?", "Voici tes tâches et tes mails."),
    "presence": (r"presence|ruview|capteur", "Voici la présence dans la pièce."),
    "discussion": (r"discussion|conversation|historique", "Voici notre discussion."),
}

# Pays : nom français → nom sur la carte (en anglais)
PAYS = {
    "france": "France", "espagne": "Spain", "portugal": "Portugal", "italie": "Italy", "allemagne": "Germany",
    "belgique": "Belgium", "suisse": "Switzerland", "pays-bas": "Netherlands", "hollande": "Netherlands",
    "royaume-uni": "United Kingdom", "angleterre": "United Kingdom", "ecosse": "United Kingdom",
    "irlande": "Ireland", "islande": "Iceland", "norvege": "Norway", "suede": "Sweden", "finlande": "Finland",
    "danemark": "Denmark", "pologne": "Poland", "autriche": "Austria", "grece": "Greece", "turquie": "Turkey",
    "russie": "Russia", "ukraine": "Ukraine", "roumanie": "Romania", "hongrie": "Hungary", "croatie": "Croatia",
    "serbie": "Serbia", "tchequie": "Czechia", "republique tcheque": "Czechia", "maroc": "Morocco",
    "algerie": "Algeria", "tunisie": "Tunisia", "egypte": "Egypt", "senegal": "Senegal", "mali": "Mali",
    "cote d'ivoire": "Côte d'Ivoire", "cameroun": "Cameroon", "nigeria": "Nigeria", "kenya": "Kenya",
    "afrique du sud": "South Africa", "madagascar": "Madagascar", "congo": "Dem. Rep. Congo",
    "etats-unis": "United States of America", "usa": "United States of America", "amerique": "United States of America",
    "canada": "Canada", "mexique": "Mexico", "bresil": "Brazil", "argentine": "Argentina", "chili": "Chile",
    "perou": "Peru", "colombie": "Colombia", "venezuela": "Venezuela", "cuba": "Cuba", "groenland": "Greenland",
    "chine": "China", "japon": "Japan", "coree du sud": "South Korea", "coree du nord": "North Korea", "coree": "South Korea",
    "inde": "India", "pakistan": "Pakistan", "iran": "Iran", "irak": "Iraq", "israel": "Israel", "liban": "Lebanon",
    "arabie saoudite": "Saudi Arabia", "emirats arabes unis": "United Arab Emirates", "qatar": "Qatar",
    "thailande": "Thailand", "vietnam": "Vietnam", "indonesie": "Indonesia", "philippines": "Philippines",
    "malaisie": "Malaysia", "mongolie": "Mongolia", "kazakhstan": "Kazakhstan", "afghanistan": "Afghanistan",
    "australie": "Australia", "nouvelle-zelande": "New Zealand", "nouvelle-caledonie": "New Caledonia",
    "antarctique": "Antarctica", "taiwan": "Taiwan", "syrie": "Syria", "jordanie": "Jordan", "ethiopie": "Ethiopia",
}

_VERBE = r"(?:ouvr(?:e|ir)|affich(?:e|er)|montr(?:e|er)|sor(?:s|tir)|mets|met|lance|va chercher|fais(?:-moi)? voir)"
_FERMER = re.compile(
    r"^(?:ferme|fermer|range|ranger|enleve|enlever|retire|retirer|cache|cacher)"
    r"(?:[- ](?:la|le|les|ce|cette|ca|moi ca|tout))*"
    r"(?:\s+(?:carte|map|globe|terre|module|panneau|fenetre|meteo|marees?|ciel|journee|foot|vacances|taches|"
    r"presence|discussion|conversation|connaissances|memoire|tout)(?:\s.*)?)?$"
)


def _simple(text: str) -> str:
    text = unicodedata.normalize("NFD", text.lower().replace("’", "'"))
    text = "".join(c for c in text if unicodedata.category(c) != "Mn")
    text = re.sub(r"^\W*(?:ok |dis |hey |eh )?jarvis\W*", "", text.strip())
    return re.sub(r"[\s.!?,]+$", "", re.sub(r"[,!?]", " ", text)).strip()


def _country(phrase: str) -> str | None:
    for fr in sorted(PAYS, key=len, reverse=True):  # « coree du sud » avant « coree »
        if re.search(rf"(?:^|[\s'-]){re.escape(fr)}(?:$|\s)", phrase):
            return PAYS[fr]
    return None


def quick_module(text: str) -> dict | None:
    """Reconnaît « ouvre la carte », « montre-moi le Japon », « range ça »… Renvoie l'action, ou None."""
    phrase = _simple(text)
    if not phrase or len(phrase.split()) > 12:
        return None
    if _FERMER.match(phrase):
        return {"module": "fermer", "texte": "C'est rangé."}
    # « où est le Japon », « montre-moi l'Australie sur la carte »
    pays = _country(phrase)
    if pays and (re.search(rf"\b{_VERBE}\b", phrase) or re.match(r"^ou (?:est|se trouve)", phrase)):
        nom = next(fr for fr, en in PAYS.items() if en == pays and re.search(re.escape(fr), phrase))
        return {"module": "terre", "cible": pays, "texte": f"Voici {_avec_article(nom)}."}
    if not re.search(rf"\b{_VERBE}\b", phrase):
        return None
    for name, (words, reply) in MODULES.items():
        if re.search(rf"\b(?:{words})\b", phrase):
            return {"module": name, "texte": reply}
    return None


def _avec_article(nom: str) -> str:
    """« japon » → « le Japon », « italie » → « l'Italie », « etats-unis » → « les États-Unis »."""
    jolis = {"etats-unis": "États-Unis", "usa": "États-Unis", "amerique": "États-Unis", "emirats arabes unis": "Émirats arabes unis",
             "cote d'ivoire": "Côte d'Ivoire", "egypte": "Égypte", "ecosse": "Écosse", "equateur": "Équateur",
             "ethiopie": "Éthiopie", "perou": "Pérou", "bresil": "Brésil", "norvege": "Norvège", "suede": "Suède",
             "grece": "Grèce", "algerie": "Algérie", "senegal": "Sénégal", "coree du sud": "Corée du Sud",
             "coree du nord": "Corée du Nord", "coree": "Corée du Sud", "tchequie": "Tchéquie", "israel": "Israël",
             "thailande": "Thaïlande", "indonesie": "Indonésie", "nouvelle-zelande": "Nouvelle-Zélande",
             "nouvelle-caledonie": "Nouvelle-Calédonie", "taiwan": "Taïwan", "irak": "Irak"}
    joli = jolis.get(nom, nom.title().replace("Du ", "du ").replace("De ", "de ").replace("Des ", "des "))
    pluriels = {"etats-unis", "usa", "amerique", "pays-bas", "philippines", "emirats arabes unis"}
    sans_article = {"israel", "cuba", "madagascar", "taiwan", "qatar"}
    feminins = ("e",)
    if nom in pluriels:
        return f"les {joli}"
    if nom in sans_article:
        return joli
    if joli[0].lower() in "aeiouyéèêîôâ" or joli[0] in "ÉÈÊÎÔÂ":
        return f"l'{joli}"
    if nom.endswith(feminins) and nom not in {"mexique", "cambodge", "mozambique", "zimbabwe"}:
        return f"la {joli}"
    return f"le {joli}"
