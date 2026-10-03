"""Voix de Jarvis : reconnaissance vocale (micro -> texte) et synthèse vocale (texte -> haut-parleurs).

Ces dépendances sont optionnelles : sans elles, Jarvis fonctionne en mode texte.
"""

LANGUAGE = "fr-FR"


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
        self.engine.say(text)
        self.engine.runAndWait()
