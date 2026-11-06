import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApprobationDocument } from "@/components/modules/approbation-document";

afterEach(cleanup);
describe("confirmation documentaire", () => {
  it("exige le mot de passe et une intention explicite", async () => {
    const signer = vi.fn().mockResolvedValue(undefined);
    const fermer = vi.fn();
    render(<ApprobationDocument ouvert onFermer={fermer} onSigner={signer} titreAction="Approuver la procédure" />);
    const bouton = screen.getByRole("button", { name: "Confirmer l’approbation" });
    expect(bouton).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Mot de passe de votre compte"), { target: { value: "ConfirmationTest!" } });
    expect(bouton).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(bouton);
    await waitFor(() => expect(signer).toHaveBeenCalledWith("ConfirmationTest!"));
    await waitFor(() => expect(fermer).toHaveBeenCalledOnce());
  });
  it("ne ferme pas la confirmation après un refus serveur et efface le secret", async () => {
    const fermer = vi.fn();
    render(<ApprobationDocument ouvert onFermer={fermer} onSigner={vi.fn().mockRejectedValue(new Error("Le document a changé."))} titreAction="Approuver" />);
    fireEvent.change(screen.getByLabelText("Mot de passe de votre compte"), { target: { value: "ConfirmationTest!" } });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Confirmer l’approbation" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Le document a changé.");
    expect(fermer).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Mot de passe de votre compte")).toHaveValue("");
  });
});
