import { useEffect, useState, type ComponentType } from "react";
import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  Home,
  Receipt,
  Stethoscope,
  ScanBarcode,
  ShoppingBag,
  Lock,
  TestTube,
  Thermometer,
  Building2,
  TickSquare,
  Clock,
  Users,
  FileText,
  DocumentText,
  TriangleWarning,
  Calendar,
  ChartLine,
  Mobile,
  User,
  Setting2,
  Shield,
  Logout,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "reicon-react";
import {
  Layers,
  Package,
  Boxes,
  MapPin,
  History,
  ScanLine,
  ClipboardList,
  CalendarDays,
  ShieldAlert,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { useOfficine } from "@/lib/officine-context";
import { deconnecter } from "@/lib/session";
import { fr } from "@/lib/i18n/fr";

type Icon = ComponentType<{ className?: string; size?: number; color?: string }>;

interface Leaf {
  to: string;
  label: string;
  icon: Icon;
  badge?: string;
  tab?: string;
}

interface Group {
  label: string;
  icon: Icon;
  badge?: string;
  isBorderedList?: boolean;
  children: Leaf[];
}

type NavEntry = Leaf | Group;

const NAV_ENTRIES: NavEntry[] = [
  { to: "/dashboard", label: "Tableau de bord", icon: Home },
  {
    label: "Comptoir & Caisse",
    icon: Receipt,
    children: [
      { to: "/dashboard/vente", label: "Caisse POS Tactile", icon: Receipt, badge: "e-MECeF" },
      { to: "/dashboard/dispensation", label: "Dispensation & Ordonnances", icon: Stethoscope },
      { to: "/dashboard/facturation", label: "Facturation DGI", icon: ScanBarcode },
    ],
  },
  {
    label: "Stock",
    icon: ShoppingBag,
    children: [
      { to: "/dashboard/stock", tab: "vue-ensemble", label: "Vue d’ensemble", icon: Layers },
      { to: "/dashboard/stock", tab: "produits", label: "Produits", icon: Package },
      { to: "/dashboard/stock", tab: "lots", label: "Lots", icon: Boxes, badge: "FEFO" },
      { to: "/dashboard/stock", tab: "emplacements", label: "Emplacements", icon: MapPin },
      { to: "/dashboard/stock", tab: "mouvements", label: "Mouvements", icon: History },
      { to: "/dashboard/stock", tab: "reception", label: "Réception", icon: ScanLine, badge: "Scan" },
      { to: "/dashboard/stock", tab: "inventaires", label: "Inventaires", icon: ClipboardList },
      { to: "/dashboard/stock", tab: "peremptions", label: "Péremptions", icon: CalendarDays },
      { to: "/dashboard/stock", tab: "quarantaine", label: "Quarantaine & Rappels", icon: ShieldAlert },
      { to: "/dashboard/stock", tab: "dechets", label: "Déchets", icon: Trash2 },
      { to: "/dashboard/stock", tab: "valorisation", label: "Valorisation", icon: TrendingUp },
    ],
  },
  {
    label: "Stupéfiants & Préparations",
    icon: Lock,
    children: [
      { to: "/dashboard/stupefiants", label: "Registre Stupéfiants", icon: Lock, badge: "Tab. B" },
      { to: "/dashboard/preparations", label: "Préparations Magistrales", icon: TestTube },
    ],
  },
  {
    label: "Qualité & BPD ABMed",
    icon: Shield,
    children: [
      { to: "/dashboard/temperatures", label: "Chaîne du froid (2-8°C)", icon: Thermometer },
      { to: "/dashboard/locaux", label: "Locaux & Matériel (5M)", icon: Building2 },
      { to: "/dashboard/auto-evaluation", label: "Auto-évaluation 267 Arts", icon: TickSquare },
      { to: "/dashboard/pointage", label: "Pointage Présence (Art 1.11)", icon: Clock },
      { to: "/dashboard/personnel", label: "Personnel & Ordre B", icon: Users },
      { to: "/dashboard/documents", label: "GED & Procédures", icon: FileText },
      { to: "/dashboard/modeles", label: "Modèles Types BPD (59)", icon: DocumentText },
      { to: "/dashboard/non-conformites", label: "Non-conformités & CAPA", icon: TriangleWarning },
      { to: "/dashboard/echeances", label: "Échéancier réglementaire", icon: Calendar },
    ],
  },
  {
    label: "Gestion & Finance",
    icon: ChartLine,
    children: [
      { to: "/dashboard/comptabilite", label: "Comptabilité SYSCOHADA", icon: ChartLine, badge: "OHADA" },
      { to: "/dashboard/journal", label: "Journal d'audit SHA-256", icon: FileText },
      { to: "/dashboard/appareils", label: "Appareils autorisés", icon: Mobile },
    ],
  },
  {
    label: "Compte & Officine",
    icon: Setting2,
    children: [
      { to: "/dashboard/compte", label: "Mon profil & Rôle", icon: User },
      { to: "/dashboard/parametres", label: "Paramètres Officine", icon: Setting2 },
      { to: "/dashboard/securite", label: "Sécurité & MFA", icon: Shield },
    ],
  },
];

export function AppSidebar({
  collapsed,
  onToggle,
  onNavigate,
}: {
  collapsed: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
}) {
  const currentPath = useRouterState({ select: (s) => s.location.pathname });
  const currentSearch = useRouterState({ select: (s) => s.location.search }) as Record<string, any>;
  const activeTab = currentSearch?.tab || "lots";
  const { courante } = useOfficine();
  const queryClient = useQueryClient();
  const router = useRouter();

  // Gestion des groupes ouverts
  const isChildActive = (c: Leaf) => {
    if (c.tab) {
      return (
        currentPath === c.to &&
        (currentSearch?.tab ? currentSearch.tab === c.tab : c.tab === "lots")
      );
    }
    return currentPath === c.to;
  };

  const isGroupActive = (g: Group) => g.children.some(isChildActive);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {
      Stock: true,
    };
    NAV_ENTRIES.forEach((e) => {
      if ("children" in e) init[e.label] = isGroupActive(e) || e.label === "Stock";
    });
    return init;
  });

  useEffect(() => {
    NAV_ENTRIES.forEach((e) => {
      if ("children" in e && isGroupActive(e)) {
        setOpenGroups((prev) => ({ ...prev, [e.label]: true }));
      }
    });
  }, [currentPath, activeTab]);

  function toggleGroup(label: string) {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  }

  async function handleLogout() {
    await deconnecter(queryClient, router);
  }

  const user = api.getUser();
  const nomUtilisateur = user?.name || user?.email || "Collaborateur";
  const emailUtilisateur = user?.email || "";
  const initiales = nomUtilisateur
    .split(/\s+/)
    .slice(0, 2)
    .map((m) => m[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <aside
      className={`sticky top-0 h-screen shrink-0 flex flex-col border-r border-[#CFE3D5] bg-white transition-[width] duration-300 z-30 font-sans ${
        collapsed ? "w-[72px]" : "w-64"
      }`}
    >
      {/* 1. Header supérieur avec Logo et Bouton Collapse */}
      <div
        className={`flex h-16 items-center border-b border-[#CFF1D2] px-4 ${
          collapsed ? "justify-center" : "justify-between"
        }`}
      >
        <Link
          to="/dashboard"
          onClick={onNavigate}
          className="flex items-center gap-2.5 focus-visible:outline-none group"
        >
          <div className="size-9 rounded-xl bg-[#0F3B27] flex items-center justify-center text-[#92FF5F] font-display font-black text-xl shadow-sm transition-transform group-hover:scale-105 border border-[#92FF5F]/30">
            +
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <span className="font-display font-black text-base text-[#0F3B27] tracking-tight block">
                BESTPHARMA
              </span>
              <span className="text-[11px] text-[#475C50] font-semibold truncate block">
                {courante?.officine?.nom || "Officine BPD"}
              </span>
            </div>
          )}
        </Link>

        {!collapsed && (
          <button
            type="button"
            onClick={onToggle}
            aria-label="Replier le menu"
            className="flex size-7 items-center justify-center rounded-lg border border-[#CFF1D2] text-[#475C50] hover:bg-[#CFF1D2]/40 hover:text-[#0F3B27] transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
        )}
      </div>

      {collapsed && (
        <button
          type="button"
          onClick={onToggle}
          aria-label="Déplier le menu"
          className="flex size-7 items-center justify-center rounded-lg border border-[#CFF1D2] text-[#475C50] hover:bg-[#CFF1D2]/40 hover:text-[#0F3B27] transition-colors mx-auto mt-3"
        >
          <ChevronRight size={16} />
        </button>
      )}

      {/* 2. Navigation avec accordéons inspirés d'InnerBuild */}
      <nav data-tour="sidebar-nav" className="flex-1 space-y-1.5 overflow-y-auto px-3 py-4 scrollbar-thin">
        {NAV_ENTRIES.map((entry) => {
          // Entrée feuille simple
          if (!("children" in entry)) {
            const active = currentPath === entry.to;
            return (
              <Link
                key={entry.to}
                to={entry.to as any}
                onClick={onNavigate}
                title={collapsed ? entry.label : undefined}
                className={`relative flex items-center gap-3 rounded-xl py-2.5 text-xs transition-all ${
                  collapsed ? "justify-center px-0" : "px-3"
                } ${
                  active
                    ? "bg-[#0F3B27] text-[#92FF5F] font-bold shadow-sm"
                    : "font-semibold text-[#475C50] hover:bg-[#CFF1D2]/30 hover:text-[#0F3B27]"
                }`}
              >
                <entry.icon size={18} className="shrink-0" />
                {!collapsed && <span className="min-w-0 flex-1 truncate">{entry.label}</span>}
              </Link>
            );
          }

          // Entrée groupe avec enfants
          const isOpen = !!openGroups[entry.label];
          const hasActive = isGroupActive(entry);

          if (collapsed) {
            return (
              <div key={entry.label} className="space-y-1 border-t border-[#CFF1D2]/60 pt-2 mt-2">
                {entry.children.map((child) => {
                  const active = isChildActive(child);
                  return (
                    <Link
                      key={child.label}
                      to={child.to as any}
                      search={child.tab ? ({ tab: child.tab } as any) : undefined}
                      onClick={onNavigate}
                      title={child.label}
                      className={`flex size-9 items-center justify-center rounded-xl mx-auto text-xs transition-colors ${
                        active
                          ? "bg-[#0F3B27] text-[#92FF5F] shadow-sm font-bold"
                          : "text-[#475C50] hover:bg-[#CFF1D2]/40 hover:text-[#0F3B27]"
                      }`}
                    >
                      <child.icon size={17} />
                    </Link>
                  );
                })}
              </div>
            );
          }

          return (
            <div key={entry.label} className="pt-0.5">
              <button
                type="button"
                onClick={() => toggleGroup(entry.label)}
                className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold transition-all cursor-pointer ${
                  isOpen
                    ? "text-[#0F3B27] bg-[#CFF1D2]/40"
                    : "text-[#475C50] hover:bg-[#CFF1D2]/25 hover:text-[#0F3B27]"
                } ${hasActive ? "text-[#0F3B27] font-extrabold" : ""}`}
              >
                <entry.icon size={17} className="shrink-0" />
                <span className="flex-1 text-left truncate">{entry.label}</span>
                <ChevronDown
                  size={14}
                  className={`transition-transform duration-200 text-[#475C50] ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              <div
                className={`grid transition-[grid-template-rows] duration-200 ${
                  isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                }`}
              >
                <div className="overflow-hidden">
                  <div className="relative ml-[19px] mt-1 space-y-0.5 pl-3 border-l-2 border-[#CFF1D2]">
                    {entry.children.map((child) => {
                      const active = isChildActive(child);
                      return (
                        <Link
                          key={child.label}
                          to={child.to as any}
                          search={child.tab ? ({ tab: child.tab } as any) : undefined}
                          onClick={onNavigate}
                          className={`flex items-center gap-2.5 rounded-lg py-1.5 px-2.5 text-xs transition-colors ${
                            active
                              ? "font-extrabold text-[#0F3B27] bg-[#CFF1D2] shadow-2xs"
                              : "font-medium text-[#475C50] hover:text-[#0F3B27] hover:bg-[#CFF1D2]/25"
                          }`}
                        >
                          <child.icon size={15} className={`shrink-0 ${active ? "text-[#0F3B27]" : "text-[#475C50]"}`} />
                          <span className="min-w-0 flex-1 truncate">{child.label}</span>
                          {child.badge && (
                            <span className="rounded-full bg-[#92FF5F]/25 border border-[#0F3B27]/15 px-1.5 py-0.2 text-[9px] font-extrabold text-[#0F3B27]">
                              {child.badge}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </nav>

      {/* 3. Footer utilisateur style InnerBuild (UserFooter) */}
      <div className="border-t border-[#CFF1D2] p-3 bg-[#F7F9F7]">
        <div className={`flex items-center gap-2.5 ${collapsed ? "flex-col" : ""}`}>
          <Link
            to="/dashboard/compte"
            onClick={onNavigate}
            className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl p-1.5 hover:bg-white transition-colors border border-transparent hover:border-[#CFF1D2]"
            title="Mon profil & réglages"
          >
            <div className="size-9 shrink-0 rounded-full bg-[#0F3B27] text-[#92FF5F] flex items-center justify-center font-bold text-xs shadow-xs border border-[#92FF5F]/30">
              {initiales || "DR"}
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <span className="block truncate text-xs font-bold text-[#0F3B27]">
                  {nomUtilisateur}
                </span>
                <span className="block truncate text-[11px] text-[#475C50]">
                  {courante?.role ? fr.roles[courante.role] : "Officine"}
                </span>
              </div>
            )}
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            title="Déconnexion"
            className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-[#CFF1D2] text-[#475C50] hover:bg-destructive/10 hover:border-destructive/30 hover:text-destructive transition-colors cursor-pointer"
          >
            <Logout size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
