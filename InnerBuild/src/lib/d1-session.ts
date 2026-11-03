// Session 100% Cloudflare D1 — gestion de session côté client.
// La session est persistée dans localStorage après signUp/signIn D1.
export type D1SessionUser = {
  id: string;
  email: string;
  fullName?: string;
  full_name?: string;
  role?: string;
  user_metadata?: { full_name?: string; role?: string };
};

const KEY = "aifac_session";

export function getD1SessionUser(): D1SessionUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const u = JSON.parse(raw);
    if (!u?.id || !u?.email) return null;
    return {
      id: u.id,
      email: u.email,
      fullName: u.fullName || u.full_name,
      full_name: u.full_name || u.fullName,
      role: u.role,
      user_metadata: { full_name: u.fullName || u.full_name, role: u.role },
    };
  } catch {
    return null;
  }
}

export function setD1Session(user: { id: string; email: string; fullName?: string; full_name?: string; role?: string }) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(user));
}

export function clearD1Session() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}

export async function requireD1User(): Promise<D1SessionUser> {
  const u = getD1SessionUser();
  if (!u) throw new Error("Non connecté");
  return u;
}
