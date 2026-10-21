// Tailles partagées entre l'intro et la page, pour que le logo de l'intro
// se pose exactement sur le logo du site.

// Largeur du logo au centre du site : même calcul que la classe CSS
// w-[min(24vw,32vh,340px)] (sur téléphone : w-[min(52vw,30vh)])
export function largeurLogoSite() {
  const L = window.innerWidth;
  const H = window.innerHeight;
  return L < 768 ? Math.min(L * 0.52, H * 0.3) : Math.min(L * 0.24, H * 0.32, 340);
}

// Taille du logo pendant l'intro : même calcul que w-[min(70vw,60vh,460px)]
export function largeurLogoIntro() {
  return Math.min(window.innerWidth * 0.7, window.innerHeight * 0.6, 460);
}
