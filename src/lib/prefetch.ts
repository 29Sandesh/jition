/**
 * Background Prefetching & Caching Engine
 * Automatically intercepts API GET requests to serve cached content, eliminating UI loading lag.
 */

// Cache map storing URL + Headers key and response details
const fetchCache = new Map<string, { data: any; timestamp: number }>();
const ORIGINAL_FETCH = window.fetch;

// Initialize the fetch interceptor once
let isInterceptorInitialized = false;

export function initFetchInterceptor() {
  if (isInterceptorInitialized) return;
  isInterceptorInitialized = true;

  console.log("⚡ [Prefetch] Initializing transparent API cache interceptor...");

  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
    const method = init?.method || "GET";
    const urlString = typeof input === "string" ? input : input instanceof URL ? input.toString() : (input as Request).url;

    // Only cache GET requests directed to our back-end API endpoints
    if (method === "GET" && urlString.startsWith("/api/")) {
      const cacheKey = `${urlString}:${JSON.stringify(init?.headers || {})}`;
      const cached = fetchCache.get(cacheKey);

      // Return cached response if it's less than 60 seconds old
      if (cached && Date.now() - cached.timestamp < 60 * 1000) {
        return new Response(JSON.stringify(cached.data), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Fetch from the network and clone response to update cache in background
      const response = await ORIGINAL_FETCH(input, init);
      if (response.ok) {
        const cloned = response.clone();
        try {
          const data = await cloned.json();
          fetchCache.set(cacheKey, { data, timestamp: Date.now() });
        } catch (e) {
          // Response is not valid JSON, skip caching
        }
      }
      return response;
    }

    // Pass through all other requests (POST, PUT, DELETE, or external domains)
    return ORIGINAL_FETCH(input, init);
  };
}

/**
 * Prefetch all critical endpoints in the background for the current active workspace/tenant.
 */
export function startPrefetching(workspaceId: string, orgId: string, userId: string) {
  if (!workspaceId) return;

  const authHeaders = {
    "x-workspace-id": workspaceId,
    "x-organisation-id": orgId,
    "x-user-id": userId,
    "x-company-id": orgId,
  };

  const endpoints = [
    `/api/workspaces`,
    `/api/workItems`,
    `/api/dashboard/summary`,
    `/api/organisations/members`,
    `/api/workspaces/${workspaceId}/members`,
    `/api/workspaces/${workspaceId}/projects`,
    `/api/workItems/history`,
    `/api/chat/conversations`
  ];

  console.log(`🚀 [Prefetch] Starting background warming for ${endpoints.length} API routes...`);

  // Non-blocking parallel pre-fetches
  endpoints.forEach((url) => {
    ORIGINAL_FETCH(url, { headers: authHeaders })
      .then((res) => {
        if (res.ok) {
          return res.clone().json().then((data) => {
            const cacheKey = `${url}:${JSON.stringify(authHeaders)}`;
            fetchCache.set(cacheKey, { data, timestamp: Date.now() });
          });
        }
      })
      .catch((err) => {
        console.warn(`⚠️ [Prefetch] Background prefetch failed for: ${url}`, err);
      });
  });
}
