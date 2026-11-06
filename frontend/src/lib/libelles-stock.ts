const MOUVEMENTS: Record<string, string> = {
  entree_reception: "Réception", entree: "Entrée en stock", vente: "Vente", sortie_dispensation: "Dispensation",
  changement_statut: "Changement de statut", transfert: "Transfert", ajustement: "Ajustement",
  quarantaine: "Mise en quarantaine", blocage: "Blocage", sortie: "Sortie de stock", retour: "Retour", destruction: "Destruction",
};
export const libelleMouvement = (valeur?: string) => MOUVEMENTS[valeur ?? ""] ?? "Autre mouvement";
