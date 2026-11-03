// Cloudflare D1 Client & SQL Query Engine for AI Factory
// High-performance serverless distributed SQLite at the edge.

const CLOUDFLARE_ACCOUNT_ID = process.env["CLOUDFLARE_ACCOUNT_ID"] || "";
const CLOUDFLARE_API_TOKEN = process.env["CLOUDFLARE_API_TOKEN"] || "";
const CLOUDFLARE_D1_DATABASE_ID = process.env["CLOUDFLARE_D1_DATABASE_ID"] || "";

export interface D1QueryResult<T = any> {
  success: boolean;
  results: T[];
  meta?: {
    duration: number;
    rows_read: number;
    rows_written: number;
  };
  error?: string;
}

/**
 * Execute a SQL query on Cloudflare D1
 */
export async function d1Query<T = any>(
  sql: string,
  params: any[] = [],
  databaseId = CLOUDFLARE_D1_DATABASE_ID
): Promise<D1QueryResult<T>> {
  if (!databaseId) {
    return {
      success: false,
      results: [],
      error: "CLOUDFLARE_D1_DATABASE_ID is not configured in environment.",
    };
  }

  try {
    const endpoint = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/d1/database/${databaseId}/query`;

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sql,
        params,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      const errMsg = data.errors?.[0]?.message || `D1 query failed with status ${res.status}`;
      if (res.status === 401 || errMsg.toLowerCase().includes("authentication") || errMsg.toLowerCase().includes("token")) {
        console.error("[Cloudflare D1 Auth Alert] Le jeton CLOUDFLARE_API_TOKEN est expiré ou invalide (HTTP 401). Veuillez le renouveler dans Cloudflare Dashboard et dans les variables d'environnement Vercel.");
      }
      return { success: false, results: [], error: errMsg };
    }

    const firstResult = data.result?.[0];
    return {
      success: firstResult?.success ?? true,
      results: (firstResult?.results as T[]) || [],
      meta: firstResult?.meta,
    };
  } catch (err: any) {
    return {
      success: false,
      results: [],
      error: err.message || "D1 network error",
    };
  }
}

/**
 * Execute a batch of SQL queries in a single transaction on D1
 */
export async function d1Batch(
  statements: { sql: string; params?: any[] }[],
  databaseId = CLOUDFLARE_D1_DATABASE_ID
): Promise<{ success: boolean; results: any[]; error?: string }> {
  if (!databaseId) {
    return { success: false, results: [], error: "CLOUDFLARE_D1_DATABASE_ID missing." };
  }

  try {
    const endpoint = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/d1/database/${databaseId}/query`;

    // D1 API accepts multiple statements separated or formatted
    const combinedSql = statements.map((s) => s.sql).join(";\n");

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sql: combinedSql,
      }),
    });

    const data = await res.json();
    return {
      success: data.success,
      results: data.result || [],
      error: data.errors?.[0]?.message,
    };
  } catch (err: any) {
    return { success: false, results: [], error: err.message };
  }
}

export const executeD1Query = d1Query;
