import { renderToString } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";

import { DechetsStock, InventairesStock, RappelsStock } from "@/components/modules/magasin-avance";

const rendre = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderToString(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
};

describe("sections avancées du magasin", () => {
  it("affiche la campagne d’inventaire avec son bouton de création", () => {
    const html = rendre(<InventairesStock />);
    expect(html).toContain("Inventaires : tournant et général annuel");
    expect(html).toContain("Nouvelle campagne");
    expect(html).toContain("Chargement");
  });

  it("affiche les rappels avec la saisie d’un avis", () => {
    const html = rendre(<RappelsStock />);
    expect(html).toContain("Rappels sanitaires");
    expect(html).toContain("Ajouter un rappel sanitaire");
    expect(html).toContain("Avis enregistrés");
  });

  it("affiche les déchets avec la constitution d’un lot", () => {
    const html = rendre(<DechetsStock />);
    expect(html).toContain("Déchets et destruction");
    expect(html).toContain("Constituer un lot à détruire");
    expect(html).toContain("Lots de déchets");
  });
});
