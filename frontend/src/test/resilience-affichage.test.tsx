import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { formatDate, formatDateHeure } from "@/lib/format";
import { SelecteurFiltrable } from "@/components/ui/selecteur-filtrable";
afterEach(cleanup);
describe("affichage des données incomplètes", () => {
  it.each([undefined, null, "", "pas une date", new Date("invalide")])("ne plante pas pour une date absente ou invalide : %s", date => {
    expect(formatDate(date)).toBe("Date non renseignée");
    expect(formatDateHeure(date)).toBe("Date non renseignée");
  });
  it("conserve la date réelle dans le fuseau béninois", () => {
    expect(formatDate("2026-11-06")).toBe("06/11/2026");
  });
  it("tolère une liste de choix pas encore chargée", () => {
    render(<SelecteurFiltrable options={undefined as never} valeur="" />);
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });
});
