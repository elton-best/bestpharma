/**
 * Les matières premières d'une préparation sont enregistrées sous forme de
 * liste (un objet par matière). Les anciennes fiches peuvent contenir un texte
 * libre ou une simple chaîne : on sait les relire sans rien perdre.
 */
export interface MatierePremiere {
  matiere: string;
  lot?: string;
  fournisseur?: string;
  quantite?: string;
  certificat?: string;
}

export function ligneVide(): MatierePremiere {
  return { matiere: "", lot: "", fournisseur: "", quantite: "", certificat: "" };
}

export function normaliserMatieres(valeur: unknown): MatierePremiere[] {
  if (!valeur) return [];

  if (typeof valeur === "string") {
    return valeur.trim() ? [{ matiere: valeur.trim() }] : [];
  }

  if (!Array.isArray(valeur)) return [];

  return valeur
    .map((element): MatierePremiere | null => {
      if (typeof element === "string") {
        return element.trim() ? { matiere: element.trim() } : null;
      }
      if (!element || typeof element !== "object") return null;

      const objet = element as Record<string, unknown>;
      const texte = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
      const saisieLibre = texte(objet.saisie_libre);

      const matiere = texte(objet.matiere) ?? saisieLibre;
      if (!matiere) return null;

      return {
        matiere,
        lot: texte(objet.lot),
        fournisseur: texte(objet.fournisseur),
        quantite: texte(objet.quantite),
        certificat: texte(objet.certificat),
      };
    })
    .filter((m): m is MatierePremiere => m !== null);
}

/** Résumé lisible d'une liste de matières, pour les tableaux et les infobulles. */
export function resumeMatieres(liste: MatierePremiere[]): string {
  if (liste.length === 0) return "Aucune matière première renseignée";
  if (liste.length === 1) return liste[0].matiere;
  return `${liste[0].matiere} et ${liste.length - 1} autre${liste.length > 2 ? "s" : ""}`;
}
