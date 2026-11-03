import { useCallback, useEffect, useState } from "react";
import {
  Outlet,
  Link,
  createFileRoute,
  redirect,
  useRouter,
  useRouterState,
} from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Menu, X } from "reicon-react";
import { AppSidebar } from "@/components/app-sidebar";
import { NotificationsSheet } from "@/components/notifications-sheet";
import { supabase } from "@/integrations/supabase/client";
import { api } from "@/lib/api-client";
import { enregistrerAppareil } from "@/lib/appareil";
import { OfficineProvider, useOfficine } from "@/lib/officine-context";
import { fr } from "@/lib/i18n/fr";
import { deconnecter } from "@/lib/session";
import { useEnLigne } from "@/hooks/use-en-ligne";
import { useInactivite } from "@/hooks/use-inactivite";

/** Durée d'inactivité avant verrouillage de la session (E0-S8). */
const MINUTES_INACTIVITE = 15;

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth", search: {} });
    return { user: data.user };
  },
  component: LayoutAuthentifie,
});

function LayoutAuthentifie() {
  const { user } = Route.useRouteContext();
  return (
    <OfficineProvider userId={user.id}>
      <Coquille userId={user.id} email={user.email ?? ""} />
    </OfficineProvider>
  );
}

function Coquille({ userId, email }: { userId: string; email: string }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { enLigne } = useEnLigne();
  const { courante } = useOfficine();

  const [collapsed, setCollapsed] = useState(false);
  const [openMobile, setOpenMobile] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem("begpharma-sidebar-collapsed") === "1");
    } catch {}
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("begpharma-sidebar-collapsed", next ? "1" : "0");
      } catch {}
      return next;
    });
  };

  const { data: profil } = useQuery({
    queryKey: ["profil", userId],
    queryFn: async () => {
      const u = api.getUser();
      return { nom_complet: u?.name || email };
    },
  });

  // Enregistre l'appareil ; s'il a été révoqué à distance, on déconnecte.
  useEffect(() => {
    let annule = false;
    enregistrerAppareil(userId).then((ok) => {
      if (!ok && !annule) deconnecter(queryClient, router);
    });
    return () => {
      annule = true;
    };
  }, [userId, queryClient, router]);

  const surExpiration = useCallback(() => {
    deconnecter(queryClient, router, { verrouille: true });
  }, [queryClient, router]);
  useInactivite(MINUTES_INACTIVITE, surExpiration);

  const initiales = (profil?.nom_complet || email)
    .split(/\s+/)
    .slice(0, 2)
    .map((m) => m[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div className="flex min-h-screen w-full bg-[#F7F9F7] font-sans text-[#0F3B27]">
      {/* 1. SIDEBAR DESKTOP */}
      <div className="hidden md:block shrink-0">
        <AppSidebar
          collapsed={collapsed}
          onToggle={toggleCollapsed}
        />
      </div>

      {/* 2. DRAWER SIDEBAR MOBILE */}
      <div
        className={`fixed inset-0 z-50 md:hidden transition-all duration-300 ${
          openMobile ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        <div
          onClick={() => setOpenMobile(false)}
          className="absolute inset-0 bg-[#0F3B27]/40 backdrop-blur-xs transition-opacity"
        />
        <div
          className={`absolute inset-y-0 left-0 w-72 bg-white shadow-2xl transition-transform duration-300 ${
            openMobile ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex h-16 items-center justify-between border-b border-[#CFF1D2] px-4">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-xl bg-[#0F3B27] flex items-center justify-center text-[#92FF5F] font-display font-black text-sm">
                +
              </div>
              <span className="font-display font-black text-base text-[#0F3B27]">
                BESTPHARMA
              </span>
            </div>
            <button
              type="button"
              onClick={() => setOpenMobile(false)}
              className="flex size-8 items-center justify-center rounded-lg border border-[#CFF1D2] text-[#475C50]"
            >
              <X size={18} />
            </button>
          </div>
          <AppSidebar
            collapsed={false}
            onToggle={() => {}}
            onNavigate={() => setOpenMobile(false)}
          />
        </div>
      </div>

      {/* 3. CONTENU PRINCIPAL & HEADER */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* HEADER SUPÉRIEUR */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-[#CFF1D2] bg-white/95 px-4 sm:px-8 backdrop-blur-md">
          {/* Gauche : Bouton burger mobile + Titre officine */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setOpenMobile(true)}
              aria-label="Ouvrir le menu"
              className="flex size-9 items-center justify-center rounded-xl border border-[#CFF1D2] text-[#475C50] hover:bg-[#CFF1D2]/30 hover:text-[#0F3B27] md:hidden shrink-0"
            >
              <Menu size={18} />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-base sm:text-lg text-[#0F3B27] truncate">
                  {courante?.officine?.nom || "BESTPHARMA Officine"}
                </span>
                {courante?.officine?.ville && (
                  <span className="hidden sm:inline-block text-xs font-semibold text-[#475C50] border-l-2 border-[#CFF1D2] pl-2">
                    {courante.officine.ville}
                  </span>
                )}
              </div>
              <p className="text-xs text-[#475C50] font-medium hidden sm:block">
                Système d'Information Officinal conforme BPD · ABMed Bénin
              </p>
            </div>
          </div>

          {/* Droite : Alerte Hors Ligne si nécessaire + Centre de Notifications + Accès Profil */}
          <div className="flex items-center gap-3">
            {/* Si déconnecté uniquement, sinon pas de badge en ligne */}
            {!enLigne && (
              <div className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-bold text-red-700">
                <span className="size-2 rounded-full bg-red-600 animate-pulse" />
                <span>Hors ligne (POS Actif)</span>
              </div>
            )}

            {/* Cloche / Centre de notifications */}
            <NotificationsSheet />

            {/* Accès rapide réglages / profil */}
            <Link
              to="/compte"
              className="flex items-center gap-2 rounded-xl border border-[#CFF1D2] p-1.5 pr-3 bg-white hover:bg-[#CFF1D2]/25 transition-colors"
              title="Mon compte & profil professionnel"
            >
              <div className="size-7 rounded-lg bg-[#0F3B27] text-[#92FF5F] flex items-center justify-center font-black text-xs border border-[#92FF5F]/30">
                {initiales || "DR"}
              </div>
              <span className="text-xs font-bold text-[#0F3B27] hidden md:inline truncate max-w-[130px]">
                {profil?.nom_complet?.split(" ")[0] || "Profil"}
              </span>
            </Link>
          </div>
        </header>

        {/* CONTENU DE LA PAGE */}
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
