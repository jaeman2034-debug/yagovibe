export type SentryIssue = {
  id: string;
  title: string;
  culprit?: string;
  metadata?: Record<string, unknown>;
  count?: string;
  userCount?: number;
  lastSeen?: string;
  level?: string;
};

export async function fetchSentryIssues(limit = 8): Promise<SentryIssue[]> {
  const token = import.meta.env.VITE_SENTRY_TOKEN;
  if (!token) {
    console.warn("⚠️ VITE_SENTRY_TOKEN not set. Returning mock Sentry data.");
    return [
      { id: "mock-1", title: "MockError: Demo issue", count: "5", userCount: 3, level: "error" },
      { id: "mock-2", title: "TimeoutException: Fetch", count: "2", userCount: 1, level: "warning" },
    ];
  }

  const org = import.meta.env.VITE_SENTRY_ORG ?? "";
  const project = import.meta.env.VITE_SENTRY_PROJECT ?? "";
  if (!org || !project) {
    console.warn("⚠️ VITE_SENTRY_ORG or VITE_SENTRY_PROJECT not set. Returning empty issues.");
    return [];
  }

  const res = await fetch(
    `https://sentry.io/api/0/projects/${org}/${project}/issues/?limit=${limit}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!res.ok) {
    console.warn("⚠️ Sentry API fetch failed", res.status, await res.text());
    return [];
  }

  return (await res.json()) as SentryIssue[];
}

