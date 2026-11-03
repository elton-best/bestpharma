import posthog from "posthog-js";
export { PostHogProvider, usePostHog } from "@posthog/react";

let posthogInitialized = false;

export function getPostHogConfig() {
  const metaEnv = typeof import.meta !== "undefined" ? (import.meta as any).env : undefined;
  const procEnv = typeof process !== "undefined" ? process.env : undefined;

  const token =
    metaEnv?.VITE_POSTHOG_PROJECT_TOKEN ||
    metaEnv?.VITE_POSTHOG_KEY ||
    procEnv?.["VITE_POSTHOG_PROJECT_TOKEN"] ||
    procEnv?.["VITE_POSTHOG_KEY"] ||
    "";

  const host =
    metaEnv?.VITE_POSTHOG_HOST ||
    procEnv?.["VITE_POSTHOG_HOST"] ||
    "https://eu.i.posthog.com";

  return { token, host };
}

/**
 * Initialise le SDK PostHog de manière sécurisée côté navigateur.
 * Conforme à la documentation officielle PostHog React 2026.
 */
export function initPostHog() {
  if (typeof window === "undefined" || posthogInitialized) return posthog;

  const { token, host } = getPostHogConfig();

  if (!token) {
    return posthog;
  }

  try {
    const metaEnv = typeof import.meta !== "undefined" ? (import.meta as any).env : undefined;
    posthog.init(token, {
      api_host: host,
      defaults: "2026-05-30",
      person_profiles: "identified_only",
      capture_pageview: false, // Piloté manuellement par TanStack Router pour une précision SPA
      capture_pageleave: true,
      autocapture: true,
      disable_session_recording: true,
      on_xhr_error: () => {
        // Silencieusement ignoré lorsqu'un AdBlocker / extension client bloque PostHog
      },
      loaded: (ph) => {
        posthogInitialized = true;
        if (metaEnv?.DEV) {
          ph.debug();
        }
      },
    });
    posthogInitialized = true;
  } catch (err) {
    console.warn("[PostHog] Erreur lors de l'initialisation :", err);
  }

  return posthog;
}

// Initialisation immédiate côté client si window existe
if (typeof window !== "undefined") {
  initPostHog();
}

/**
 * Associe l'utilisateur connecté à ses actions dans PostHog.
 */
export function identifyUser(user: {
  id: string;
  email?: string | null;
  name?: string | null;
  role?: string | null;
}) {
  if (typeof window === "undefined" || !user?.id) return;
  try {
    initPostHog();
    posthog.identify(user.id, {
      email: user.email || undefined,
      name: user.name || undefined,
      role: user.role || "learner",
      platform: "AI Factory Web",
    });
  } catch (e) {
    console.warn("[PostHog] Erreur identify :", e);
  }
}

/**
 * Réinitialise l'identité lors d'une déconnexion.
 */
export function resetUser() {
  if (typeof window === "undefined") return;
  try {
    posthog.reset();
  } catch (e) {
    console.warn("[PostHog] Erreur reset :", e);
  }
}

/**
 * Envoie un événement personnalisé (ex: rendu_soumis, challenge_inscrit, appel_rejoint).
 */
export function trackEvent(eventName: string, properties?: Record<string, any>) {
  if (typeof window === "undefined") return;
  try {
    initPostHog();
    posthog.capture(eventName, properties);
  } catch (e) {
    console.warn("[PostHog] Erreur trackEvent :", e);
  }
}

/**
 * Enregistre le changement de page lors de la navigation dans l'application.
 */
export function trackPageView(pathname?: string) {
  if (typeof window === "undefined") return;
  try {
    initPostHog();
    posthog.capture("$pageview", {
      $current_url: window.location.href,
      pathname: pathname || window.location.pathname,
    });
  } catch (e) {
    console.warn("[PostHog] Erreur trackPageView :", e);
  }
}

export default posthog;
