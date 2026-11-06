import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConnexionDonnees, messageConnexion } from "@/components/connexion-donnees";
import { api, ApiHttpError } from "@/lib/api-client";
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
it("distingue une connexion expirée d’une officine interdite et d’une panne", () => {
  expect(messageConnexion(new ApiHttpError("",401))).toContain("Reconnectez-vous");
  expect(messageConnexion(new ApiHttpError("",403))).toContain("officine");
  expect(messageConnexion(new ApiHttpError("",503))).toContain("conservée");
});
it("resynchronise la connexion avant de recharger les modèles", async () => {
  const synchroniser = vi.spyOn(api,"synchroniserSession").mockResolvedValue(); const reessayer = vi.fn();
  render(<QueryClientProvider client={new QueryClient()}><ConnexionDonnees erreur={new ApiHttpError("",403)} reessayer={reessayer} /></QueryClientProvider>);
  fireEvent.click(screen.getByRole("button", {name:"Vérifier et recharger"}));
  await waitFor(() => expect(reessayer).toHaveBeenCalledOnce()); expect(synchroniser).toHaveBeenCalledOnce();
});
