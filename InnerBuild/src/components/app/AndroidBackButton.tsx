import { useEffect } from "react";

export const NATIVE_BACK_EVENT = "aifac:native-back";

const OPEN_OVERLAY_SELECTOR = [
  '[role="dialog"][data-state="open"]',
  '[role="alertdialog"][data-state="open"]',
  '[data-vaul-drawer][data-state="open"]',
  '[data-radix-menu-content][data-state="open"]',
].join(",");

/**
 * Gives Android's hardware/gesture back action the expected native behavior.
 * This component has no visual output and is inert outside Capacitor.
 */
export function AndroidBackButton() {
  useEffect(() => {
    let disposed = false;
    let removeListener: (() => Promise<void>) | undefined;

    async function registerListener() {
      const [{ Capacitor }, { App }] = await Promise.all([
        import("@capacitor/core"),
        import("@capacitor/app"),
      ]);

      if (!Capacitor.isNativePlatform()) return;

      const listener = await App.addListener("backButton", ({ canGoBack }) => {
        // Radix/Vaul overlays already understand Escape, so close them first.
        if (document.querySelector(OPEN_OVERLAY_SELECTOR)) {
          document.dispatchEvent(
            new KeyboardEvent("keydown", {
              key: "Escape",
              code: "Escape",
              bubbles: true,
              cancelable: true,
            }),
          );
          return;
        }

        // Let application shells close their own navigation drawer.
        const appEvent = new CustomEvent(NATIVE_BACK_EVENT, { cancelable: true });
        window.dispatchEvent(appEvent);
        if (appEvent.defaultPrevented) return;

        if (canGoBack) {
          window.history.back();
          return;
        }

        if (window.confirm("Veux-tu quitter AIFAC ?")) {
          void App.exitApp();
        }
      });

      if (disposed) {
        await listener.remove();
      } else {
        removeListener = () => listener.remove();
      }
    }

    void registerListener();

    return () => {
      disposed = true;
      void removeListener?.();
    };
  }, []);

  return null;
}
