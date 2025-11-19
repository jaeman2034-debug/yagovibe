import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { trackPageView } from "@/analytics/ga";

export function useGATrack(): void {
    const location = useLocation();

    useEffect(() => {
        trackPageView(`${location.pathname}${location.search}`);
    }, [location]);
}

