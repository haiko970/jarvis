"""Voix ultra-réaliste en option, grâce à ElevenLabs (clé gratuite avec un quota mensuel)."""

import json
import urllib.error
import urllib.request

from . import config

API = "https://api.elevenlabs.io/v1/text-to-speech/{voice}?output_format=mp3_44100_128"
MODEL = "eleven_flash_v2_5"  # rapide, parle français, consomme 2 fois moins de crédits


def synthesize(text: str) -> bytes:
    """Transforme le texte en voix (MP3). Lève RuntimeError avec un message clair en cas de souci."""
    key = config.get_secret("elevenlabs_cle")
    voice = config.load()["elevenlabs_voix_id"].strip()
    if not key or not voice:
        raise RuntimeError("Clé ElevenLabs ou identifiant de voix manquant.")
    request = urllib.request.Request(
        API.format(voice=voice),
        data=json.dumps({"text": text, "model_id": MODEL}).encode(),
        headers={"xi-api-key": key, "Content-Type": "application/json", "Accept": "audio/mpeg"},
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as r:
            return r.read()
    except urllib.error.HTTPError as e:
        detail = e.read().decode(errors="replace")
        try:
            detail = json.loads(detail)["detail"]
            detail = detail.get("message", detail) if isinstance(detail, dict) else detail
        except (ValueError, KeyError, TypeError):
            pass
        if e.code == 401:
            raise RuntimeError(f"Clé ElevenLabs refusée ou quota épuisé ({detail}).") from None
        if e.code in (400, 404) and "voice" in str(detail).lower():
            raise RuntimeError(
                f"Voix introuvable ({detail}). Ajoute-la d'abord à « My Voices » sur elevenlabs.io."
            ) from None
        raise RuntimeError(f"ElevenLabs a répondu {e.code} : {detail}") from None
    except urllib.error.URLError as e:
        raise RuntimeError(f"Impossible de joindre ElevenLabs : {e.reason}") from None
