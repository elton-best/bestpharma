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
