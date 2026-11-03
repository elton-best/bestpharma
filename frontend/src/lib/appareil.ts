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

/** Enregistre/actualise l'appareil. Retourne false si l'appareil a été révoqué à distance. */
export async function enregistrerAppareil(userId: string): Promise<boolean> {
  const id = appareilCourant();
  if (id) {
    const { data } = await supabase.from("sessions_appareils").select("revoquee").eq("id", id).maybeSingle();
    if (data?.revoquee) {
      localStorage.removeItem(CLE);
      return false;
    }
    if (data) {
      await supabase.from("sessions_appareils").update({ derniere_activite: new Date().toISOString() }).eq("id", id);
      return true;
    }
  }
  const { data } = await supabase
    .from("sessions_appareils")
    .insert({ user_id: userId, libelle: libelleAppareil() })
    .select("id")
    .single();
  if (data) localStorage.setItem(CLE, data.id);
  return true;
}

export function oublierAppareil() {
  localStorage.removeItem(CLE);
}
