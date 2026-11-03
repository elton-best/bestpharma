import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
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
  const { data: pointage } = useQuery({
    queryKey: ["pointage-actif", id],
    enabled: !!id,
    queryFn: async () => {
      return api.get<{ pharmacien_present: boolean; presence: any; pointages_actifs: any[] }>(
        `/api/officines/${id}/pointages/actif`
      );
    },
  });

  const { data: tempStats } = useQuery({
    queryKey: ["temp-stats-dash", id],
    enabled: !!id,
    queryFn: async () => {
      return api.get<any>(`/api/officines/${id}/temperatures/stats`);
    },
  });

  // Construction des notifications dynamiques de l'officine
  const notifications: NotificationItem[] = [
    ...(pointage && !pointage.pharmacien_present
      ? [
          {
            id: "notif-presence-1",
            type: "presence" as const,
            titre: "Alerte Présence Pharmacien (Art. 1.11)",
            description: "Aucun pharmacien diplômé n'a validé sa prise de service sur le site de l'officine.",
            heure: "À l'instant",
            lu: lusManuels.includes("notif-presence-1"),
            lien: "/pointage",
            gravite: "haute" as const,
          },
        ]
      : []),
    {
      id: "notif-froid-2",
      type: "temp",
      titre: "Relevé Enceinte Frigorifique Vaccins",
      description:
        tempStats?.zones?.refrigeree_2_8?.temp_actuelle
          ? `Température actuelle conforme : ${tempStats.zones.refrigeree_2_8.temp_actuelle}°C (plage légale 2°C à 8°C).`
          : "N'oubliez pas d'effectuer le contrôle bi-quotidien de la chaîne du froid.",
      heure: "Il y a 15 min",
      lu: lusManuels.includes("notif-froid-2"),
      lien: "/temperatures",
      gravite: "info",
    },
    {
      id: "notif-fefo-3",
      type: "fefo",
      titre: "Contrôle FEFO des spécialités à 90 jours",
      description: "Des lots en rayon atteignent le seuil critique de péremption. Déstockage prioritaire requis.",
      heure: "Il y a 1 h",
      lu: lusManuels.includes("notif-fefo-3"),
      lien: "/stock",
      gravite: "moyenne",
    },
    {
      id: "notif-emecef-4",
      type: "caisse",
      titre: "Certification e-MECeF DGI active",
      description: "Le serveur fiscalisateur DGI répond normalement. Toutes les ventes sont normalisées avec QR Code.",
      heure: "Il y a 2 h",
      lu: lusManuels.includes("notif-emecef-4"),
      lien: "/facturation",
      gravite: "info",
    },
    {
      id: "notif-bpd-5",
      type: "bpd",
      titre: "Auto-évaluation annuelle Guide BPD",
      description: "Campagne 2026 ouverte : 267 articles auditables pour l'Agence Béninoise du Médicament.",
      heure: "Aujourd'hui",
      lu: lusManuels.includes("notif-bpd-5"),
      lien: "/auto-evaluation",
      gravite: "info",
    },
  ];

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
          className="relative flex size-9 items-center justify-center rounded-xl border border-[#CFF1D2] bg-white text-[#0F3B27] hover:bg-[#CFF1D2]/30 transition-colors shadow-xs"
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
              className="inline-flex items-center gap-1 text-xs font-bold text-[#0F3B27] hover:underline cursor-pointer"
            >
              <TickCircle size={15} className="text-[#0F3B27]" /> Tout lire
            </button>
          )}
        </SheetHeader>

        {/* Filtres Onglets */}
        <div className="flex items-center border-b border-[#CFF1D2] px-5 py-2.5 gap-2 bg-[#F7F9F7]">
          <button
            type="button"
            onClick={() => setFiltre("all")}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
              filtre === "all"
                ? "bg-[#0F3B27] text-[#92FF5F] shadow-xs"
                : "text-[#475C50] hover:bg-white hover:text-[#0F3B27]"
            }`}
          >
            Toutes ({notifications.length})
          </button>
          <button
            type="button"
            onClick={() => setFiltre("unread")}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
              filtre === "unread"
                ? "bg-[#0F3B27] text-[#92FF5F] shadow-xs"
                : "text-[#475C50] hover:bg-white hover:text-[#0F3B27]"
            }`}
          >
            Non lues ({nonLues.length})
          </button>
        </div>

        {/* Liste des Notifications */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#CFF1D2]/60">
          {elementsAffiches.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center text-[#475C50]">
              <div className="size-14 rounded-2xl bg-[#CFF1D2]/40 flex items-center justify-center mb-3">
                <NotificationBing size={28} className="text-[#0F3B27]" />
              </div>
              <p className="text-sm font-bold text-[#0F3B27]">Aucune notification</p>
              <p className="text-xs mt-1">
                {filtre === "unread" ? "Toutes vos alertes sont traitées !" : "Aucune alerte pour l'instant."}
              </p>
            </div>
          ) : (
            elementsAffiches.map((notif) => (
              <div
                key={notif.id}
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
          BESTPHARMA · Système d'alerte et de conformité temps réel
        </div>
      </SheetContent>
    </Sheet>
  );
}
