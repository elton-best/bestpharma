import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api-client";
import { CanevasCatalogue, ContenuCanevas, htmlCanevas, lireCanevas, texteCanevas, type Canevas } from "@/components/modules/canevas-documentaires";
const c: Canevas = { id: "c-source", titre: "PRO-Canevas témoin", rubrique: "Qualité", fichier: "Qualité/Canevas.docx", sha256: "a".repeat(64), images: {}, parties: [{ origine: "document", blocs: [
  { cle: "titre", type: "paragraphe", texte: "Objet de la procédure" },
  { cle: "table", type: "tableau", lignes: [[{ cle: "responsable", texte: "", largeur: 2, hauteur: 1 }]] },
] }] };
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
describe("canevas structurés", () => {
  it("conserve le tableau fusionné et rend la zone vide modifiable", () => {
    const changer = vi.fn();
    const { container } = render(<ContenuCanevas canevas={c} valeurs={{}} changer={changer} />);
    expect(container.querySelector("td")).toHaveAttribute("colspan", "2");
    const cellule = screen.getByLabelText(/Cellule du tableau/);
    fireEvent.change(cellule, { target: { value: "Responsable de recette" } });
    expect(changer).toHaveBeenCalledWith("responsable", "Responsable de recette");
    expect(c.parties[0].blocs[1].lignes![0][0].texte).toBe("");
  });
  it("relit les valeurs enregistrées et échappe les textes pour l’impression", () => {
    const contenu = JSON.stringify({ schema: "begpharma.canevas-rempli.v1", canevas: c, valeurs: { responsable: "<script>interdit</script>" } });
    expect(lireCanevas(contenu)?.canevas.id).toBe(c.id);
    expect(htmlCanevas(contenu)).toContain("&lt;script&gt;");
    expect(htmlCanevas(contenu)).not.toContain("<script>");
    expect(texteCanevas(contenu)).toContain("Objet de la procédure");
    expect(texteCanevas(contenu)).not.toContain("begpharma.canevas-rempli");
    expect(lireCanevas("Texte ancien")).toBeNull();
  });
  it("consulte une référence annotée sans proposer de saisie ou d’enregistrement", async () => {
    const reference: Canevas = { ...c, usage: "reference", format: "pdf", titre: "Liste annotée", parties: [{origine: "Page témoin", blocs: [{cle: "note", type: "paragraphe", texte: "Observation du document source"}]}] };
    vi.spyOn(api, "get").mockImplementation(async url => url.endsWith("/canevas") ? [reference] : reference);
    const post = vi.spyOn(api, "post");
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><CanevasCatalogue officine="off1" /></QueryClientProvider>);
    const ouvrir = await screen.findByRole("button", {name: "Consulter le document"});
    fireEvent.click(ouvrir);
    expect(await screen.findByText(/sans validation réglementaire implicite/)).toBeInTheDocument();
    expect(screen.queryByRole("button", {name: "Enregistrer le brouillon"})).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();
  });
  it("ouvre les feuilles Excel et conserve la saisie lors du changement de feuille", async () => {
    const excel: Canevas = { ...c, format: "xlsx", parties: [
      { origine: "Plan", blocs: [{ cle: "p", type: "tableau", lignes: [[{ cle: "a", texte: "Formation", largeur: 2, hauteur: 1 }]] }] },
      { origine: "Suivi", blocs: [{ cle: "s", type: "tableau", lignes: [[{ cle: "b", texte: "Intervention", largeur: 1, hauteur: 1 }]] }] },
    ] };
    const changer = vi.fn();
    render(<ContenuCanevas canevas={excel} valeurs={{ b: "Réalisée" }} changer={changer} />);
    expect(screen.getByDisplayValue("Formation")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.click(await screen.findByRole("button", { name: "Suivi" }));
    expect(screen.getByDisplayValue("Réalisée")).toBeInTheDocument();
    fireEvent.change(screen.getByDisplayValue("Réalisée"), {target: {value: "Contrôlée"}});
    expect(changer).toHaveBeenCalledWith("b", "Contrôlée");
    expect(screen.queryByDisplayValue("Formation")).not.toBeInTheDocument();
  });
  it("enregistre la saisie dans le canevas choisi avec un processus confirmé", async () => {
    vi.spyOn(api, "get").mockImplementation(async url => url.endsWith("/canevas") ? [c] : c);
    const post = vi.spyOn(api, "post").mockResolvedValue({ mode_demo: true });
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><CanevasCatalogue officine="off1" /></QueryClientProvider>);
    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.click(await screen.findByRole("button", { name: /PRO-Canevas témoin/ }));
    const ouvrir = screen.getByRole("button", { name: "Compléter ce modèle" });
    await waitFor(() => expect(ouvrir).toBeEnabled()); fireEvent.click(ouvrir);
    expect(screen.getByRole("button", { name: "Enregistrer le brouillon" })).toBeDisabled();
    fireEvent.click(screen.getByRole("combobox", { name: /Choisir une section/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Qualité et amélioration" }));
    fireEvent.change(screen.getByLabelText(/Cellule du tableau/), { target: { value: "Équipe de recette" } });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer le brouillon" }));
    await waitFor(() => expect(post).toHaveBeenCalledWith("/officines/off1/canevas/c-source/documents", { valeurs: { responsable: "Équipe de recette" }, processus: "QAM", type_doc: "procedure" }));
    expect(await screen.findByRole("status")).toHaveTextContent("démonstration");
  });
});
