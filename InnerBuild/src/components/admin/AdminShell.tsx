import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import {
  BookOpen, Card, ChartLine, ChevronDown, ChevronLeft, ChevronRight, FolderOpen, Home, Logout, Menu,
  ShieldCheck, User, Users, X, ChartSuccess, Target,
} from "reicon-react";
import { Megaphone, Library, AlignLeft, FileText, Images, Trophy } from "lucide-react";
import { Logo, LogoMark } from "@/components/Logo";
import { getD1SessionUser, clearD1Session } from "@/lib/d1-session";
import { initials, useProfile } from "@/lib/learner";
import { identifyUser, resetUser } from "@/lib/posthog";
import { useAdmin } from "@/lib/admin";
import { AdminNotifications } from "./AdminNotifications";

type Path =
  | "/admin"
  | "/admin/cours"
  | "/admin/lecons"
  | "/admin/quiz"
  | "/admin/rendus"
  | "/admin/challenges"
  | "/admin/apprenants"
  | "/admin/certificats"
  | "/admin/tracabilite"
  | "/admin/candidatures"
  | "/admin/paiements"
  | "/admin/annonces"
  | "/admin/communaute"
  | "/admin/skills"
  | "/admin/ressources";

type Icon = ComponentType<{ size?: number; className?: string }>;
type Leaf = { to: Path; label: string; icon: Icon; count?: "pay" | "subs" | "cand" };
type Entry = Leaf | { label: string; icon: Icon; children: Leaf[] };

const entries: Entry[] = [
  { to: "/admin", label: "Pilotage", icon: Home },
  {
    label: "Challenges InnerBuild",
    icon: Trophy,
    children: [
      { to: "/admin/challenges", label: "Challenges & Jury", icon: Trophy },
    ],
  },
  {
    label: "Formations",
    icon: BookOpen,
    children: [
      { to: "/admin/cours", label: "Cours", icon: BookOpen },
      { to: "/admin/lecons", label: "Création leçons (Texte, PDF, Mixtes)", icon: FolderOpen },
      { to: "/admin/quiz", label: "Quiz & Exercices", icon: Target },
    ],
  },
  {
    label: "Correction",
    icon: FolderOpen,
    children: [
      { to: "/admin/rendus", label: "File de correction", icon: FolderOpen, count: "subs" },
    ],
  },
  {
    label: "Communauté & Contenus",
    icon: Users,
    children: [
      { to: "/admin/communaute", label: "Forum & Cohorte", icon: Users },
      { to: "/admin/annonces", label: "Agenda & Keynotes Live", icon: Megaphone },
      { to: "/admin/skills", label: "Skills & Modèles MD", icon: Library },
      { to: "/admin/ressources", label: "Ressources apprenants", icon: Images },
    ],
  },
  {
    label: "Suivi & Données",
    icon: ChartLine,
    children: [
      { to: "/admin/apprenants", label: "Suivi individuel", icon: Users },
      { to: "/admin/certificats", label: "Certificats", icon: ChartSuccess },
      { to: "/admin/tracabilite", label: "Traçabilité & Audit", icon: ShieldCheck },
    ],
  },
  {
    label: "Utilisateurs & Accès",
    icon: User,
    children: [
      { to: "/admin/candidatures", label: "Candidatures", icon: Target, count: "cand" },
      { to: "/admin/paiements", label: "Paiements", icon: Card, count: "pay" },
    ],
  },
];
const leaves = entries.flatMap((e) => ("children" in e ? e.children : [e]));

function usePath() { return useRouterState({ select: (s) => s.location.pathname }).replace(/\/$/, "") || "/"; }
const matches = (path: string, to: string) => to === "/admin" ? path === "/admin" : path === to || path.startsWith(to + "/");

function Nav({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const path = usePath();
  const a = useAdmin();
  const counts = { pay: a.pendingPays.length, subs: a.pendingSubs.length, cand: a.candidates.length };
  const inGroup = (e: Entry) => "children" in e && e.children.some((c) => matches(path, c.to));
  const [open, setOpen] = useState<Record<string, boolean>>(() => Object.fromEntries(entries.map((e) => [e.label, true])));
  useEffect(() => { entries.forEach((e) => { if (inGroup(e)) setOpen((o) => ({ ...o, [e.label]: true })); }); }, [path]); // eslint-disable-line react-hooks/exhaustive-deps

  const leaf = (it: Leaf, child = false) => {
    const active = matches(path, it.to); const n = it.count ? counts[it.count] : 0;
    return (
      <Link key={it.to} to={it.to} onClick={onNavigate} title={collapsed ? it.label : undefined}
        className={`relative flex items-center gap-3 rounded-lg py-2 text-sm transition-colors ${collapsed ? "justify-center px-0" : child ? "pl-3 pr-2" : "px-3"} ${active ? (child ? "font-bold text-accent" : "bg-ink text-paper font-semibold") : "font-medium text-muted-foreground hover:bg-muted hover:text-ink"}`}>
        {child && !collapsed && <span aria-hidden className={`absolute -left-[13px] top-0 h-1/2 w-3 rounded-bl-lg border-b border-l ${active ? "border-accent" : "border-line"}`} />}
        <it.icon size={18} className="shrink-0" />
        {!collapsed && <span className="min-w-0 flex-1 truncate">{it.label}</span>}
        {n > 0 && <span className={`rounded-full bg-accent px-1.5 text-[10px] font-bold text-accent-foreground ${collapsed ? "absolute right-1 top-0" : ""}`}>{n}</span>}
      </Link>
    );
  };

  return (
    <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
      {entries.map((e) => {
        if (!("children" in e)) return leaf(e);
        if (collapsed) return <div key={e.label} className="space-y-1 border-t border-line pt-1">{e.children.map((c) => leaf(c))}</div>;
        const isOpen = !!open[e.label];
        return (
          <div key={e.label}>
            <button type="button" onClick={() => setOpen((o) => ({ ...o, [e.label]: !isOpen }))} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition-colors hover:bg-muted ${inGroup(e) ? "text-ink" : "text-muted-foreground"}`}>
              <e.icon size={18} className="shrink-0" /><span className="flex-1 text-left">{e.label}</span>
              <ChevronDown size={14} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </button>
            {isOpen && <div className="relative ml-[21px] space-y-0.5 border-l border-line pl-3">{e.children.map((c) => leaf(c, true))}</div>}
          </div>
        );
      })}
    </nav>
  );
}

function Footer({ collapsed }: { collapsed: boolean }) {
  const { data: p } = useProfile();
  const qc = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    if (p?.id) {
      identifyUser({
        id: p.id,
        email: p.email,
        name: p.full_name,
        role: "admin",
      });
    }
  }, [p?.id, p?.email, p?.full_name]);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    try { getD1SessionUser(); } catch {}
    try { localStorage.removeItem("aifac_session"); } catch {}
    clearD1Session();
    resetUser();
    navigate({ to: "/auth", replace: true });
  }
  return (
    <div className="border-t border-line p-3">
      <div className={`flex items-center gap-3 ${collapsed ? "flex-col" : ""}`}>
        <div className="flex min-w-0 flex-1 items-center gap-3 p-1">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">{initials(p?.full_name ?? "", p?.email ?? "")}</span>
          {!collapsed && <span className="min-w-0"><span className="block truncate text-sm font-bold text-ink">{p?.full_name || "Administrateur"}</span><span className="block truncate text-xs text-muted-foreground">{p?.email}</span></span>}
        </div>
        <button type="button" aria-label="Déconnexion" title="Déconnexion" onClick={signOut} className="icon-button shrink-0"><Logout size={16} /></button>
      </div>
    </div>
  );
}

function Brand({ collapsed }: { collapsed?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      {collapsed ? (
        <LogoMark size={32} />
      ) : (
        <div className="flex items-center gap-2">
          <Logo size={32} subtitle="FORGE D'INGÉNIERIE & SAISONS" />
          <span className="rounded-full bg-[#E2F7E7] border border-[#CFE3D5] px-2 py-0.5 text-[9px] font-black uppercase text-[#023010] tracking-wider">
            ADMIN
          </span>
        </div>
      )}
    </div>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [open, setOpen] = useState(false);
  const path = usePath();
  const title = [...leaves].reverse().find((l) => matches(path, l.to))?.label ?? "Administration";
  useEffect(() => { setCollapsed(localStorage.getItem("aifac-admin-sidebar") === "1"); }, []);
  const toggle = () => setCollapsed((c) => { localStorage.setItem("aifac-admin-sidebar", c ? "0" : "1"); return !c; });

  return (
    <div className="flex min-h-screen w-full bg-paper">
      <aside className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r border-line bg-card transition-[width] duration-300 md:flex ${collapsed ? "w-[72px]" : "w-64"}`}>
        <div className={`flex h-16 items-center border-b border-line px-4 ${collapsed ? "justify-center" : "justify-between"}`}>
          <Link to="/admin" aria-label="Pilotage"><Brand collapsed={collapsed} /></Link>
          {!collapsed && <button type="button" onClick={toggle} aria-label="Replier le menu" className="icon-button"><ChevronLeft size={16} /></button>}
        </div>
        {collapsed && <button type="button" onClick={toggle} aria-label="Déplier le menu" className="icon-button mx-auto mt-3"><ChevronRight size={16} /></button>}
        <Nav collapsed={collapsed} />
        <Footer collapsed={collapsed} />
      </aside>

      <div className={`fixed inset-0 z-50 md:hidden ${open ? "" : "pointer-events-none"}`}>
        <div onClick={() => setOpen(false)} className={`absolute inset-0 bg-ink/40 backdrop-blur-sm transition-opacity ${open ? "opacity-100" : "opacity-0"}`} />
        <aside className={`absolute inset-y-0 left-0 flex w-72 flex-col bg-card shadow-xl transition-transform duration-300 ${open ? "translate-x-0" : "-translate-x-full"}`}>
          <div className="flex h-16 items-center justify-between border-b border-line px-4"><Brand /><button type="button" onClick={() => setOpen(false)} aria-label="Fermer le menu" className="icon-button"><X size={16} /></button></div>
          <Nav collapsed={false} onNavigate={() => setOpen(false)} />
          <Footer collapsed={false} />
        </aside>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-line bg-paper/90 px-4 backdrop-blur sm:px-8">
          <button type="button" onClick={() => setOpen(true)} aria-label="Ouvrir le menu" className="icon-button shrink-0 md:hidden"><Menu size={20} /></button>
          <span className="min-w-0 flex-1 truncate font-bold text-ink">{title}</span>
          <div className="flex items-center gap-2">
            <AdminNotifications />
            <span className="flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-xs font-semibold text-ink">
              <ShieldCheck size={14} className="text-accent" /> Administrateur
            </span>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-8">{children}</main>
      </div>
    </div>
  );
}

export function Loading() {
  return <div className="grid gap-4 sm:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted" />)}</div>;
}

export function ErrorBox({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">Chargement impossible : {error.message} <button onClick={onRetry} className="ml-2 font-bold underline">Réessayer</button></div>;
}
