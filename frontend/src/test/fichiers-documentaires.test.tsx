import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api-client";
import { FichiersDocumentaires } from "@/components/modules/fichiers-documentaires";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
function afficher(statut = "brouillon") {
  const actualiser = vi.fn().mockResolvedValue(undefined);
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <FichiersDocumentaires officine="off-test" document="doc-test" version={2} indice={1} statut={statut} actualiser={actualiser} />
  </QueryClientProvider>);
  return actualiser;
}
describe("fichiers documentaires privés", () => {
  it("n'autorise pas de dépôt sur une fiche approuvée", async () => {
    vi.spyOn(api, "get").mockResolvedValue([]);
    afficher("valide");
    expect(screen.queryByLabelText("Ajouter un fichier documentaire")).not.toBeInTheDocument();
    expect(await screen.findByText("Aucun fichier conservé pour cette fiche.")).toBeInTheDocument();
  });
  it("transmet la version consultée puis recharge l'empreinte serveur", async () => {
    vi.spyOn(api, "get").mockResolvedValue([]);
    const upload = vi.spyOn(api, "uploadFile").mockResolvedValue({});
    const actualiser = afficher();
    const file = new File(["%PDF-1.4"], "preuve.pdf", { type: "application/pdf" });
    fireEvent.change(screen.getByLabelText("Ajouter un fichier documentaire"), { target: { files: [file] } });
    await waitFor(() => expect(upload).toHaveBeenCalledWith("/officines/off-test/documents/doc-test/fichiers", file, { version_document: "2", indice_revision: "1" }));
    await waitFor(() => expect(actualiser).toHaveBeenCalledOnce());
    expect(await screen.findByText(/Fichier conservé\. Relisez/)).toBeInTheDocument();
  });
  it("n'annonce aucun succès après un refus de dépôt", async () => {
    vi.spyOn(api, "get").mockResolvedValue([]);
    vi.spyOn(api, "uploadFile").mockRejectedValue(new Error("La version documentaire a changé."));
    const actualiser = afficher();
    fireEvent.change(screen.getByLabelText("Ajouter un fichier documentaire"), { target: { files: [new File(["%PDF"], "preuve.pdf")] } });
    expect(await screen.findByRole("alert")).toHaveTextContent("La version documentaire a changé.");
    expect(actualiser).not.toHaveBeenCalled();
  });
  it("ne présente pas une panne comme un historique vide", async () => {
    vi.spyOn(api, "get").mockRejectedValue(new Error("Indisponible"));
    afficher();
    expect(await screen.findByRole("alert")).toHaveTextContent("Les pièces jointes ne sont pas disponibles pour le moment.");
    expect(screen.queryByText("Aucun fichier conservé pour cette fiche.")).not.toBeInTheDocument();
  });
});
