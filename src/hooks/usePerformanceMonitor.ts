import { useEffect } from "react";
import { startWebVitals } from "@/utils/reportWebVitals";

let monitoringStarted = false;

export function usePerformanceMonitor(): void {
    useEffect(() => {
        if (monitoringStarted) {
            return;
        }

        startWebVitals();
        monitoringStarted = true;
    }, []);
}

