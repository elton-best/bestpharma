/**
 * Petites fonctions partagées par les écrans d'administration migrés vers l'API.
 * Elles restent pures pour être testables sans DOM.
 */

export interface LigneJournal {
  id: number | string;
  table_name: string;
  table_libelle?: string;
  record_id: string | null;
  action: "INSERT" | "UPDATE" | "DELETE" | string;
  user_id: string | null;
  user_email: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  ip_address: string | null;
  server_timestamp: string;
  empreinte_sha256?: string | null;
  empreinte_precedente?: string | null;
}

/**
 * Résumé lisible d'une ligne de journal : on ne montre jamais de clé technique
 * (snake_case) à l'utilisateur, seulement des libellés métier et des valeurs.
 */
export function resumeJournal(l: LigneJournal): string | null {
  const donnees = l.new_data ?? l.old_data;
  if (!donnees) return null;

  const morceaux: string[] = [];
  if (typeof donnees.statut_detail === "string") morceaux.push(`statut : ${donnees.statut_detail}`);
  if (typeof donnees.statut === "string") morceaux.push(`statut : ${donnees.statut}`);
  if (donnees.valeur !== undefined) morceaux.push(`valeur : ${String(donnees.valeur)}`);
  if (typeof donnees.reference === "string") morceaux.push(`référence : ${donnees.reference}`);
  if (typeof donnees.titre === "string") morceaux.push(donnees.titre);
  if (typeof donnees.fait === "boolean") {
    morceaux.push(donnees.fait ? "marquée faite" : "remise à faire");
  }
  return morceaux.length ? morceaux.join(" · ") : null;
}

export const VUE_JOURNAL_VIDE = { titre: "Aucune opération", description: "Le journal est vide pour ce filtre." };

/** Bloc d'état vide réutilisable (aucune dépendance de rendu complexe). */
export function Retablissement({ vue, titre, description }: { vue: "vide" | "erreur"; titre: string; description: string }) {
  return (
    <div role={vue === "erreur" ? "alert" : "status"} className="rounded-xl border border-[#CFE3D5] bg-white p-4 text-sm">
      <p className="font-semibold text-[#0F3B27]">{titre}</p>
      <p className="text-[#475C50]">{description}</p>
    </div>
  );
}
