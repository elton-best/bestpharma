import { useEffect, useState } from "react";
import { outbox } from "@/lib/offline/outbox";

export function useEnLigne() {
  const [enLigne, setEnLigne] = useState(true);
  const [attente, setAttente] = useState(0);
  useEffect(() => {
    const maj = async () => {
      setEnLigne(navigator.onLine);
      if (navigator.onLine) await outbox().synchroniser();
      setAttente(await outbox().compterEnAttente());
    };
    maj();
    window.addEventListener("online", maj);
    window.addEventListener("offline", maj);
    return () => {
      window.removeEventListener("online", maj);
      window.removeEventListener("offline", maj);
    };
  }, []);
  return { enLigne, attente };
}
