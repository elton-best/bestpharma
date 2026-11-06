import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api-client";
import { RegistreDocumentaire } from "@/components/modules/registre-documentaire";
const definition = {
  titre: "Plan de formation", aide: "Saisie structurée, pas un émargement.", champ_titre: "theme", champ_date: "date_debut_prevue", peut_ecrire: true,
  source: { fichier: "Plan de formation.xlsx", reference: "Référence témoin", feuille: "Formulaire", sha256: "a".repeat(64) }, equipements: [],
  champs: [{ cle: "theme", libelle: "Thème", type: "text", obligatoire: true }, { cle: "date_debut_prevue", libelle: "Date prévue", type: "date", obligatoire: true }],
};
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
function afficher() {
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><RegistreDocumentaire officine="off-test" type="formations" /></QueryClientProvider>);
}
describe("suivis documentaires structurés", () => {
  it("enregistre les valeurs de la fiche et non une simple notification de réussite", async () => {
    vi.spyOn(api, "get").mockImplementation(async url => url.endsWith("definition") ? definition : { data: [], current_page: 1, last_page: 1, total: 0 });
    const post = vi.spyOn(api, "post").mockResolvedValue({ id: "suivi" });
    afficher();
    fireEvent.click(await screen.findByRole("button", { name: "Ajouter une fiche" }));
    fireEvent.change(screen.getByLabelText("Thème"), { target: { value: "Prévention des erreurs" } });
    fireEvent.change(screen.getByLabelText("Date prévue"), { target: { value: "2026-11-06" } });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    await waitFor(() => expect(post).toHaveBeenCalledWith("/officines/off-test/suivis-documentaires/formations", { statut: "planifie", donnees: { theme: "Prévention des erreurs", date_debut_prevue: "2026-11-06" } }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
  it("ne présente pas une panne du registre comme un suivi vide ou à jour", async () => {
    vi.spyOn(api, "get").mockImplementation(async url => { if (url.endsWith("definition")) return definition; throw new Error("Indisponible"); });
    afficher();
    expect(await screen.findByRole("alert")).toHaveTextContent("Ne considérez pas cette absence de données comme un suivi à jour.");
    expect(screen.queryByText("Aucun suivi enregistré pour ces critères.")).not.toBeInTheDocument();
  });
  it("conserve la modale et les valeurs après un refus du serveur", async () => {
    vi.spyOn(api, "get").mockImplementation(async url => url.endsWith("definition") ? definition : { data: [], current_page: 1, last_page: 1, total: 0 });
    vi.spyOn(api, "post").mockRejectedValue(new Error("Une date est incohérente."));
    afficher(); fireEvent.click(await screen.findByRole("button", { name: "Ajouter une fiche" }));
    fireEvent.change(screen.getByLabelText("Thème"), { target: { value: "Formation témoin" } });
    fireEvent.change(screen.getByLabelText("Date prévue"), { target: { value: "2026-11-06" } });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Une date est incohérente.");
    expect(screen.getByLabelText("Thème")).toHaveValue("Formation témoin");
  });
});
