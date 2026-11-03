import { describe, expect, it } from "vitest";
import { formatDate, formatFCFA, motDePasseRobuste } from "./format";

describe("Conventions produit", () => {
  it("affiche les dates en JJ/MM/AAAA, fuseau Porto-Novo", () => {
    expect(formatDate("2026-11-03T23:30:00Z")).toBe("04/11/2026");
  });
  it("affiche les montants en FCFA sans décimale", () => {
    expect(formatFCFA(1250.6)).toBe("1 251 FCFA");
  });
  it("exige un mot de passe robuste", () => {
    expect(motDePasseRobuste("court1A")).toBe(false);
    expect(motDePasseRobuste("motdepasselong1")).toBe(false);
    expect(motDePasseRobuste("MotDePasse2026")).toBe(true);
  });
});
