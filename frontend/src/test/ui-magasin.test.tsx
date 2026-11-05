import { renderToString } from "react-dom/server";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { SelecteurFiltrable } from "@/components/ui/selecteur-filtrable";

function DemoSelecteur() {
  const [v, setV] = useState("lots");
  return (
    <SelecteurFiltrable
      id="demo"
      etiquette="Section"
      options={[
        { valeur: "lots", libelle: "Lots", description: "Les lots par péremption" },
        { valeur: "produits", libelle: "Produits", description: "Le catalogue" },
      ]}
      valeur={v}
      onChange={setV}
    />
  );
}

describe("UI magasin", () => {
  it("affiche la section choisie dans le sélecteur filtrable compact", () => {
    const html = renderToString(<DemoSelecteur />);
    expect(html).toContain("Lots");
    expect(html).toContain('role="combobox"');
  });
});
