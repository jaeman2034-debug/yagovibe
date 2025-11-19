import { Response } from "firebase-functions/v2/https";

/**
 * Step 69: Security Headers - 보안 헤더 설정
 * Production Hardening & Launch Readiness
 */

/**
 * 보안 헤더 설정
 */
export function setSecurityHeaders(res: Response): void {
    // HSTS (HTTP Strict Transport Security)
    res.setHeader(
        "Strict-Transport-Security",
        "max-age=63072000; includeSubDomains; preload"
    );

    // X-Content-Type-Options
    res.setHeader("X-Content-Type-Options", "nosniff");

    // X-Frame-Options
    res.setHeader("X-Frame-Options", "DENY");

    // Referrer-Policy
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

    // Permissions-Policy
    res.setHeader(
        "Permissions-Policy",
        "geolocation=(self), microphone=(self), camera=(), payment=()"
    );

    // Content-Security-Policy
    res.setHeader(
        "Content-Security-Policy",
        [
            "default-src 'self'",
            "img-src 'self' data: https:",
            "script-src 'self' 'wasm-unsafe-eval'",
            "connect-src 'self' https://*.googleapis.com https://*.neo4j.io https://*.openai.com https://*.anthropic.com",
            "style-src 'self' 'unsafe-inline'",
            "media-src 'self' https: data:",
            "font-src 'self' data:",
            "frame-src 'self'",
        ].join("; ")
    );

    // X-XSS-Protection (레거시 브라우저용)
    res.setHeader("X-XSS-Protection", "1; mode=block");
}

/**
 * CORS 설정
 */
export function setCORSHeaders(res: Response, origin?: string): void {
    const allowedOrigins = [
        /\.yago-vibe\.com$/,
        /^https:\/\/localhost:\d+$/,
        /^https:\/\/127\.0\.0\.1:\d+$/,
    ];

    const isAllowed = origin && allowedOrigins.some((pattern) => pattern.test(origin));

    if (isAllowed || !origin) {
        res.setHeader("Access-Control-Allow-Origin", origin || "*");
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
        res.setHeader("Access-Control-Max-Age", "86400");
    }
}

/**
 * 보안 헤더 + CORS 미들웨어
 */
export function applySecurityMiddleware(
    req: any,
    res: Response,
    handler: (req: any, res: Response) => void | Promise<void>
): void {
    setSecurityHeaders(res);
    setCORSHeaders(res, req.headers.origin);

    // OPTIONS 요청 처리
    if (req.method === "OPTIONS") {
        res.status(204).end();
        return;
    }

    handler(req, res);
}

