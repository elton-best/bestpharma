import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import reponsesDemo from "./reponses-demo.json";
import { api } from "@/lib/api-client";
vi.mock("@tanstack/react-router", () => ({ createFileRoute: () => (options: unknown) => ({ options, useSearch: () => ({}) }), useNavigate: () => vi.fn(), useLocation: () => ({ pathname: "/stock", search: {} }), useRouter: () => ({ navigate: vi.fn() }), Link: ({ children }: any) => <a>{children}</a> }));
vi.mock("@/lib/officine-context", () => ({ useOfficine: () => ({ courante: { officine_id: "off1", officine: { nom: "Recette", id: "off1" }, role: "pharmacien_titulaire" }, aRole: () => true, rattachements: [] }) }));
globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
it.each(["modeles", "non-conformites", "appareils", "auto-evaluation", "caisse", "comptabilite", "dispensation", "documents", "facturation", "personnel", "preparations", "stock", "stupefiants", "temperatures"])("ouvre l’écran %s avec les réponses de démonstration", async nom => {
  const fichiers = import.meta.glob("../routes/_authenticated/dashboard/*.tsx");
  const module: any = await fichiers[`../routes/_authenticated/dashboard/${nom === "caisse" ? "vente" : nom}.tsx`]();
  const reponses: Record<string, unknown> = reponsesDemo;
  vi.spyOn(api, "get").mockImplementation(async url => { const chemin = url.replace(/^\/api/, "").split("?")[0]; if (!(chemin in reponses)) throw new Error("Réponse de recette absente"); return reponses[chemin]; });
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Component = module.Route.options.component;
  render(<QueryClientProvider client={qc}><Component /></QueryClientProvider>);
  await waitFor(() => expect(qc.isFetching()).toBe(0));
  for (const input of screen.queryAllByPlaceholderText(/recherch/i)) fireEvent.change(input, { target: { value: "introuvable" } });
});

it("permet la saisie du code de connexion sans bloquer le défilement", async () => {
  const module: any = await import("../routes/auth");
  vi.spyOn(api, "getToken").mockReturnValue(null);
  vi.stubGlobal("fetch", vi.fn(async (url: string) => ({ ok: true, json: async () => url.endsWith("/access") ? { demonstration: true, password: "Begpharma2026!", code_mfa: "123456", comptes: [{ email: "pharmacien@begpharma.bj", role: "Pharmacien titulaire" }] } : { mfa_required: true, temp_token: "temp-demo" } })));
  const Component = module.Route.options.component;
  const { container } = render(<Component />);
  fireEvent.click(await screen.findByRole("button", { name: /Pharmacien titulaire/i }));
  const champ = await screen.findByRole("textbox", { name: "Code de vérification" });
  expect(champ).toHaveAttribute("autocomplete", "one-time-code");
  fireEvent.change(champ, { target: { value: "12a3456" } });
  expect(champ).toHaveValue("123456");
  expect(container.firstElementChild).not.toHaveClass("h-screen", "overflow-hidden");
  expect(container.firstElementChild).toHaveClass("min-h-dvh");
});
