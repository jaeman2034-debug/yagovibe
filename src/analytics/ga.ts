export const GA_TRACKING_ID = import.meta.env.VITE_GA_ID;

type GAEventParams = {
    action: string;
    category?: string;
    label?: string;
    value?: number;
};

declare global {
    interface Window {
        gtag?: (...args: any[]) => void;
        dataLayer?: unknown[];
    }
}

export const sendGAEvent = ({ action, category, label, value }: GAEventParams): void => {
    if (typeof window === "undefined" || typeof window.gtag !== "function") {
        return;
    }

    window.gtag("event", action, {
        event_category: category,
        event_label: label,
        value,
    });
};

export const trackEvent = (
    action: string,
    category?: string,
    label?: string,
    value?: number
): void => {
    sendGAEvent({ action, category, label, value });
};

export const trackPageView = (url: string): void => {
    if (typeof window === "undefined" || typeof window.gtag !== "function" || !GA_TRACKING_ID) {
        return;
    }

    window.gtag("config", GA_TRACKING_ID, {
        page_path: url,
    });
};

