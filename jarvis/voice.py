"""Voix de Jarvis : reconnaissance vocale (micro -> texte) et synthèse vocale (texte -> haut-parleurs).

Ces dépendances sont optionnelles : sans elles, Jarvis fonctionne en mode texte.
"""

import re

LANGUAGE = "fr-FR"


def clean_for_speech(text: str) -> str:
    """Enlève la mise en forme (astérisques, dièses, puces, émojis…) pour lire comme un humain."""
    text = re.sub(r"```.*?```", " ", text, flags=re.S)
    text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)
    text = re.sub(r"https?://\S+|www\.\S+", "le lien", text)
    text = re.sub(r"^\s{0,3}#{1,6}\s*", "", text, flags=re.M)
    text = re.sub(r"^\s*[-*•+]\s+", "", text, flags=re.M)
    text = re.sub(r"(\d+(?:[.,]\d+)?)\s*/\s*(\d+(?:[.,]\d+)?)", r"\1 sur \2", text)
    text = re.sub(r"°\s*C\b|°", " degrés", text)
    text = re.sub(r"[*_~`#|]+", " ", text)
    text = re.sub(r"[\U0001F000-\U0001FAFF\u2600-\u27BF\uFE0F\u200D]", "", text)
    text = re.sub(r"[ \t]*\n\s*", "\n", text.strip())
    text = re.sub(r"(?<![.!?:;,])\n", ". ", text)  # une ligne sans ponctuation = une petite pause
    return re.sub(r"\s+", " ", text).strip()


class Voice:
    def __init__(self) -> None:
        import pyttsx3
        import speech_recognition as sr

        self.sr = sr
        self.recognizer = sr.Recognizer()
        self.recognizer.pause_threshold = 0.8
        self.engine = pyttsx3.init()
        self.engine.setProperty("rate", 185)
        self._choose_french_voice()

        with sr.Microphone() as source:
            print("🎙️  Calibrage du micro, ne parle pas pendant une seconde…")
            self.recognizer.adjust_for_ambient_noise(source, duration=1)

    def _choose_french_voice(self) -> None:
        for v in self.engine.getProperty("voices"):
            ident = f"{v.id} {v.name} {getattr(v, 'languages', '')}".lower()
            if "fr" in ident or "french" in ident or "hortense" in ident or "thomas" in ident:
                self.engine.setProperty("voice", v.id)
                return

    def listen(self) -> str | None:
        """Écoute le micro et renvoie le texte reconnu (ou None si rien compris)."""
        with self.sr.Microphone() as source:
            try:
                audio = self.recognizer.listen(source, timeout=8, phrase_time_limit=20)
            except self.sr.WaitTimeoutError:
                return None
        try:
            return self.recognizer.recognize_google(audio, language=LANGUAGE)
        except self.sr.UnknownValueError:
            return None
        except self.sr.RequestError as e:
            print(f"⚠️  Service de reconnaissance vocale indisponible : {e}")
            return None

    def say(self, text: str) -> None:
        self.engine.say(clean_for_speech(text))
        self.engine.runAndWait()
