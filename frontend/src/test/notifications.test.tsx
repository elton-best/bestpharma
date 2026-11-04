import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationsSheet } from "@/components/notifications-sheet";

const etat = vi.hoisted(() => ({ donnees: {} as Record<string, unknown> }));
vi.mock("@/lib/officine-context", () => ({ useOfficine: () => ({ courante: { officine_id: "off1" } }) }));
vi.mock("@tanstack/react-router", () => ({ useNavigate: () => vi.fn() }));
vi.mock("@tanstack/react-query", () => ({
  useQuery: ({ queryKey }: { queryKey: string[] }) => ({ data: etat.donnees[queryKey[0]], isLoading: false, isError: false }),
}));

function nombreAlertes() {
  const html = renderToString(<NotificationsSheet />);
  return html.match(/shadow-xs">(\d+)<\/span>/)?.[1] ?? "0";
}

describe("notifications issues de l'API", () => {
  beforeEach(() => { etat.donnees = {}; });
  it("n'invente aucune alerte sans données", () => {
    expect(nombreAlertes()).toBe("0");
  });
  it("signale l'absence pharmaceutique et une température décimale Laravel hors plage", () => {
    etat.donnees = {
      "pointage-actif": { pharmacien_present: false },
      "temp-stats-dash": { zones: { refrigeree_2_8: { temp_actuelle: "9.50" } } },
    };
    expect(nombreAlertes()).toBe("2");
  });
  it("signale une mesure manquante mais pas une mesure conforme", () => {
    etat.donnees = { "temp-stats-dash": { zones: { refrigeree_2_8: { temp_actuelle: null } } } };
    expect(nombreAlertes()).toBe("1");
    etat.donnees = { "temp-stats-dash": { zones: { refrigeree_2_8: { temp_actuelle: "5.00" } } } };
    expect(nombreAlertes()).toBe("0");
  });
  it("respecte le compteur Laravel des exigences restant à évaluer", () => {
    etat.donnees = { "bpd-campagne-dash": { campagne: {}, statistiques: { total_non_evalues: 1 } } };
    expect(nombreAlertes()).toBe("1");
    etat.donnees = { "bpd-campagne-dash": { campagne: {}, statistiques: { total_non_evalues: 0 } } };
    expect(nombreAlertes()).toBe("0");
  });
});
