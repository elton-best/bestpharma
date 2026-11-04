import { describe, expect, it } from "vitest";

import { normaliserMatieres, resumeMatieres } from "@/lib/preparations-matieres";

describe("matières premières d'une préparation", () => {
  it("relit une liste d'objets saisie dans la fiche", () => {
    const liste = normaliserMatieres([
      { matiere: "Oxyde de zinc", lot: "MP-2026-012", fournisseur: "Cooper", quantite: "20 g" },
    ]);

    expect(liste).toHaveLength(1);
    expect(liste[0]).toMatchObject({ matiere: "Oxyde de zinc", lot: "MP-2026-012", quantite: "20 g" });
  });

  it("accepte encore un ancien texte libre", () => {
    expect(normaliserMatieres("Oxyde de zinc, talc, glycérine")).toEqual([
      { matiere: "Oxyde de zinc, talc, glycérine" },
    ]);
  });

  it("relit l'ancien champ saisie_libre et ignore les lignes vides", () => {
    const liste = normaliserMatieres([
      { saisie_libre: "Talc" },
      { matiere: "   " },
      null,
      { matiere: "Glycérine", lot: "" },
    ]);

    expect(liste).toEqual([{ matiere: "Talc" }, { matiere: "Glycérine", lot: undefined }]);
  });

  it("renvoie une liste vide quand rien n'est saisi", () => {
    expect(normaliserMatieres(undefined)).toEqual([]);
    expect(normaliserMatieres("")).toEqual([]);
    expect(normaliserMatieres([])).toEqual([]);
  });

  it("résume la liste en français", () => {
    expect(resumeMatieres([])).toBe("Aucune matière première renseignée");
    expect(resumeMatieres([{ matiere: "Talc" }])).toBe("Talc");
    expect(resumeMatieres([{ matiere: "Talc" }, { matiere: "Oxyde de zinc" }])).toBe(
      "Talc et 1 autre",
    );
    expect(
      resumeMatieres([{ matiere: "Talc" }, { matiere: "Oxyde de zinc" }, { matiere: "Glycérine" }]),
    ).toBe("Talc et 2 autres");
  });
});
