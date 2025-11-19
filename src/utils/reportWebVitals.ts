import { onCLS, onINP, onLCP, onTTFB, onFCP } from "web-vitals";
import { sendMetric } from "@/utils/analytics";

type MetricHandler = (metric: {
    name: string;
    value: number;
    id: string;
    rating?: string;
}) => void;

function handler(name: string): MetricHandler {
    return (metric) => {
        sendMetric({
            type: "web-vital",
            name,
            value: metric.value,
            id: metric.id,
            rating: metric.rating,
        });
    };
}

export function startWebVitals(): void {
    onCLS(handler("CLS"));
    onINP(handler("INP"));
    onLCP(handler("LCP"));
    onTTFB(handler("TTFB"));
    onFCP(handler("FCP"));
}

