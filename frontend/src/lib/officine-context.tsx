import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { Database } from "@/integrations/supabase/types";

export type Role = Database["public"]["Enums"]["role_officine"];
export interface Rattachement {
  officine_id: string;
  role: Role;
  officine: { id: string; nom: string; ville: string | null };
}

interface Ctx {
  rattachements: Rattachement[];
  courante: Rattachement | null;
  choisir: (id: string) => void;
  chargement: boolean;
  aRole: (...roles: Role[]) => boolean;
}

const OfficineCtx = createContext<Ctx | null>(null);
const CLE = "begpharma.officine";

export function OfficineProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const [choix, setChoix] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(CLE);
  });

  const { data = [] } = useQuery({
    queryKey: ["rattachements", userId],
    initialData: () => {
      const offs = api.getOfficines();
      return (offs || []).map((o: any) => ({
        officine_id: o.id,
        role: (o.pivot?.role_code || "dispensateur") as Role,
        officine: { id: o.id, nom: o.nom, ville: o.ville ?? null },
      })) as Rattachement[];
    },
    queryFn: async () => {
      const offs = await api.get<any[]>("/api/officines").catch(() => api.getOfficines());
      return (offs || []).map((o: any) => ({
        officine_id: o.id,
        role: (o.pivot?.role_code || "dispensateur") as Role,
        officine: { id: o.id, nom: o.nom, ville: o.ville ?? null },
      })) as Rattachement[];
    },
  });

  const value = useMemo<Ctx>(() => {
    const list = data ?? [];
    const courante = list.find((r) => r.officine_id === choix) ?? list[0] ?? null;
    return {
      rattachements: list,
      courante,
      chargement: false,
      choisir: (id) => {
        localStorage.setItem(CLE, id);
        setChoix(id);
      },
      aRole: (...roles) => !!courante && roles.includes(courante.role),
    };
  }, [data, choix]);

  return <OfficineCtx.Provider value={value}>{children}</OfficineCtx.Provider>;
}

export function useOfficine() {
  const c = useContext(OfficineCtx);
  if (!c) throw new Error("useOfficine hors OfficineProvider");
  return c;
}
