import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api-client";
import { ImportsCorpus } from "@/components/modules/imports-corpus";
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
function afficher() {
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><ImportsCorpus officine="off-test" /></QueryClientProvider>);
  fireEvent.click(screen.getByRole("button", { name: "Consulter les imports" }));
}
describe("provenance du corpus", () => {
  it("n'invente pas la présence du corpus lorsque le serveur ne répond pas", async () => {
    vi.spyOn(api, "get").mockRejectedValue(new Error("Indisponible"));
    afficher();
    expect(await screen.findByRole("alert")).toHaveTextContent("Aucune présence du corpus en base ne peut être attestée.");
    expect(screen.queryByText(/Aucun import de corpus enregistré/)).not.toBeInTheDocument();
  });
  it("affiche uniquement les reçus réellement renvoyés par le serveur", async () => {
    vi.spyOn(api, "get").mockResolvedValue([{ id: "recu", manifeste_sha256: "a".repeat(64), importe_le: "2026-11-06T12:00:00Z", bilan: { sources_creees: 62, sources_deja_presentes: 0, lignes_inventaire_a_rapprocher: 91, approbations_creees: 0 } }]);
    afficher();
    expect(await screen.findByText(/Sources créées : 62/)).toBeInTheDocument();
    expect(screen.getByText(/Approbations créées : 0/)).toBeInTheDocument();
  });
});
