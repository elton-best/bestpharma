import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { Toaster } from "@/components/ui/sonner";
import { SitePreloader } from "@/components/ui/SitePreloader";
import { AndroidBackButton } from "@/components/app/AndroidBackButton";
import posthog, { initPostHog, trackPageView, PostHogProvider } from "@/lib/posthog";

export function NotFoundComponent() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-paper px-4 selection:bg-accent/20">
      <div className="max-w-md text-center space-y-5 rounded-3xl border border-line bg-card p-8 sm:p-10 shadow-xl shadow-ink/5">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-accent/15 text-accent font-black text-2xl">
          404
        </div>
        <div>
          <h1 className="font-display text-2xl font-black text-ink tracking-tight">
            Page Introuvable
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
            L'adresse demandée n'existe pas ou a été déplacée dans le cadre de la mise à jour de la plateforme.
          </p>
        </div>
        <div className="pt-2 flex flex-wrap justify-center gap-3">
          <Link
            to="/app"
            className="btn-base btn-glow text-xs font-bold px-5 py-2.5"
          >
            Tableau de bord
          </Link>
          <Link
            to="/"
            className="btn-base btn-ghost text-xs font-semibold px-4 py-2.5"
          >
            Page d'accueil
          </Link>
        </div>
      </div>
    </div>
  );
}

export function ErrorComponent({ error, reset }: ErrorComponentProps) {
  const router = useRouter();
  useEffect(() => {
    if (error) {
      console.error("Runtime error caught in root boundary:", error);
    }
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-paper px-4 selection:bg-accent/20">
      <div className="max-w-md text-center space-y-5 rounded-3xl border border-line bg-card p-8 sm:p-10 shadow-xl shadow-ink/5">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-amber-500/15 text-amber-600 font-bold text-2xl">
          ⚡
        </div>
        <div>
          <h1 className="font-display text-xl font-bold text-ink tracking-tight">
            Chargement momentanément indisponible
          </h1>
          <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
            Une mise à jour ou synchronisation est en cours. Vos données sont préservées en toute sécurité.
          </p>
        </div>
        <div className="pt-2 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => {
              try {
                router.invalidate();
              } catch (_) {}
              if (reset) reset();
              else window.location.reload();
            }}
            className="btn-base btn-glow text-xs font-bold px-5 py-2.5 cursor-pointer"
          >
            Actualiser l'affichage
          </button>
          <Link
            to="/app"
            className="btn-base btn-ghost text-xs font-semibold px-4 py-2.5"
          >
            Espace apprenant
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content:
          "width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content",
      },
      { name: "theme-color", content: "#023010" },
      { name: "color-scheme", content: "light" },
      { name: "mobile-web-app-capable", content: "yes" },
      { title: "THE INNERBUILD — Forge d'Ingénierie & Hackathons d'Élite" },
      {
        name: "description",
        content:
          "On ne forme pas de simples développeurs. On forge des Frontend Killers. Hackathons réels, audits stricts sur 7 dimensions et certifications vérifiables.",
      },
      { name: "author", content: "THE INNERBUILD" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Great+Vibes&family=Inter:wght@300;400;500;600;700&family=Sora:wght@400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&display=swap",
      },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
      { rel: "apple-touch-icon", href: "/the-innerbuild-logo.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
  pendingComponent: SitePreloader,
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
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  useEffect(() => {
    initPostHog();
  }, []);

  useEffect(() => {
    trackPageView(pathname);
  }, [pathname]);

  return (
    <PostHogProvider client={posthog}>
      <QueryClientProvider client={queryClient}>
        <AndroidBackButton />
        {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
        <Outlet />
        <Toaster richColors position="top-center" />
      </QueryClientProvider>
    </PostHogProvider>
  );
}
