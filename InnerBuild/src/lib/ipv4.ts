let configured = false;

/**
 * Enforces IPv4 resolution on Node.js to prevent AggregateError [ETIMEDOUT] / ENETUNREACH
 * when reaching dual-stack APIs (such as api.groq.com via Cloudflare) on networks without working IPv6 routes.
 * Completely no-op in browser environment.
 */
export function ensureIPv4Network() {
  if (typeof window !== "undefined" || configured) return;
  configured = true;

  try {
    // Dynamic import to prevent Vite from stubbing node:dns in client bundles
    import("node:dns").then((dnsModule) => {
      const dns = dnsModule.default || dnsModule;
      try {
        dns.setDefaultResultOrder("ipv4first");
      } catch {}

      const origLookup = dns.lookup;
      if (origLookup) {
        const customLookup = function (hostname: any, options: any, callback: any) {
          if (typeof options === "function") {
            callback = options;
            options = { family: 4 };
          } else if (typeof options === "number") {
            options = { family: 4 };
          } else if (options && typeof options === "object") {
            options = { ...options, family: 4 };
          } else {
            options = { family: 4 };
          }
          return (origLookup as any).call(dns, hostname, options, callback);
        };

        (customLookup as any).__promisify__ = (origLookup as any).__promisify__;
        (dns as any).lookup = customLookup;
      }
    }).catch(() => {});
  } catch {}
}

if (typeof window === "undefined") {
  ensureIPv4Network();
}

export async function fetchWithRetry(url: string, init: RequestInit, retries = 2): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fetch(url, init);
    } catch (err) {
      lastError = err;
      if (attempt < retries - 1) {
        await new Promise((r) => setTimeout(r, 1200));
      }
    }
  }
  throw lastError;
}
