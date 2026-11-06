import { afterEach, expect, it, vi } from "vitest";
import { api, ApiHttpError } from "@/lib/api-client";
afterEach(() => { localStorage.clear(); vi.unstubAllGlobals(); });
it("tolère un ancien cache illisible sans supprimer le jeton", () => {
  api.setToken("jeton-de-recette"); localStorage.setItem("begpharma.user", "undefined"); localStorage.setItem("begpharma.officines", "undefined");
  expect(api.getUser()).toBeNull(); expect(api.getOfficines()).toEqual([]); expect(api.getToken()).toBe("jeton-de-recette");
});
it("ignore une liste d’officines de forme incorrecte", () => {
  localStorage.setItem("begpharma.officines", '{"data":null}'); expect(api.getOfficines()).toEqual([]);
});
it("distingue une session refusée d’une panne du serveur", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 503, json: async () => ({ message: "Indisponible" }) })));
  await expect(api.get("/auth/me")).rejects.toMatchObject({ status: 503 });
  await expect(api.get("/auth/me")).rejects.toBeInstanceOf(ApiHttpError);
});
it("vérifie le compte et ses officines sans réutiliser une ancienne officine active", async () => {
  api.setToken("jeton-de-recette"); api.setUser({ id: "u", email: "u@example.test" });
  api.setOfficines([{id: "ancienne", nom: "Ancienne"}]); localStorage.setItem("begpharma.officine", "ancienne");
  const fetcher = vi.fn(async (_url: string, _options: RequestInit) => ({ok: true, json: async () => ({user: {id: "u", email: "u@example.test"}, officines: [{id: "actuelle", nom: "Actuelle"}]})}));
  vi.stubGlobal("fetch", fetcher);
  await api.synchroniserSession();
  expect(fetcher.mock.calls[0][1].headers).not.toHaveProperty("X-Officine-Id");
  expect(api.getOfficines()[0].id).toBe("actuelle"); expect(localStorage.getItem("begpharma.officine")).toBeNull();
});
it("ne détruit pas la connexion quand sa vérification est refusée", async () => {
  api.setToken("ancien-jeton");
  vi.stubGlobal("fetch", vi.fn(async () => ({ok: false, status: 401, json: async () => ({message: "Connexion requise"})})));
  await expect(api.synchroniserSession()).rejects.toMatchObject({status: 401});
  expect(api.getToken()).toBe("ancien-jeton");
});
