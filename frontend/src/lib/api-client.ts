import { toast } from "sonner";

const CLE_TOKEN = "begpharma.token";
const CLE_USER = "begpharma.user";
const CLE_OFFICINES = "begpharma.officines";

export interface User {
  id: string;
  name?: string;
  email: string;
  telephone?: string | null;
  mfa_enabled?: boolean;
}

export interface Officine {
  id: string;
  nom: string;
  raison_sociale?: string;
  ville?: string | null;
  pivot?: {
    role_code: string;
    actif: boolean;
  };
}

class ApiClient {
  private getHeaders(): HeadersInit {
    const token = this.getToken();
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      "Accept": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
  }

  getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(CLE_TOKEN);
  }

  setToken(token: string | null) {
    if (typeof window === "undefined") return;
    if (token) {
      localStorage.setItem(CLE_TOKEN, token);
    } else {
      localStorage.removeItem(CLE_TOKEN);
    }
  }

  getUser(): User | null {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(CLE_USER);
    return raw ? JSON.parse(raw) : null;
  }

  setUser(user: User | null) {
    if (typeof window === "undefined") return;
    if (user) {
      localStorage.setItem(CLE_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(CLE_USER);
    }
  }

  getOfficines(): Officine[] {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem(CLE_OFFICINES);
    return raw ? JSON.parse(raw) : [];
  }

  setOfficines(officines: Officine[]) {
    if (typeof window === "undefined") return;
    localStorage.setItem(CLE_OFFICINES, JSON.stringify(officines));
  }

  private formatUrl(url: string): string {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return url;
    }
    const clean = url.startsWith("/") ? url : `/${url}`;
    if (!clean.startsWith("/api/")) {
      return `/api${clean}`;
    }
    return clean;
  }

  async get<T>(url: string): Promise<T> {
    const formatted = this.formatUrl(url);
    const res = await fetch(formatted, {
      method: "GET",
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(err.message || "Erreur de communication avec le serveur");
    }
    return res.json();
  }

  async post<T>(url: string, body?: unknown): Promise<T> {
    const formatted = this.formatUrl(url);
    const res = await fetch(formatted, {
      method: "POST",
      headers: this.getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(err.message || "Erreur lors de l'enregistrement");
    }
    return res.json();
  }

  async put<T>(url: string, body?: unknown): Promise<T> {
    const formatted = this.formatUrl(url);
    const res = await fetch(formatted, {
      method: "PUT",
      headers: this.getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(err.message || "Erreur lors de la mise à jour");
    }
    return res.json();
  }

  async delete<T>(url: string): Promise<T> {
    const formatted = this.formatUrl(url);
    const res = await fetch(formatted, {
      method: "DELETE",
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(err.message || "Erreur lors de la suppression");
    }
    return res.json();
  }

  logout() {
    this.setToken(null);
    this.setUser(null);
    this.setOfficines([]);
  }
}

export const api = new ApiClient();
