import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Retablissement, resumeJournal, VUE_JOURNAL_VIDE } from "@/components/modules/administration";

/**
 * Ces écrans sont désormais branchés sur l'API Laravel. PHP n'étant pas exécutable
 * dans l'environnement de recette, on vérifie ici les fonctions de rendu pures
 * (libellés, résumés, états vides) qui portent le contrat d'affichage.
 */
describe("journal d'audit", () => {
  it("résume une modification sans afficher de clé technique", () => {
    const texte = resumeJournal({
      id: 1,
      table_name: "stocks_lots",
      table_libelle: "Lot de stock",
      record_id: "l3",
      action: "UPDATE",
      user_id: "u1",
      user_email: "promoteur@begpharma.bj",
      old_data: { statut_detail: "commercialisable" },
      new_data: { statut_detail: "quarantaine" },
      ip_address: "197.234.10.12",
      server_timestamp: "2026-11-02T09:00:00Z",
    });
    expect(texte).toContain("statut : quarantaine");
    expect(texte).not.toContain("statut_detail");
  });

  it("n'invente pas de résumé quand la ligne ne porte pas de données", () => {
    expect(
      resumeJournal({
        id: 2,
        table_name: "echeances",
        record_id: "ech1",
        action: "DELETE",
        user_id: null,
        user_email: null,
        old_data: null,
        new_data: null,
        ip_address: null,
        server_timestamp: "2026-11-04T08:00:00Z",
      }),
    ).toBeNull();
  });

  it("rend un état vide explicite en français", () => {
    const html = renderToString(<Retablissement vue="vide" {...VUE_JOURNAL_VIDE} />);
    expect(html).toContain("Aucune opération");
  });
});
