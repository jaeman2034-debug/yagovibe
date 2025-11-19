import { Response } from "firebase-functions/v2/https";

/**
 * Step 67: Edge 캐싱 헤더 설정 (Functions 응답용)
 * Functions v2에서 사용
 */

/**
 * 캐시 헤더 설정
 */
export function setCacheHeaders(
    res: Response,
    strategy: "html" | "api" | "static" | "immutable"
): void {
    switch (strategy) {
        case "html":
            // HTML: 짧게 (30초 브라우저, 5분 CDN)
            res.setHeader("Cache-Control", "public, max-age=30, s-maxage=300");
            break;

        case "api":
            // API: 5초 응답 캐시 + stale-while-revalidate=30
            res.setHeader(
                "Cache-Control",
                "public, max-age=5, s-maxage=5, stale-while-revalidate=30"
            );
            break;

        case "static":
            // 정적 파일: 1일
            res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=86400");
            break;

        case "immutable":
            // 불변 아티팩트(pdf/audio): 1년 + immutable
            res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
            break;
    }
}

/**
 * 지역 라우팅 헬퍼
 */
export function getRegionEndpoint(req: any): string {
    // Cloudflare Workers나 다른 엣지에서 사용
    // req.headers.get('cf-ipcountry') 또는 req.headers.get('x-vercel-ip-country')
    const country = req.headers?.["cf-ipcountry"] || req.headers?.["x-vercel-ip-country"] || "";

    if (country === "KR" || country === "JP" || country === "CN") {
        return "asia-northeast3";
    }

    return "us-central1";
}

