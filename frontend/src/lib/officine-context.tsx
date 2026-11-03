import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
  const { data, isLoading } = useQuery({
    queryKey: ["rattachements", userId],
    queryFn: async () => {
      // Les officines non visibles (RLS : MFA manquante) sont filtrées par la jointure interne.
      const { data, error } = await supabase
        .from("utilisateurs_officines")
        .select("officine_id, role, officine:officines!inner(id, nom, ville)")
        .eq("user_id", userId)
        .eq("archived", false);
      if (error) throw error;
      return (data ?? []) as unknown as Rattachement[];
    },
  });
  const [choix, setChoix] = useState<string | null>(null);
  useEffect(() => setChoix(localStorage.getItem(CLE)), []);

  const value = useMemo<Ctx>(() => {
    const list = data ?? [];
    const courante = list.find((r) => r.officine_id === choix) ?? list[0] ?? null;
    return {
      rattachements: list,
      courante,
      chargement: isLoading,
      choisir: (id) => {
        localStorage.setItem(CLE, id);
        setChoix(id);
      },
      aRole: (...roles) => !!courante && roles.includes(courante.role),
    };
  }, [data, choix, isLoading]);

  return <OfficineCtx.Provider value={value}>{children}</OfficineCtx.Provider>;
}

export function useOfficine() {
  const c = useContext(OfficineCtx);
  if (!c) throw new Error("useOfficine hors OfficineProvider");
  return c;
}
