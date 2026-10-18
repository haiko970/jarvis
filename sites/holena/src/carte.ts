// Taille de la « carte » du centre (le logo et ses trois flèches).
// Tout est dessiné dans un cadre de 1000 × 560, agrandi ou réduit selon l'écran.
export const CARTE_L = 1000;
export const CARTE_H = 560;
// Le logo occupe 27 % de la largeur de la carte
export const PART_LOGO = 0.27;

// Même calcul que la classe CSS w-[min(94vw,1100px,117.86vh)]
export function largeurCarte() {
  return Math.min(window.innerWidth * 0.94, 1100, window.innerHeight * 1.1786);
}

// Taille du logo pendant l'intro : même calcul que w-[min(70vw,60vh,460px)]
export function largeurLogoIntro() {
  return Math.min(window.innerWidth * 0.7, window.innerHeight * 0.6, 460);
}
