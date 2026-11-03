import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8faf8] px-4 font-sans">
      <div className="max-w-md w-full text-center bg-white border border-[#CFE3D5] rounded-3xl p-8 sm:p-10 shadow-xl shadow-[#023010]/5">
        <span className="inline-flex items-center gap-2 rounded-full border border-[#18AA38]/30 bg-[#EFF7F1] px-3.5 py-1 text-xs font-bold text-[#023010] mb-4">
          <span className="size-1.5 rounded-full bg-[#18AA38]" /> Page introuvable
        </span>
        <h1 className="text-6xl font-black font-display text-[#023010] tracking-tight">404</h1>
        <h2 className="mt-2 text-lg font-bold text-[#1F2420]">Cette page n'existe pas</h2>
        <p className="mt-2 text-xs text-[#5C6660] leading-relaxed">
          Le module ou la section demandée a peut-être été déplacée ou n'est pas disponible pour votre profil.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            to="/app"
            className="inline-flex items-center justify-center rounded-xl bg-[#023010] hover:bg-[#18AA38] px-5 py-2.5 text-xs font-bold text-white transition-all shadow-sm"
          >
            Aller au tableau de bord
          </Link>
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-xl border border-[#CFE3D5] bg-white hover:bg-[#EFF7F1] px-5 py-2.5 text-xs font-bold text-[#1F2420] transition-colors"
          >
            Accueil
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error("Session or Route Error caught gracefully:", error);
  const router = useRouter();

  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8faf8] px-4 font-sans">
      <div className="max-w-md w-full text-center bg-white border border-[#CFE3D5] rounded-3xl p-8 sm:p-10 shadow-xl shadow-[#023010]/5">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-[#023010] text-2xl font-black text-white shadow-lg shadow-[#023010]/20 font-display">
          +
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-[#18AA38]/30 bg-[#EFF7F1] px-3.5 py-1 text-xs font-bold text-[#023010] mb-3">
          <span className="size-1.5 rounded-full bg-[#18AA38] animate-pulse" /> BEGPHARMA · Sécurité active
        </span>
        <h1 className="text-xl font-extrabold font-display tracking-tight text-[#1F2420]">
          Rétablissement de session
        </h1>
        <p className="mt-2 text-xs text-[#5C6660] leading-relaxed">
          Une ressource a nécessité une actualisation de session. Cliquez ci-dessous pour reprendre directement vos activités d'officine.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => {
              try {
                router.invalidate();
                reset();
              } catch {
                window.location.reload();
              }
            }}
            className="inline-flex items-center justify-center rounded-xl bg-[#023010] hover:bg-[#18AA38] px-5 py-2.5 text-xs font-bold text-white transition-all shadow-md shadow-[#023010]/15"
          >
            Actualiser l'écran
          </button>
          <a
            href="/app"
            className="inline-flex items-center justify-center rounded-xl border border-[#CFE3D5] bg-white hover:bg-[#EFF7F1] px-5 py-2.5 text-xs font-bold text-[#1F2420] transition-colors"
          >
            Espace Officine
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "BEGPHARMA — Gestion d'officine" },
      {
        name: "description",
        content:
          "Application de gestion d'officine au Bénin, conforme au Guide BPD de l'ABMed.",
      },
      { property: "og:title", content: "BEGPHARMA — Gestion d'officine" },
      {
        property: "og:description",
        content:
          "Application de gestion d'officine au Bénin, conforme au Guide BPD de l'ABMed.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Sora:wght@500;600;700&display=swap",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Toaster position="top-center" richColors />
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  // Un seul abonné aux changements de session, filtré aux transitions d'identité :
  // on invalide le routeur (la barrière réagit) et le cache, jamais sur les
  // rafraîchissements de jeton ni sur INITIAL_SESSION.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => subscription.unsubscribe();
  }, [router, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
    </QueryClientProvider>
  );
}
