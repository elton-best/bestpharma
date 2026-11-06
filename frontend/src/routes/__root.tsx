import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { ErreurRubrique } from "@/components/erreur-rubrique";
import { Toaster } from "@/components/ui/sonner";
import { ModaleApercuDocument } from "@/components/modules/modale-apercu-document";

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
            to="/dashboard"
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


export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  ssr: false,
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "BestPharma : Gestion d'officine" },
      {
        name: "description",
        content:
          "Application de gestion d'officine au Bénin, conforme au Guide BPD de l'ABMed.",
      },
      { property: "og:title", content: "BestPharma : Gestion d'officine" },
      {
        property: "og:description",
        content:
          "Application de gestion d'officine au Bénin, conforme au Guide BPD de l'ABMed.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [
      {
        rel: "preconnect",
        href: "https://fonts.googleapis.com",
      },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
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
  errorComponent: ErreurRubrique,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  // La session est portée par un jeton Sanctum : on repart d'un cache propre
  // à chaque montage, sans écouter d'événement d'authentification externe.
  useEffect(() => {
    queryClient.invalidateQueries();
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
      <Toaster position="top-center" richColors />
      <ModaleApercuDocument />
    </QueryClientProvider>
  );
}
