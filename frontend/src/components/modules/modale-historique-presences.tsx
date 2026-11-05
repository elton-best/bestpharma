import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Download,
  Search,
  LogIn,
  LogOut,
  Calendar,
  Filter,
} from "lucide-react";
import { telechargerCsv } from "@/lib/export-utils";

interface ModaleHistoriquePresencesProps {
  ouvert: boolean;
  onFermer: () => void;
  pointages: any[];
  employes: any[];
}

export function ModaleHistoriquePresences({
  ouvert,
  onFermer,
  pointages,
  employes,
}: ModaleHistoriquePresencesProps) {
  const [recherche, setRecherche] = useState("");
  const [filtreType, setFiltreType] = useState<"tous" | "arrivee" | "depart">("tous");

  const employeMap = useMemo(() => {
    const map = new Map<string, any>();
    employes.forEach((e) => map.set(e.id, e));
    return map;
  }, [employes]);

  const pointagesFiltres = useMemo(() => {
    return pointages.filter((p) => {
      const emp = employeMap.get(p.employe_id);
      const nom = emp?.nom_complet || p.employe_nom || "";
      if (recherche.trim()) {
        const q = recherche.toLowerCase().trim();
        if (!nom.toLowerCase().includes(q) && !(p.horodatage || "").includes(q)) {
          return false;
        }
      }
      if (filtreType !== "tous" && p.type !== filtreType) {
        return false;
      }
      return true;
    });
  }, [pointages, employeMap, recherche, filtreType]);

  const exporterCsv = () => {
    telechargerCsv(
      pointagesFiltres.map((p) => {
        const emp = employeMap.get(p.employe_id);
        const d = new Date(p.horodatage);
        return {
          date: d.toLocaleDateString("fr-FR"),
          heure: d.toLocaleTimeString("fr-FR"),
          employe: emp?.nom_complet || p.employe_nom || "Inconnu",
          poste: emp?.poste || "N/A",
          type: p.type === "arrivee" ? "Arrivée" : "Départ",
          methode: p.methode || "Borne H24",
        };
      }),
      `historique_presences_${new Date().toISOString().split("T")[0]}`,
      [
        { cle: "date", label: "Date" },
        { cle: "heure", label: "Heure" },
        { cle: "employe", label: "Collaborateur" },
        { cle: "poste", label: "Fonction" },
        { cle: "type", label: "Événement" },
        { cle: "methode", label: "Mode de pointage" },
      ]
    );
  };

  return (
    <Dialog open={ouvert} onOpenChange={(v) => !v && onFermer()}>
      <DialogContent className="max-w-4xl w-[94vw] h-[85vh] bg-white border border-[#CFF1D2] rounded-2xl shadow-2xl p-0 flex flex-col overflow-hidden">
        {/* HEADER */}
        <DialogHeader className="p-5 bg-white border-b border-[#CFF1D2] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0">
          <div>
            <DialogTitle className="text-base sm:text-lg font-bold text-[#0F3B27] font-display flex items-center gap-2">
              <Calendar className="size-5 text-[#0F3B27]" />
              Historique Horodaté des Présences
            </DialogTitle>
            <p className="text-xs text-[#475C50] mt-0.5">
              Registre inaltérable de tous les flux d'entrées et sorties certifiés ({pointagesFiltres.length} enregistrements).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={exporterCsv}
              size="sm"
              className="bg-[#0F3B27] hover:bg-[#164E35] text-[#92FF5F] text-xs font-bold gap-1.5 rounded-xl h-8"
            >
              <Download className="size-3.5" /> Exporter CSV
            </Button>
            <Button
              onClick={onFermer}
              variant="outline"
              size="sm"
              className="border-[#CFF1D2] text-[#0F3B27] text-xs rounded-xl h-8"
            >
              Fermer
            </Button>
          </div>
        </DialogHeader>

        {/* BARRE DE FILTRES */}
        <div className="p-3 bg-[#F7F9F7] border-b border-[#CFF1D2] flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-[#475C50]" />
            <Input
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Rechercher par collaborateur, date..."
              className="pl-8 h-8 text-xs rounded-xl border-[#CFF1D2] bg-white"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <Filter className="size-3.5 text-[#475C50]" />
            <span className="text-xs text-[#475C50] mr-1">Filtrer :</span>
            <button
              type="button"
              onClick={() => setFiltreType("tous")}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                filtreType === "tous"
                  ? "bg-[#0F3B27] text-white"
                  : "bg-white border border-[#CFF1D2] text-[#0F3B27]"
              }`}
            >
              Tous
            </button>
            <button
              type="button"
              onClick={() => setFiltreType("arrivee")}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                filtreType === "arrivee"
                  ? "bg-emerald-600 text-white"
                  : "bg-white border border-[#CFF1D2] text-emerald-800"
              }`}
            >
              Arrivées
            </button>
            <button
              type="button"
              onClick={() => setFiltreType("depart")}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                filtreType === "depart"
                  ? "bg-amber-600 text-white"
                  : "bg-white border border-[#CFF1D2] text-amber-800"
              }`}
            >
              Départs
            </button>
          </div>
        </div>

        {/* TABLEAU DES POINTAGES */}
        <div className="flex-1 overflow-auto p-4">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#CFF1D2] text-[#475C50] font-bold">
                <th className="py-2.5 px-3">Date & Heure</th>
                <th className="py-2.5 px-3">Collaborateur</th>
                <th className="py-2.5 px-3">Fonction</th>
                <th className="py-2.5 px-3">Événement</th>
                <th className="py-2.5 px-3">Méthode</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#CFF1D2]/40">
              {pointagesFiltres.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-xs text-[#475C50]">
                    Aucun pointage trouvé pour ces critères.
                  </td>
                </tr>
              ) : (
                pointagesFiltres.map((p, idx) => {
                  const emp = employeMap.get(p.employe_id);
                  const dateObj = new Date(p.horodatage);
                  const estArrivee = p.type === "arrivee";

                  return (
                    <tr key={idx} className="hover:bg-[#F7F9F7]/80 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-medium text-[#0F3B27]">
                        <div>{dateObj.toLocaleDateString("fr-FR")}</div>
                        <div className="text-[11px] text-[#475C50] font-bold">
                          {dateObj.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                        </div>
                      </td>

                      <td className="py-2.5 px-3 font-bold text-[#0F3B27]">
                        <div className="flex items-center gap-2">
                          <div className="size-6 rounded-md bg-[#0F3B27]/10 text-[#0F3B27] flex items-center justify-center font-bold text-[10px] shrink-0">
                            {emp?.photo_url ? (
                              <img src={emp.photo_url} alt="" className="size-full rounded-md object-cover" />
                            ) : (
                              (emp?.nom_complet || "P").charAt(0)
                            )}
                          </div>
                          <span>{emp?.nom_complet || p.employe_nom || "Collaborateur"}</span>
                        </div>
                      </td>

                      <td className="py-2.5 px-3 text-[#475C50] capitalize">
                        {emp?.poste ? emp.poste.replace("_", " ") : "Officine"}
                      </td>

                      <td className="py-2.5 px-3">
                        <Badge
                          className={
                            estArrivee
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold gap-1 text-[10px]"
                              : "bg-amber-100 text-amber-800 border border-amber-300 font-bold gap-1 text-[10px]"
                          }
                        >
                          {estArrivee ? (
                            <>
                              <LogIn className="size-3" /> Arrivée
                            </>
                          ) : (
                            <>
                              <LogOut className="size-3" /> Départ
                            </>
                          )}
                        </Badge>
                      </td>

                      <td className="py-2.5 px-3 text-muted-foreground text-[11px]">
                        {p.methode || "Borne Tablette H24"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
