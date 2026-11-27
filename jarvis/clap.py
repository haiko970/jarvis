"""Réveil en tapant deux fois dans les mains 👏👏.

Un clap est un bruit très court et très fort : le son monte d'un coup puis retombe presque aussitôt.
La voix, la musique ou une porte qui grince durent plus longtemps : elles ne déclenchent rien.
Il faut deux claps rapprochés (entre 0,12 et 0,9 seconde) pour réveiller Jarvis.

Quand la fenêtre de Jarvis est ouverte, c'est la page qui écoute (même méthode, en JavaScript).
Quand Jarvis attend en arrière-plan (mode discret), ce fichier écoute le micro de Windows directement,
sans rien installer de plus. Rien n'est enregistré ni envoyé : le son est analysé puis oublié aussitôt."""

import math
import platform
import threading
import time
from array import array

TRAME_MS = 10  # on analyse le son par petits morceaux de 10 millisecondes
ACTIVITE = {"t": 0.0}  # dernière fois qu'un bruit a duré (voix, pas…) : un indice de présence


class DetecteurClap:
    """Reçoit le son morceau par morceau et dit quand il entend deux claps."""

    def __init__(self, sensibilite: float = 0.5):
        # sensibilité de 0 (il faut taper fort) à 1 (un clap léger suffit)
        self.seuil = 0.32 - 0.24 * max(0.0, min(1.0, sensibilite))  # niveau minimum d'un clap (0 à 1)
        self.bruit = 0.01  # niveau du bruit de fond, qui s'adapte doucement
        self.avant = 0.0  # niveau de la trame précédente
        self.candidat = None  # (heure, niveau) d'un début de clap à confirmer
        self.trames_depuis = 0
        self.dernier_clap = -10.0
        self.repos_jusqua = 0.0
        self.t = 0.0
        self.bruyant = 0.0  # part récente du temps nettement au-dessus du bruit de fond (0 à 1)

    def trame(self, rms: float, pic: float) -> bool:
        """Une trame de 10 ms (niveau moyen et pic, entre 0 et 1). Renvoie True au deuxième clap."""
        self.t += TRAME_MS / 1000
        reveil = False
        if self.candidat:
            self.trames_depuis += 1
            debut, niveau = self.candidat
            # Un clap retombe vite : moins d'un tiers du niveau en 150 ms au plus
            if rms < niveau * 0.3:
                self.candidat = None
                reveil = self._clap(debut)
            elif self.trames_depuis > 15:
                self.candidat = None  # trop long : de la voix, de la musique… pas un clap
        elif (self.t > self.repos_jusqua and pic > self.seuil and rms > self.bruit * 8
              and rms > self.avant * 3 and rms > 0.02):
            self.candidat, self.trames_depuis = (self.t, rms), 0  # montée brutale : peut-être un clap
        # Du bruit pendant plus de la moitié de la dernière demi-seconde (voix, pas…) : quelqu'un est là.
        # Un clap est trop court pour compter.
        fort = 1.0 if rms > max(self.bruit * 4, 0.01) else 0.0
        self.bruyant += (fort - self.bruyant) * 0.04
        if self.bruyant > 0.5:
            ACTIVITE["t"] = time.time()
        if not self.candidat:  # le bruit de fond s'adapte (vite s'il baisse, lentement s'il monte)
            k = 0.2 if rms < self.bruit else 0.01
            self.bruit += (rms - self.bruit) * k
            self.bruit = max(self.bruit, 0.002)
        self.avant = rms
        return reveil

    def _clap(self, quand: float) -> bool:
        ecart = quand - self.dernier_clap
        if 0.12 <= ecart <= 0.9:
            self.dernier_clap = -10.0
            self.repos_jusqua = self.t + 1.5  # pas deux réveils d'affilée
            return True
        self.dernier_clap = quand
        return False

    def echantillons(self, donnees: array, par_trame: int) -> bool:
        """Des échantillons 16 bits (mono) : découpés en trames de 10 ms."""
        reveil = False
        for i in range(0, len(donnees) - par_trame + 1, par_trame):
            morceau = donnees[i:i + par_trame]
            pic = max(abs(min(morceau)), max(morceau)) / 32768
            rms = math.sqrt(sum(x * x for x in morceau) / par_trame) / 32768
            reveil = self.trame(rms, pic) or reveil
        return reveil


# ---------- Écouter le micro de Windows (sans rien installer) ----------
def _ecouter_windows(au_clap, continuer, sensibilite) -> None:
    import ctypes
    from ctypes import wintypes

    winmm = ctypes.windll.winmm
    TAUX, PAR_TRAME, NB_TAMPONS = 16000, 160, 4
    TAILLE = PAR_TRAME * 2 * 5  # 50 ms de son par tampon (16 bits = 2 octets)

    class WAVEFORMATEX(ctypes.Structure):
        _fields_ = [("wFormatTag", wintypes.WORD), ("nChannels", wintypes.WORD), ("nSamplesPerSec", wintypes.DWORD),
                    ("nAvgBytesPerSec", wintypes.DWORD), ("nBlockAlign", wintypes.WORD),
                    ("wBitsPerSample", wintypes.WORD), ("cbSize", wintypes.WORD)]

    class WAVEHDR(ctypes.Structure):
        pass

    WAVEHDR._fields_ = [("lpData", ctypes.c_void_p), ("dwBufferLength", wintypes.DWORD),
                        ("dwBytesRecorded", wintypes.DWORD), ("dwUser", ctypes.c_size_t), ("dwFlags", wintypes.DWORD),
                        ("dwLoops", wintypes.DWORD), ("lpNext", ctypes.POINTER(WAVEHDR)), ("reserved", ctypes.c_size_t)]

    fmt = WAVEFORMATEX(1, 1, TAUX, TAUX * 2, 2, 16, 0)  # PCM, mono, 16 kHz, 16 bits
    micro = ctypes.c_void_p()
    if winmm.waveInOpen(ctypes.byref(micro), ctypes.c_uint(0xFFFFFFFF), ctypes.byref(fmt), 0, 0, 0):
        raise RuntimeError("micro introuvable")
    tampons = [ctypes.create_string_buffer(TAILLE) for _ in range(NB_TAMPONS)]
    entetes = [WAVEHDR(ctypes.cast(t, ctypes.c_void_p), TAILLE, 0, 0, 0, 0, None, 0) for t in tampons]
    taille_hdr = ctypes.sizeof(WAVEHDR)
    try:
        for h in entetes:
            winmm.waveInPrepareHeader(micro, ctypes.byref(h), taille_hdr)
            winmm.waveInAddBuffer(micro, ctypes.byref(h), taille_hdr)
        winmm.waveInStart(micro)
        detecteur = DetecteurClap(sensibilite())
        while continuer():
            fait = False
            for t, h in zip(tampons, entetes):
                if not h.dwFlags & 1:  # WHDR_DONE : ce tampon n'est pas encore rempli
                    continue
                fait = True
                son = array("h", t.raw[:h.dwBytesRecorded])
                h.dwFlags &= ~1
                winmm.waveInAddBuffer(micro, ctypes.byref(h), taille_hdr)  # on le rend au micro
                if detecteur.echantillons(son, PAR_TRAME):
                    au_clap()
            if not fait:
                time.sleep(0.01)
    finally:
        winmm.waveInStop(micro)
        winmm.waveInReset(micro)
        for h in entetes:
            winmm.waveInUnprepareHeader(micro, ctypes.byref(h), taille_hdr)
        winmm.waveInClose(micro)


def demarrer(au_clap, actif, sensibilite=lambda: 0.5) -> None:
    """Écoute les claps en arrière-plan tant que Jarvis tourne.

    actif() dit s'il faut écouter maintenant (réglage activé et fenêtre fermée) ;
    on lâche le micro dès que ce n'est plus le cas."""
    if platform.system() != "Windows":
        return

    def boucle():
        while True:
            if actif():
                try:
                    _ecouter_windows(au_clap, actif, sensibilite)
                except Exception:
                    time.sleep(30)  # pas de micro pour l'instant : on réessaie plus tard
            time.sleep(1)

    threading.Thread(target=boucle, daemon=True).start()
