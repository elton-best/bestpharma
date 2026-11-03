import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Copy,
  ExternalLink,
  Maximize2,
  Minimize2,
  Radio,
  ShieldCheck,
  Sparkles,
  Users,
  Video,
} from "lucide-react";
import { toast } from "sonner";
import { appHead } from "@/components/app/AppShell";
import { JitsiMeetRoom } from "@/components/JitsiMeetRoom";
import { getD1SessionUser } from "@/lib/d1-session";

export const Route = createFileRoute("/live")({
  validateSearch: (search: Record<string, unknown>) => ({
    room: (search["room"] as string) || "AIFAC-Main-Stage",
    title: (search["title"] as string) || "Session Keynote & Direct AI Factory",
    code: (search["code"] as string) || "",
    name: (search["name"] as string) || "",
    email: (search["email"] as string) || "",
    role: (search["role"] as string) || "",
    domain: (search["domain"] as string) || "meet.jit.si",
  }),
  head: () =>
    appHead(
      "🔴 En Direct : Session Keynote & Direct — AI Factory",
      "Participez à la keynote et masterclass en direct avec les intervenants et apprenants sur AI Factory."
    )(),
  component: LivePage,
});

function LivePage() {
  const search = Route.useSearch();
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Auto-inscription de l'invité ou de l'intervenant dès son arrivée par lien email
  useEffect(() => {
    if (search.email) {
      try {
        const existing = getD1SessionUser();
        if (!existing) {
          const guest = {
            id: `guest_${search.email.replace(/[^a-zA-Z0-9]/g, "_")}`,
            email: search.email,
            fullName: search.name || search.email.split("@")[0],
            role: search.role || "intervenant",
            isGuest: true,
          };
          localStorage.setItem("aifac-guest-session", JSON.stringify(guest));
        }
      } catch {}
    }
  }, [search.email, search.name, search.role]);

  function copyCode() {
    if (!search.code) return;
    navigator.clipboard.writeText(search.code);
    toast.success(`Code ${search.code} copié dans le presse-papier !`);
  }

  function copyShareLink() {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Lien direct du Salon Live copié !");
  }

  function toggleFullScreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullScreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullScreen(false);
    }
  }

  return (
    <div className="flex h-screen w-screen flex-col bg-[#08090c] text-[#f3f4f6] overflow-hidden select-none">
      {/* Top Bar Header immersif style Studio / Discord Stage */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-[#222533] bg-[#0d0e14]/95 px-4 backdrop-blur-md z-30">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to="/app/annonces"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#272b3b] bg-[#161822] text-[#9ca3af] hover:border-accent hover:text-[#ffffff] transition-all shrink-0"
            title="Retour aux annonces"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>

          <div className="flex items-center gap-2.5 min-w-0">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/15 border border-rose-500/30 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-rose-500 shrink-0 animate-pulse">
              <Radio className="h-3 w-3" /> DIRECT
            </span>

            <div className="min-w-0">
              <h1 className="truncate text-xs sm:text-sm font-bold text-white tracking-tight">
                {search.title}
              </h1>
              <p className="hidden sm:block truncate font-mono text-[11px] text-[#9ca3af]">
                Salon : <span className="text-accent">{search.room}</span>
                {search.name ? (
                  <span className="ml-2 text-emerald-400">
                    · Connecté : {search.name} {search.role ? `(${search.role})` : ""}
                  </span>
                ) : null}
              </p>
            </div>
          </div>
        </div>

        {/* Actions de la barre supérieure */}
        <div className="flex items-center gap-2 shrink-0">
          {search.code && (
            <button
              type="button"
              onClick={copyCode}
              title="Copier le code d'accès"
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#272b3b] bg-[#161822] px-2.5 py-1.5 text-xs font-mono font-bold text-white hover:border-accent hover:bg-[#1e2230] transition-all"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-accent" />
              <span className="hidden xs:inline">Code :</span>
              <span>{search.code}</span>
              <Copy className="h-3 w-3 text-[#9ca3af]" />
            </button>
          )}

          <button
            type="button"
            onClick={copyShareLink}
            title="Partager le lien du salon"
            className="hidden md:inline-flex items-center gap-1.5 rounded-xl border border-[#272b3b] bg-[#161822] px-2.5 py-1.5 text-xs font-semibold text-white hover:border-accent hover:bg-[#1e2230] transition-all"
          >
            <Copy className="h-3.5 w-3.5 text-accent" />
            <span>Partager</span>
          </button>

          <button
            type="button"
            onClick={toggleFullScreen}
            title={isFullScreen ? "Quitter le plein écran" : "Plein écran immersif"}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#272b3b] bg-[#161822] text-[#9ca3af] hover:border-accent hover:text-white transition-all"
          >
            {isFullScreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </button>
        </div>
      </header>

      {/* Main Container - Occupe 100% de la hauteur restante */}
      <main className="relative flex-1 bg-black overflow-hidden">
        <JitsiMeetRoom
          roomName={search.room}
          title={search.title}
          accessCode={search.code}
          domain={search.domain || "meet.jit.si"}
          height="100%"
          className="h-full w-full rounded-none border-none shadow-none"
        />
      </main>
    </div>
  );
}
