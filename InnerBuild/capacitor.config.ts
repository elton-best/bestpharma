import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "me.eltonhounnou.aifactory",
  appName: "AIFAC",
  // TanStack Start relies on SSR and server functions, so the Android shell
  // loads the deployed application. This tiny local page is only a fallback.
  webDir: "android-web",
  server: {
    // The native app starts on its lightweight onboarding instead of the web landing page.
    url: "https://ai-factory.eltonhounnou.me/mobile-welcome",
    androidScheme: "https",
    cleartext: false,
  },
};

export default config;
