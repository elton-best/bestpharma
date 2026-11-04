import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  NotificationBing,
  TickCircle,
  Thermometer,
  Clock,
  Receipt,
  ShoppingBag,
  FileText,
  ArrowRight,
} from "reicon-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useOfficine } from "@/lib/officine-context";
import { joursRestants } from "@/components/modules/commun";
import { SelecteurFiltrable } from "@/components/ui/selecteur-filtrable";

interface NotificationItem {
  id: string;
  type: "temp" | "presence" | "fefo" | "caisse" | "bpd";
  titre: string;
  description: string;
  heure: string;
  lu: boolean;
  lien: string;
  gravite: "haute" | "moyenne" | "info";
}

export function NotificationsSheet() {
  const { courante } = useOfficine();
  const id = courante?.officine_id;
  const [ouvert, setOuvert] = useState(false);
  const [filtre, setFiltre] = useState<"all" | "unread">("all");
  const [lusManuels, setLusManuels] = useState<string[]>([]);
  const navigate = useNavigate();

  // Récupérer le statut du pointage et des températures pour générer des notifications temps réel
  const { data: pointage, isLoading: presenceCharge, isError: presenceErreur } = useQuery({
    queryKey: ["pointage-actif", id],
    enabled: !!id,
    queryFn: async () => {
      return api.get<{ pharmacien_present: boolean; presence: any; pointages_actifs: any[] }>(
        `/api/officines/${id}/pointages/actif`
      );
    },
  });

  const { data: tempStats, isLoading: temperaturesCharge, isError: temperaturesErreur } = useQuery({
    queryKey: ["temp-stats-dash", id],
    enabled: !!id,
    queryFn: async () => {
      return api.get<any>(`/api/officines/${id}/temperatures/stats`);
    },
  });

  // Échéances qualité : les plus proches d'abord, pour ne rien laisser passer.
  const { data: echeances, isLoading: echeancesCharge, isError: echeancesErreur } = useQuery({
    queryKey: ["echeances", id],
    enabled: !!id,
    queryFn: () => api.get<any[]>(`/api/officines/${id}/echeances`),
  });

  // Lots du magasin : péremptions, quarantaine et ruptures de stock.
  const { data: stocks, isLoading: stocksCharge, isError: stocksErreur } = useQuery({
    queryKey: ["stocks", "tous", ""],
    enabled: !!id,
    queryFn: () => api.get<any>("/api/stocks"),
  });

  // Campagne d'auto-inspection en cours, s'il y en a une.
  const { data: campagne, isLoading: campagneCharge, isError: campagneErreur } = useQuery({
    queryKey: ["bpd-campagne-dash", id],
    enabled: !!id,
    queryFn: () => api.get<any>(`/api/officines/${id}/auto-evaluation/campagne-courante`),
  });

  const notifications: NotificationItem[] = [];

  // 1. Présence pharmaceutique continue
  if (pointage && !pointage.pharmacien_present) {
    notifications.push({
      id: "notif-presence",
      type: "presence",
      titre: "Aucun pharmacien pointé présent",
      description:
        "La dispensation doit rester sous la responsabilité d'un pharmacien : faites valider une prise de service.",
      heure: "Maintenant",
      lu: lusManuels.includes("notif-presence"),
      lien: "/pointage",
      gravite: "haute",
    });
  }

  // 2. Chaîne du froid
  const temperatureFrigo = tempStats?.zones?.refrigeree_2_8?.temp_actuelle;
  const frigoHorsPlage =
    temperatureFrigo != null && Number.isFinite(Number(temperatureFrigo)) &&
    (Number(temperatureFrigo) < 2 || Number(temperatureFrigo) > 8);
  if (frigoHorsPlage || (tempStats && temperatureFrigo == null)) {
    notifications.push({
      id: "notif-froid",
      type: "temp",
      titre: frigoHorsPlage ? "Enceinte réfrigérée hors plage" : "Relevé de température attendu",
      description: frigoHorsPlage
        ? "La dernière mesure est hors de la plage de conservation réfrigérée. Contrôlez les produits concernés et appliquez la procédure de quarantaine."
        : "Aucune mesure récente sur l'enceinte réfrigérée : contrôlez la chaîne du froid et émargez le relevé.",
      heure: "Aujourd'hui",
      lu: lusManuels.includes("notif-froid"),
      lien: "/temperatures",
      gravite: frigoHorsPlage ? "haute" : "moyenne",
    });
  }

  // 3. Lots à péremption proche ou déjà périmés
  const statsLots = stocks?.stats;
  if (statsLots && (statsLots.critiques_1m > 0 || statsLots.perimes > 0)) {
    notifications.push({
      id: "notif-fefo",
      type: "fefo",
      titre: "Lots à sortir en priorité",
      description: statsLots.perimes > 0
        ? "Des lots périmés doivent être retirés de la vente et mis en quarantaine immédiatement."
        : "Des lots arrivent à péremption prochainement. Priorisez les lots vendables qui périment le plus tôt.",
      heure: "Aujourd'hui",
      lu: lusManuels.includes("notif-fefo"),
      lien: "/stock",
      gravite: statsLots.perimes > 0 ? "haute" : "moyenne",
    });
  }

  // 4. Échéances réglementaires en retard ou imminentes
  const echeancesProches = (echeances ?? []).filter((e) => {
    if (e.fait || e.archived) return false;
    const jours = joursRestants(e.date_echeance);
    return jours <= 30;
  });
  if (echeancesProches.length > 0) {
    const enRetard = echeancesProches.filter((e) => joursRestants(e.date_echeance) < 0).length;
    notifications.push({
      id: "notif-echeances",
      type: "bpd",
      titre: "Échéances réglementaires à traiter",
      description: enRetard
        ? `Une partie des échéances du mois est dépassée. Ouvrez le calendrier pour les traiter ou les justifier.`
        : `Des échéances arrivent dans les trente jours : licence, visites médicales, contrôles métrologiques.`,
      heure: "Aujourd'hui",
      lu: lusManuels.includes("notif-echeances"),
      lien: "/echeances",
      gravite: enRetard ? "haute" : "moyenne",
    });
  }

  // 5. Campagne d'auto-inspection
  if (campagne?.campagne) {
    // Les articles restés « non évalués » sont la vraie mesure de l'avancement.
    const restants =
      campagne.statistiques?.total_non_evalues ??
      campagne.statistiques?.non_evalues ??
      campagne.stats?.non_evalues ??
      (campagne.evaluations ?? []).filter((e: any) => !e.cotation || e.cotation === "non_evalue").length;
    if (restants > 0) {
      notifications.push({
        id: "notif-bpd",
        type: "bpd",
        titre: "Auto-inspection qualité en cours",
        description:
          "Des exigences du référentiel restent à coter. L'inspection peut demander le rapport signé à tout moment.",
        heure: "Cette semaine",
        lu: lusManuels.includes("notif-bpd"),
        lien: "/auto-evaluation",
        gravite: "info",
      });
    }
  }

  const chargement = presenceCharge || temperaturesCharge || echeancesCharge || stocksCharge || campagneCharge;
  const erreur = presenceErreur || temperaturesErreur || echeancesErreur || stocksErreur || campagneErreur;
  const nonLues = notifications.filter((n) => !n.lu);
  const elementsAffiches = filtre === "unread" ? nonLues : notifications;

  function marquerTousLus() {
    setLusManuels(notifications.map((n) => n.id));
  }

  function marquerLu(id: string, lien: string) {
    if (!lusManuels.includes(id)) {
      setLusManuels((prev) => [...prev, id]);
    }
    setOuvert(false);
    navigate({ to: lien as any });
  }

  function getIcon(type: NotificationItem["type"]) {
    switch (type) {
      case "presence":
        return <Clock size={16} className="text-[#FF7036]" />;
      case "temp":
        return <Thermometer size={16} className="text-[#0F3B27]" />;
      case "fefo":
        return <ShoppingBag size={16} className="text-[#0F3B27]" />;
      case "caisse":
        return <Receipt size={16} className="text-[#0F3B27]" />;
      case "bpd":
        return <FileText size={16} className="text-[#0F3B27]" />;
    }
  }

  return (
    <Sheet open={ouvert} onOpenChange={setOuvert}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="Centre de notifications"
          className="relative flex size-12 items-center justify-center rounded-xl border border-[#CFF1D2] bg-white text-[#0F3B27] hover:bg-[#CFF1D2]/30 transition-colors shadow-xs"
        >
          <NotificationBing size={18} />
          {nonLues.length > 0 && (
            <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-[#FF7036] text-[9px] font-black text-white shadow-xs">
              {nonLues.length}
            </span>
          )}
        </button>
      </SheetTrigger>

      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col bg-white border-l border-[#CFF1D2] text-[#0F3B27]">
        {/* Header */}
        <SheetHeader className="p-5 border-b border-[#CFF1D2] flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-[#0F3B27] flex items-center justify-center text-[#92FF5F] shadow-xs">
              <NotificationBing size={20} />
            </div>
            <div>
              <SheetTitle className="text-base font-extrabold font-display text-[#0F3B27]">
                Centre de notifications
              </SheetTitle>
              <p className="text-xs text-[#475C50]">Alertes réglementaires BPD & flux officine</p>
            </div>
          </div>
          {nonLues.length > 0 && (
            <button
              type="button"
              onClick={marquerTousLus}
              className="inline-flex min-h-12 items-center gap-1 text-xs font-bold text-[#0F3B27] hover:underline cursor-pointer"
            >
              <TickCircle size={15} className="text-[#0F3B27]" /> Tout lire
            </button>
          )}
        </SheetHeader>

        {/* Filtre */}
        <div className="border-b border-[#CFF1D2] bg-[#F7F9F7] px-5 py-2.5">
          <SelecteurFiltrable
            options={[
              { valeur: "all", libelle: `Toutes les alertes (${notifications.length})`, motsCles: ["tout"] },
              { valeur: "unread", libelle: `Non lues (${nonLues.length})`, motsCles: ["nouvelles", "à lire"] },
            ]}
            valeur={filtre}
            onChange={(v) => setFiltre(v as "all" | "unread")}
            placeholder="Toutes les alertes"
            placeholderRecherche="Filtrer : toutes, non lues…"
          />
        </div>

        {chargement && <p role="status" className="px-5 py-3 text-xs">Actualisation des alertes…</p>}
        {erreur && <p role="alert" className="px-5 py-3 text-xs text-amber-800">Certaines alertes ne peuvent pas être vérifiées. Réessayez ou consultez les modules concernés.</p>}
        {/* Liste des Notifications */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#CFF1D2]/60">
          {elementsAffiches.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center text-[#475C50]">
              <div className="size-14 rounded-2xl bg-[#CFF1D2]/40 flex items-center justify-center mb-3">
                <NotificationBing size={28} className="text-[#0F3B27]" />
              </div>
              <p className="text-sm font-bold text-[#0F3B27]">Aucune notification</p>
              <p className="text-xs mt-1">
                {filtre === "unread" ? "Toutes vos alertes sont traitées !" : erreur ? "Vérification des alertes incomplète." : chargement ? "Vérification en cours." : "Aucune alerte pour l'instant."}
              </p>
            </div>
          ) : (
            elementsAffiches.map((notif) => (
              <div
                key={notif.id}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); marquerLu(notif.id, notif.lien); } }}
                onClick={() => marquerLu(notif.id, notif.lien)}
                className={`p-4 transition-colors cursor-pointer flex items-start gap-3 hover:bg-[#CFF1D2]/20 ${
                  !notif.lu ? "bg-[#CFF1D2]/10 font-medium" : ""
                }`}
              >
                <div className="size-9 rounded-xl bg-white border border-[#CFF1D2] flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                  {getIcon(notif.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-xs ${notif.lu ? "text-[#0F3B27]" : "text-[#0F3B27] font-bold"}`}>
                      {notif.titre}
                    </p>
                    <span className="text-[10px] text-[#475C50] shrink-0 font-medium">{notif.heure}</span>
                  </div>
                  <p className="text-xs text-[#475C50] mt-1 line-clamp-2 leading-relaxed">
                    {notif.description}
                  </p>
                  <div className="mt-2 flex items-center gap-1.5 text-xs font-bold text-[#0F3B27]">
                    <span>Consulter le module</span>
                    <ArrowRight size={13} />
                  </div>
                </div>
                {!notif.lu && (
                  <span className="size-2 rounded-full bg-[#FF7036] shrink-0 mt-1.5" />
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[#CFF1D2] bg-[#F7F9F7] text-center text-xs text-[#475C50]">
          BEGPHARMA · Alertes et conformité de l'officine
        </div>
      </SheetContent>
    </Sheet>
  );
}
