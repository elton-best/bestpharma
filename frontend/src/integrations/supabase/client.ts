import { api } from "@/lib/api-client";

type GenericFilterBuilder = {
  select: (...args: any[]) => GenericFilterBuilder;
  eq: (...args: any[]) => GenericFilterBuilder;
  neq: (...args: any[]) => GenericFilterBuilder;
  gte: (...args: any[]) => GenericFilterBuilder;
  lte: (...args: any[]) => GenericFilterBuilder;
  order: (...args: any[]) => GenericFilterBuilder;
  limit: (...args: any[]) => GenericFilterBuilder;
  single: () => Promise<{ data: any; error: any }>;
  maybeSingle: () => Promise<{ data: any; error: any }>;
  insert: (payload: any) => GenericFilterBuilder;
  update: (payload: any) => GenericFilterBuilder;
  delete: () => GenericFilterBuilder;
  then: (onfulfilled?: (value: { data: any; error: any; count?: number }) => any) => Promise<any>;
};

function createQueryBuilder(table: string): GenericFilterBuilder {
  const state: {
    method: "GET" | "POST" | "PUT" | "DELETE";
    endpoint: string;
    filters: Record<string, any>;
    body?: any;
    isSingle?: boolean;
    limitCount?: number;
    countMode?: boolean;
  } = {
    method: "GET",
    endpoint: `/api/${table}`,
    filters: {},
  };

  const builder: any = {
    select(_columns = "*", options?: { count?: string; head?: boolean }) {
      if (options?.count) state.countMode = true;
      return builder;
    },
    eq(col: string, val: any) {
      state.filters[col] = val;
      return builder;
    },
    neq(col: string, val: any) {
      state.filters[`not_${col}`] = val;
      return builder;
    },
    gte(col: string, val: any) {
      state.filters[`gte_${col}`] = val;
      return builder;
    },
    lte(col: string, val: any) {
      state.filters[`lte_${col}`] = val;
      return builder;
    },
    order(_col: string, _opts?: any) {
      return builder;
    },
    limit(n: number) {
      state.limitCount = n;
      return builder;
    },
    insert(payload: any) {
      state.method = "POST";
      state.body = payload;
      return builder;
    },
    update(payload: any) {
      state.method = "PUT";
      state.body = payload;
      return builder;
    },
    delete() {
      state.method = "DELETE";
      return builder;
    },
    async single() {
      state.isSingle = true;
      return builder.execute();
    },
    async maybeSingle() {
      state.isSingle = true;
      return builder.execute();
    },
    async execute() {
      try {
        let url = `/api/${table}`;
        // Cas particulier pour les sous-ressources connues
        if (state.filters["officine_id"]) {
          const offId = state.filters["officine_id"];
          if (table === "parametres") url = `/api/officines/${offId}/parametres`;
          else if (table === "journal_audit" || table === "audit_logs") url = `/api/officines/${offId}/audit-logs`;
          else url = `/api/officines/${offId}/${table}`;
        } else if (table === "sessions_appareils" || table === "appareils") {
          url = `/api/auth/devices`;
        }

        let resData: any = null;
        if (state.method === "GET") {
          const params = new URLSearchParams();
          Object.entries(state.filters).forEach(([k, v]) => {
            if (k !== "officine_id") params.append(k, String(v));
          });
          const q = params.toString();
          resData = await api.get(q ? `${url}?${q}` : url);
        } else if (state.method === "POST") {
          resData = await api.post(url, state.body);
        } else if (state.method === "PUT") {
          const id = state.filters["id"] || state.filters["cle"] || "";
          resData = await api.put(`${url}/${id}`, state.body);
        } else if (state.method === "DELETE") {
          const id = state.filters["id"] || "";
          resData = await api.delete(`${url}/${id}`);
        }

        const dataArray = Array.isArray(resData) ? resData : resData?.data || (resData ? [resData] : []);
        const data = state.isSingle ? (dataArray[0] ?? null) : dataArray;
        return {
          data,
          error: null,
          count: state.countMode ? (resData?.total ?? dataArray.length) : undefined,
        };
      } catch (err: any) {
        return { data: null, error: err };
      }
    },
    then(onfulfilled?: (val: any) => any) {
      return builder.execute().then(onfulfilled);
    },
  };

  return builder;
}

export const supabase = {
  from(table: string) {
    return createQueryBuilder(table);
  },
  auth: {
    async getUser() {
      const user = api.getUser();
      return { data: { user }, error: user ? null : new Error("Non connecté") };
    },
    async getSession() {
      const token = api.getToken();
      const user = api.getUser();
      return {
        data: {
          session: token && user ? { access_token: token, user } : null,
        },
        error: null,
      };
    },
    async signInWithPassword({ email, password }: { email: string; password: string }) {
      try {
        const res = await api.post<any>("/api/auth/login", { email, password });
        if (res.token) {
          api.setToken(res.token);
          api.setUser(res.user);
          if (res.officines) api.setOfficines(res.officines);
        }
        return { data: res, error: null };
      } catch (err: any) {
        return { data: null, error: err };
      }
    },
    async signUp(_params: any) {
      return { data: null, error: new Error("L'inscription directe est désactivée. Contactez le promoteur.") };
    },
    async signOut() {
      try {
        await api.post("/api/auth/logout");
      } catch {
        // Ignorer si déjà déconnecté
      }
      api.logout();
      return { error: null };
    },
    onAuthStateChange(_cb: (event: string, session: any) => void) {
      return {
        data: {
          subscription: {
            unsubscribe: () => {},
          },
        },
      };
    },
    mfa: {
      async listFactors() {
        const user = api.getUser();
        return {
          data: {
            all: user?.mfa_enabled ? [{ id: "totp-1", status: "verified", factor_type: "totp" }] : [],
          },
          error: null,
        };
      },
      async getAuthenticatorAssuranceLevel() {
        const user = api.getUser();
        return {
          data: {
            currentLevel: user?.mfa_enabled ? "aal2" : "aal1",
            nextLevel: user?.mfa_enabled ? "aal2" : "aal1",
          },
          error: null,
        };
      },
      async enroll(_params: any) {
        return {
          data: {
            id: "totp-new",
            totp: { qr_code: "" },
          },
          error: null,
        };
      },
      async challengeAndVerify({ code }: { code: string }) {
        try {
          const res = await api.post<any>("/api/auth/verify-mfa", { code });
          if (res.token) {
            api.setToken(res.token);
            api.setUser(res.user);
          }
          return { data: res, error: null };
        } catch (err: any) {
          return { data: null, error: err };
        }
      },
      async unenroll(_params: any) {
        return { data: null, error: null };
      },
    },
    async refreshSession() {
      const user = await api.get<any>("/api/auth/me").catch(() => null);
      if (user) api.setUser(user);
      return { data: { session: null }, error: null };
    },
  },
  rpc(fnName: string, params?: any) {
    if (fnName === "mfa_requise") {
      const user = api.getUser();
      return Promise.resolve({ data: user?.mfa_enabled ?? false, error: null });
    }
    if (fnName === "creer_officine") {
      return api.post<any>("/api/officines", {
        nom: params?._nom,
        raison_sociale: params?._nom,
        numero_licence: `LIC-${Date.now()}`,
        adresse: params?._ville || "Cotonou",
        ville: params?._ville || "Cotonou",
        telephone: "+229 00 00 00 00",
      }).then((off) => ({ data: off.id, error: null }))
        .catch((err) => ({ data: null, error: err }));
    }
    return Promise.resolve({ data: null, error: null });
  },
};
