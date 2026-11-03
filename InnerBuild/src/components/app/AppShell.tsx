import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import {
  BookOpen, Card, ChartLine, ChevronDown, ChevronLeft, ChevronRight, Code, FolderOpen, GraduationCap, Home,
  Library, Logout, Menu, MessageQuestion, Rocket, ShieldCheck, Sparkles, User, Users, X,
} from "reicon-react";
import { AlignLeft, FileText, History, Images, Megaphone, Trophy, Award } from "lucide-react";
import { Logo, LogoMark } from "@/components/Logo";
import { getD1SessionUser, clearD1Session } from "@/lib/d1-session";
import { initials, useProfile, useProgress } from "@/lib/learner";
import { identifyUser, resetUser } from "@/lib/posthog";
import { Notifications } from "./Notifications";
import { CoachPanel } from "./CoachPanel";
import { NATIVE_BACK_EVENT } from "./AndroidBackButton";

type AppPath = "/app" | "/app/formations" | "/app/apprendre" | "/app/lecons-texte" | "/app/lecons-mixtes" | "/app/lecons-pdf" | "/app/pratique" | "/app/assistant" | "/app/rendus" | "/app/challenges" | "/app/progression" | "/app/certificats" | "/app/communaute" | "/app/ressources" | "/app/paiement" | "/app/compte" | "/app/bienvenue" | "/app/historique" | "/app/annonces" | "/app/building";
type Icon = ComponentType<{ size?: number; className?: string }>;
type Leaf = { to: AppPath; label: string; icon: Icon; badge?: "lessons" | "pay" | "new" };
type Entry = Leaf | { label: string; icon: Icon; children: Leaf[] };

const entries: Entry[] = [
  { to: "/app", label: "Tableau de bord", icon: Home },
  { label: "Formations", icon: GraduationCap, children: [
    { to: "/app/formations", label: "Mes formations", icon: GraduationCap },
    { to: "/app/apprendre", label: "Apprendre", icon: BookOpen, badge: "lessons" },
    { to: "/app/pratique", label: "Pratique", icon: Code },
    { to: "/app/assistant", label: "Assistant IA", icon: Sparkles, badge: "new" },
    { to: "/app/historique", label: "Historique du coach", icon: History },
  ]},
  { label: "Challenges & Projets", icon: Trophy, children: [
    { to: "/app/challenges", label: "Challenges InnerBuild", icon: Trophy, badge: "new" },
    { to: "/app/rendus", label: "Rendus et projets", icon: FolderOpen },
    { to: "/app/progression", label: "Ma progression", icon: ChartLine },
    { to: "/app/certificats", label: "Mes certificats", icon: Award },
  ]},
  { label: "Communauté", icon: Users, children: [
    { to: "/app/annonces", label: "Agenda & Keynotes Live", icon: Megaphone },
    { to: "/app/communaute", label: "Forum et cohorte", icon: Users },
    { to: "/app/ressources", label: "Skills et modèles", icon: Library },
  ]},
  { label: "Building", icon: Rocket, children: [
    { to: "/app/building", label: "Studio & Architecte", icon: Code, badge: "new" },
  ]},
  { label: "Compte", icon: User, children: [
    { to: "/app/compte", label: "Mon compte", icon: User },
    { to: "/app/paiement", label: "Paiement", icon: Card, badge: "pay" },
  ]},
];
const leaves: Leaf[] = entries.flatMap((e) => ("children" in e ? e.children : [e]));

function usePath() {
  return useRouterState({ select: (s) => s.location.pathname }).replace(/\/$/, "") || "/";
}

function Nav({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const path = usePath();
  const { data: prog } = useProgress();
  const { data: p } = useProfile();
  const groupOf = (e: Entry) => "children" in e && e.children.some((c) => c.to === path);
  const [open, setOpen] = useState<Record<string, boolean>>(() => Object.fromEntries(entries.map((e) => [e.label, groupOf(e)])));
  useEffect(() => { entries.forEach((e) => { if (groupOf(e)) setOpen((o) => ({ ...o, [e.label]: true })); }); }, [path]); // eslint-disable-line react-hooks/exhaustive-deps
  const badgeText = (b?: Leaf["badge"]) =>
    b === "lessons" ? (prog?.length ? String(prog.length) : "") :
    b === "pay" ? (p && !p.active ? "1" : "") : b === "new" ? "IA" : "";

  const leaf = (it: Leaf, child = false) => {
    const active = path === it.to; const badge = badgeText(it.badge);
    return (
      <Link key={it.to} to={it.to} onClick={onNavigate} title={collapsed ? it.label : undefined}
        className={`relative flex items-center gap-3 rounded-lg py-2 text-sm transition-colors ${collapsed ? "justify-center px-0" : child ? "pl-3 pr-2" : "px-3"} ${active ? (child ? "font-bold text-accent" : "bg-accent text-accent-foreground font-semibold") : "font-medium text-muted-foreground hover:bg-muted hover:text-ink"}`}>
        {child && !collapsed && <span aria-hidden className={`absolute -left-[13px] top-0 h-1/2 w-3 rounded-bl-lg border-b border-l ${active ? "border-accent" : "border-line"}`} />}
        <it.icon size={18} className="shrink-0" />
        {!collapsed && <span className="min-w-0 flex-1 truncate">{it.label}</span>}
        {!collapsed && badge && <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${active && !child ? "bg-paper/20" : "bg-amber/25 text-ink"}`}>{badge}</span>}
      </Link>
    );
  };

  return (
    <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
      {entries.map((e) => {
        if (!("children" in e)) return leaf(e);
        if (collapsed) return <div key={e.label} className="space-y-1 border-t border-line pt-1">{e.children.map((c) => leaf(c))}</div>;
        const isOpen = !!open[e.label]; const hasActive = groupOf(e);
        const activeIdx = e.children.findIndex((c) => c.to === path);
        return (
          <div key={e.label}>
            <button type="button" aria-expanded={isOpen} onClick={() => setOpen((o) => ({ ...o, [e.label]: !isOpen }))}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${isOpen ? "border border-line bg-card text-ink shadow-sm" : "border border-transparent text-muted-foreground hover:bg-muted hover:text-ink"} ${hasActive ? "text-ink" : ""}`}>
              <e.icon size={18} className="shrink-0" />
              <span className="flex-1 text-left">{e.label}</span>
              <ChevronDown size={16} className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
            </button>
            <div className={`grid transition-[grid-template-rows] duration-300 ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
              <div className="overflow-hidden">
                <div className="relative ml-[21px] mt-1 space-y-0.5 pl-3">
                  <span aria-hidden className="absolute left-0 top-0 h-[calc(100%-18px)] w-px bg-line" />
                  {activeIdx >= 0 && <span aria-hidden className="absolute left-0 top-0 w-px bg-accent" style={{ height: `calc(${activeIdx} * 38px + 18px)` }} />}
                  {e.children.map((c) => leaf(c, true))}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Admin Quick Switch for Authorized Admins */}
      {p?.email?.toLowerCase() === "eltonhounnou27@gmail.com" && (
        <div className="pt-2 mt-2 border-t border-line">
          <Link
            to="/admin"
            className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-accent bg-accent/10 border border-accent/25 rounded-xl hover:bg-accent/20 transition-all"
            title="Accéder au panneau d'administration"
          >
            <ShieldCheck size={18} className="text-accent shrink-0" />
            {!collapsed && <span>Panneau Admin 🛡️</span>}
          </Link>
        </div>
      )}
    </nav>
  );
}

function UserFooter({ collapsed }: { collapsed: boolean }) {
  const { data: p } = useProfile();
  const qc = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    if (p?.id) {
      identifyUser({
        id: p.id,
        email: p.email,
        name: p.full_name,
        role: (p as any)?.role || "learner",
      });
    }
  }, [p?.id, p?.email, p?.full_name, (p as any)?.role]);

  async function signOut() {
    await qc.cancelQueries(); qc.clear();
    // Session D1 lue au montage (source unique) ; déconnexion = purge locale
    try { getD1SessionUser(); } catch {}
    try { localStorage.removeItem("aifac_session"); } catch {}
    clearD1Session();
    resetUser();
    navigate({ to: "/auth", replace: true });
  }
  const name = p?.full_name || p?.email?.split("@")[0] || "Apprenant";
  return (
    <div className="border-t border-line p-3">
      <div className={`flex items-center gap-3 ${collapsed ? "flex-col" : ""}`}>
        <Link to="/app/compte" className="flex min-w-0 flex-1 items-center gap-3 rounded-lg p-1 hover:bg-muted" title="Mon compte">
          {p?.avatar_url ? (
            <img src={p.avatar_url} alt={name} className="h-9 w-9 shrink-0 rounded-full object-cover border border-line" />
          ) : (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-bold text-paper">{initials(p?.full_name ?? "", p?.email ?? "")}</span>
          )}
          {!collapsed && <span className="min-w-0"><span className="block truncate text-sm font-bold text-ink">{name}</span><span className="block truncate text-xs text-muted-foreground">{p?.email}</span></span>}
        </Link>
        <button type="button" aria-label="Déconnexion" title="Déconnexion" onClick={signOut} className="icon-button shrink-0"><Logout size={16} /></button>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [open, setOpen] = useState(false);
  const path = usePath();
  const navigate = useNavigate();
  const { data: p } = useProfile();
  const title = leaves.find((i) => i.to === path)?.label ?? "Espace apprenant";
  const isBuilding = path === "/app/building";
  const isAssistant = path === "/app/assistant";
  const isImmersive = isBuilding || isAssistant;

  useEffect(() => { setCollapsed(localStorage.getItem("aifac-sidebar") === "1"); }, []);
  useEffect(() => { if (p && !p.onboarded && !p.isAdmin && path !== "/app/bienvenue" && path !== "/app/attente") navigate({ to: "/app/bienvenue", replace: true }); }, [p, path, navigate]);
  useEffect(() => {
    const closeDrawer = (event: Event) => {
      if (!open) return;
      event.preventDefault();
      setOpen(false);
    };
    window.addEventListener(NATIVE_BACK_EVENT, closeDrawer);
    return () => window.removeEventListener(NATIVE_BACK_EVENT, closeDrawer);
  }, [open]);
  const toggle = () => setCollapsed((c) => { localStorage.setItem("aifac-sidebar", c ? "0" : "1"); return !c; });

  if (path === "/app/bienvenue" || path === "/app/attente") return <div className="mobile-safe-screen min-h-dvh bg-paper">{children}</div>;

  return (
    <div className={`app-shell flex w-full bg-paper ${isImmersive ? "h-dvh overflow-hidden" : "min-h-dvh"}`}>
      <aside className={`sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-line bg-card transition-[width] duration-300 md:flex ${collapsed ? "w-[72px]" : "w-64"}`}>
        <div className={`flex h-16 items-center border-b border-line px-4 ${collapsed ? "justify-center" : "justify-between"}`}>
          <Link to="/app" aria-label="Accueil AIFAC">{collapsed ? <LogoMark /> : <Logo />}</Link>
          {!collapsed && <button type="button" onClick={toggle} aria-label="Replier le menu" className="icon-button"><ChevronLeft size={16} /></button>}
        </div>
        {collapsed && <button type="button" onClick={toggle} aria-label="Déplier le menu" className="icon-button mx-auto mt-3"><ChevronRight size={16} /></button>}
        <Nav collapsed={collapsed} />
        <UserFooter collapsed={collapsed} />
      </aside>

      <div className={`app-mobile-drawer-layer fixed inset-0 z-50 md:hidden ${open ? "" : "pointer-events-none"}`}>
        <div onClick={() => setOpen(false)} className={`absolute inset-0 bg-ink/40 backdrop-blur-sm transition-opacity ${open ? "opacity-100" : "opacity-0"}`} />
        <aside className={`app-mobile-drawer absolute inset-y-0 left-0 flex w-72 flex-col bg-card shadow-xl transition-transform duration-300 ${open ? "translate-x-0" : "-translate-x-full"}`}>
          <div className="flex h-16 items-center justify-between border-b border-line px-4">
            <Link to="/app" onClick={() => setOpen(false)}><Logo /></Link>
            <button type="button" onClick={() => setOpen(false)} aria-label="Fermer le menu" className="icon-button"><X size={16} /></button>
          </div>
          <Nav collapsed={false} onNavigate={() => setOpen(false)} />
          <UserFooter collapsed={false} />
        </aside>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="app-mobile-header sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-line bg-paper/90 px-4 backdrop-blur sm:px-8">
          <button type="button" onClick={() => setOpen(true)} aria-label="Ouvrir le menu" className="icon-button shrink-0 md:hidden"><Menu size={20} /></button>
          <Link to="/app"><LogoMark className="h-7 w-7 shrink-0 md:hidden" /></Link>
          <span className="min-w-0 flex-1 truncate font-bold text-ink">{title}</span>

          <Link to="/app/assistant" className="hidden items-center gap-2 rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:border-accent sm:flex"><MessageQuestion size={14} /> Assistant IA</Link>
          <Notifications size={38} />
        </header>
        <main
          className={
            isBuilding
              ? "app-building-content m-0 flex min-h-0 w-full flex-1 flex-col overflow-hidden p-0"
              : isAssistant
                ? "app-assistant-content mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 flex-col overflow-hidden px-4 pb-[env(safe-area-inset-bottom,0px)] pt-3 sm:px-8 sm:pb-5 sm:pt-6 lg:px-10"
                : "app-mobile-content mx-auto w-full max-w-[1600px] flex-1 px-4 py-6 pb-24 sm:px-8 lg:px-10"
          }
        >
          {children}
        </main>
      </div>
      {path !== "/app/assistant" && path !== "/app/building" && <CoachPanel page={title} />}
    </div>
  );
}

export function PageHeader({ eyebrow, title, subtitle, action }: { eyebrow: string; title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <span className="eyebrow">{eyebrow}</span>
        <h1 className="mt-3 text-2xl font-extrabold text-ink sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-2 max-w-3xl text-base font-medium text-ink/80 leading-relaxed">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Panel({ title, children, className = "" }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`card-surface p-5 sm:p-6 ${className}`}>
      {title && <h2 className="mb-4 font-bold text-ink">{title}</h2>}
      {children}
    </section>
  );
}

export function Bar({ value }: { value: number }) {
  return <div className="h-2 w-full overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-accent transition-all" style={{ width: `${value}%` }} /></div>;
}

export function Empty({ title, text, action }: { title: string; text: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-line p-6 text-center">
      <p className="font-bold text-ink">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{text}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card-surface min-w-0 p-3.5 sm:p-5 overflow-hidden">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:text-xs truncate">
        {label}
      </p>
      <p className="mt-1 sm:mt-2 break-words font-display text-lg sm:text-2xl lg:text-3xl font-extrabold leading-tight text-ink">
        {value}
      </p>
      {hint && <p className="mt-1 text-[10px] sm:text-xs text-muted-foreground truncate">{hint}</p>}
    </div>
  );
}

export function SkeletonPageLoader() {
  return (
    <div className="flex w-full items-center justify-center p-12 text-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
        <span className="font-mono text-xs font-bold text-muted-foreground tracking-wider uppercase">
          Chargement de l'espace…
        </span>
      </div>
    </div>
  );
}

export function appHead(title: string, description: string) {
  const t = `${title} — AIFAC`;
  return () => ({ meta: [
    { title: t }, { name: "description", content: description },
    { property: "og:title", content: t }, { property: "og:description", content: description },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ]});
}
