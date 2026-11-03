import { useEffect, useState, type ComponentType } from "react";
import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Home,
  Receipt,
  Stethoscope,
  QrCode,
  PackageCheck,
  BookOpenCheck,
  Lock,
  FlaskConical,
  Thermometer,
  Building2,
  CheckSquare,
  Clock,
  Users,
  FileText,
  LayoutTemplate,
  AlertTriangle,
  CalendarClock,
  Settings,
  ScrollText,
  Smartphone,
  ShieldCheck,
  User,
  Shield,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { useOfficine } from "@/lib/officine-context";
import { deconnecter } from "@/lib/session";
import { fr } from "@/lib/i18n/fr";

type Icon = ComponentType<{ className?: string; size?: number }>;

interface Leaf {
  to: string;
  label: string;
  icon: Icon;
  badge?: string;
}

interface Group {
  label: string;
  icon: Icon;
  children: Leaf[];
}

type NavEntry = Leaf | Group;

const NAV_ENTRIES: NavEntry[] = [
  { to: "/app", label: "Tableau de bord", icon: Home },
  {
    label: "Comptoir & Caisse",
    icon: Receipt,
    children: [
      { to: "/caisse", label: "Caisse POS Tactile", icon: Receipt, badge: "e-MECeF" },
      { to: "/dispensation", label: "Dispensation & Ordonnances", icon: Stethoscope },
      { to: "/facturation", label: "Facturation DGI", icon: QrCode },
    ],
  },
  {
    label: "Magasin & Stocks",
    icon: PackageCheck,
    children: [
      { to: "/stock", label: "Stock par Lots (FEFO)", icon: PackageCheck },
      { to: "/stupefiants", label: "Registre Stupéfiants", icon: Lock, badge: "Tab. B" },
      { to: "/preparations", label: "Préparations Magistrales", icon: FlaskConical },
    ],
  },
  {
    label: "Qualité & BPD ABMed",
    icon: ShieldCheck,
    children: [
      { to: "/temperatures", label: "Chaîne du froid (2-8°C)", icon: Thermometer },
      { to: "/locaux", label: "Locaux & Matériel (5M)", icon: Building2 },
      { to: "/auto-evaluation", label: "Auto-évaluation 267 Arts", icon: CheckSquare },
      { to: "/pointage", label: "Pointage Présence (Art 1.11)", icon: Clock },
      { to: "/personnel", label: "Personnel & Ordre B", icon: Users },
      { to: "/documents", label: "GED & Procédures", icon: FileText },
      { to: "/modeles", label: "Modèles Types BPD (59)", icon: LayoutTemplate },
      { to: "/non-conformites", label: "Non-conformités & CAPA", icon: AlertTriangle },
      { to: "/echeances", label: "Échéancier réglementaire", icon: CalendarClock },
    ],
  },
  {
    label: "Gestion & Finance",
    icon: BookOpenCheck,
    children: [
      { to: "/comptabilite", label: "Comptabilité SYSCOHADA", icon: BookOpenCheck, badge: "OHADA" },
      { to: "/journal", label: "Journal d'audit SHA-256", icon: ScrollText },
      { to: "/appareils", label: "Appareils autorisés", icon: Smartphone },
    ],
  },
  {
    label: "Compte & Officine",
    icon: Settings,
    children: [
      { to: "/compte", label: "Mon profil & Rôle", icon: User },
      { to: "/parametres", label: "Paramètres Officine", icon: Settings },
      { to: "/securite", label: "Sécurité & MFA", icon: Shield },
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
  const { courante } = useOfficine();
  const queryClient = useQueryClient();
  const router = useRouter();

  // Gestion des groupes ouverts
  const isGroupActive = (g: Group) => g.children.some((c) => c.to === currentPath);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    NAV_ENTRIES.forEach((e) => {
      if ("children" in e) init[e.label] = isGroupActive(e);
    });
    return init;
  });

  useEffect(() => {
    NAV_ENTRIES.forEach((e) => {
      if ("children" in e && isGroupActive(e)) {
        setOpenGroups((prev) => ({ ...prev, [e.label]: true }));
      }
    });
  }, [currentPath]);

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
        className={`flex h-16 items-center border-b border-[#CFE3D5] px-4 ${
          collapsed ? "justify-center" : "justify-between"
        }`}
      >
        <Link
          to="/app"
          onClick={onNavigate}
          className="flex items-center gap-2.5 focus-visible:outline-none group"
        >
          <div className="size-9 rounded-xl bg-[#023010] flex items-center justify-center text-white font-display font-black text-lg shadow-sm transition-transform group-hover:scale-105">
            +
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <span className="font-display font-black text-base text-[#023010] tracking-tight block">
                BEGPHARMA
              </span>
              <span className="text-[10px] text-[#5C6660] font-semibold truncate block">
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
            className="flex size-7 items-center justify-center rounded-lg border border-[#CFE3D5] text-[#5C6660] hover:bg-[#EFF7F1] hover:text-[#023010] transition-colors"
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
          className="flex size-7 items-center justify-center rounded-lg border border-[#CFE3D5] text-[#5C6660] hover:bg-[#EFF7F1] hover:text-[#023010] transition-colors mx-auto mt-3"
        >
          <ChevronRight size={16} />
        </button>
      )}

      {/* 2. Navigation avec accordéons inspirés d'InnerBuild */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-3.5 scrollbar-thin">
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
                    ? "bg-[#023010] text-white font-bold shadow-xs"
                    : "font-semibold text-[#5C6660] hover:bg-[#EFF7F1] hover:text-[#023010]"
                }`}
              >
                <entry.icon size={17} className="shrink-0" />
                {!collapsed && <span className="min-w-0 flex-1 truncate">{entry.label}</span>}
              </Link>
            );
          }

          // Entrée groupe avec enfants
          const isOpen = !!openGroups[entry.label];
          const hasActive = isGroupActive(entry);
          const activeIdx = entry.children.findIndex((c) => c.to === currentPath);

          if (collapsed) {
            return (
              <div key={entry.label} className="space-y-1 border-t border-[#CFE3D5]/60 pt-1.5 mt-1.5">
                {entry.children.map((child) => {
                  const active = currentPath === child.to;
                  return (
                    <Link
                      key={child.to}
                      to={child.to as any}
                      onClick={onNavigate}
                      title={child.label}
                      className={`flex size-9 items-center justify-center rounded-xl mx-auto text-xs transition-colors ${
                        active
                          ? "bg-[#023010] text-white shadow-xs"
                          : "text-[#5C6660] hover:bg-[#EFF7F1] hover:text-[#023010]"
                      }`}
                    >
                      <child.icon size={16} />
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
                    ? "text-[#023010] bg-[#EFF7F1]/80"
                    : "text-[#5C6660] hover:bg-[#EFF7F1]/50 hover:text-[#023010]"
                } ${hasActive ? "text-[#023010]" : ""}`}
              >
                <entry.icon size={16} className="shrink-0" />
                <span className="flex-1 text-left truncate">{entry.label}</span>
                <ChevronDown
                  size={14}
                  className={`transition-transform duration-200 text-[#5C6660] ${
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
                  <div className="relative ml-[19px] mt-1 space-y-0.5 pl-3 border-l border-[#CFE3D5]">
                    {entry.children.map((child) => {
                      const active = currentPath === child.to;
                      return (
                        <Link
                          key={child.to}
                          to={child.to as any}
                          onClick={onNavigate}
                          className={`flex items-center gap-2.5 rounded-lg py-1.5 px-2.5 text-xs transition-colors ${
                            active
                              ? "font-bold text-[#18AA38] bg-[#EFF7F1]"
                              : "font-medium text-[#5C6660] hover:text-[#023010] hover:bg-[#EFF7F1]/40"
                          }`}
                        >
                          <child.icon size={14} className="shrink-0" />
                          <span className="min-w-0 flex-1 truncate">{child.label}</span>
                          {child.badge && (
                            <span className="rounded-full bg-[#18AA38]/15 border border-[#18AA38]/30 px-1.5 py-0.2 text-[9px] font-bold text-[#023010]">
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
      <div className="border-t border-[#CFE3D5] p-3 bg-[#f8faf8]">
        <div className={`flex items-center gap-2.5 ${collapsed ? "flex-col" : ""}`}>
          <Link
            to="/compte"
            onClick={onNavigate}
            className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl p-1.5 hover:bg-white transition-colors"
            title="Mon profil & réglages"
          >
            <div className="size-9 shrink-0 rounded-full bg-[#023010] text-white flex items-center justify-center font-bold text-xs shadow-xs">
              {initiales || "DR"}
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <span className="block truncate text-xs font-bold text-[#1F2420]">
                  {nomUtilisateur}
                </span>
                <span className="block truncate text-[10px] text-[#5C6660]">
                  {courante?.role ? fr.roles[courante.role] : "Officine"}
                </span>
              </div>
            )}
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            title="Déconnexion"
            className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-[#CFE3D5] text-[#5C6660] hover:bg-destructive/10 hover:border-destructive/30 hover:text-destructive transition-colors cursor-pointer"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
