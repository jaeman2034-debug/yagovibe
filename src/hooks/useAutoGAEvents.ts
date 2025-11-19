import { useEffect } from "react";
import * as Sentry from "@sentry/react";
import { trackEvent } from "@/analytics/ga";

function extractElement(target: EventTarget | null): HTMLElement | null {
    if (!(target instanceof HTMLElement)) {
        return null;
    }
    return target.closest<HTMLElement>("[data-ga], button, a");
}

function normalizeLabel(element: HTMLElement): string {
    return element.textContent?.trim().slice(0, 120) || element.getAttribute("aria-label") || "unknown";
}

export function useAutoGAEvents(): void {
    useEffect(() => {
        const handler = (event: MouseEvent) => {
            const element = extractElement(event.target);
            if (!element) {
                return;
            }

            const datasetLabel = element.getAttribute("data-ga");

            if (datasetLabel) {
                trackEvent(datasetLabel, "Custom");
            } else if (element.tagName === "BUTTON") {
                trackEvent("click_button", "UI", normalizeLabel(element));
            } else if (element.tagName === "A") {
                const href =
                    (element as HTMLAnchorElement).getAttribute("href") ||
                    (element as HTMLAnchorElement).href ||
                    "unknown";
                trackEvent("click_link", "Navigation", href);
            } else {
                return;
            }

            const contextLabel = datasetLabel || normalizeLabel(element);
            Sentry.setContext("last_click", {
                tag: element.tagName,
                label: contextLabel,
                timestamp: new Date().toISOString(),
            });
        };

        document.addEventListener("click", handler, true);
        return () => {
            document.removeEventListener("click", handler, true);
        };
    }, []);
}

