import { useEffect } from "react";

/** Appelle `onExpire` après `minutes` sans interaction. */
export function useInactivite(minutes: number, onExpire: () => void) {
  useEffect(() => {
    if (!minutes || minutes <= 0) return;
    let timer: ReturnType<typeof setTimeout>;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(onExpire, minutes * 60_000);
    };
    const evts = ["pointerdown", "keydown", "scroll", "touchstart"];
    evts.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      clearTimeout(timer);
      evts.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [minutes, onExpire]);
}
