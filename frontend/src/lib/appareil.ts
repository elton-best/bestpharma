import { supabase } from "@/integrations/supabase/client";

const CLE = "begpharma.appareil";

function libelleAppareil() {
  const ua = navigator.userAgent;
  const os = /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Windows/.test(ua) ? "Windows" : /Mac/.test(ua) ? "macOS" : "Linux";
  const nav = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Navigateur";
  return `${nav} · ${os}`;
}

export function appareilCourant(): string | null {
  return localStorage.getItem(CLE);
}

/** Enregistre/actualise l'appareil. Retourne false UNIQUEMENT si l'appareil a été expressément révoqué à distance. */
export async function enregistrerAppareil(userId: string): Promise<boolean> {
  try {
    const id = appareilCourant();
    if (id) {
      const { data, error } = await supabase.from("sessions_appareils").select("revoquee").eq("id", id).maybeSingle();
      if (!error && data?.revoquee) {
        localStorage.removeItem(CLE);
        return false;
      }
      if (data) {
        await supabase.from("sessions_appareils").update({ derniere_activite: new Date().toISOString() }).eq("id", id).catch(() => {});
        return true;
      }
    }
    const { data } = await supabase
      .from("sessions_appareils")
      .insert({ user_id: userId, libelle: libelleAppareil() })
      .select("id")
      .single()
      .catch(() => ({ data: null }));
    if (data?.id) localStorage.setItem(CLE, data.id);
    return true;
  } catch {
    return true; // En cas de doute ou d'indisponibilité réseau, ne pas déconnecter l'utilisateur
  }
}

export function oublierAppareil() {
  localStorage.removeItem(CLE);
}
