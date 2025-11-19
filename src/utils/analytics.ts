import * as Sentry from "@sentry/browser";

declare global {
    interface Window {
        dataLayer?: unknown[];
        gtag?: (...args: any[]) => void;
    }
}

export function gtag(event: string, params: Record<string, any>): void {
    if (typeof window === "undefined") {
        return;
    }
    if (typeof window.gtag !== "function") {
        return;
    }

    window.gtag("event", event, params);
}

type MetricPayload = {
    type: "web-vital" | "custom";
    name: string;
    value: number;
    id?: string;
    rating?: string;
};

export function sendMetric(payload: MetricPayload): void {
    const safeValue = Number.isFinite(payload.value) ? Math.round(payload.value) : 0;
    const GA_ID = import.meta.env.VITE_GA_ID;

    if (GA_ID) {
        gtag("performance_metric", {
            metric_name: payload.name,
            metric_value: safeValue,
            metric_id: payload.id,
            metric_rating: payload.rating,
            non_interaction: true,
        });
    }

    try {
        Sentry.addBreadcrumb({
            category: "perf",
            message: `${payload.name}: ${safeValue}`,
            level: "info",
            data: payload,
        });
    } catch {
        // 무시
    }
}

