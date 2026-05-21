/**
 * 🩺 Health Check API
 * 시스템 상태 확인용 엔드포인트
 */
export async function GET() {
    try {
        const healthStatus = {
            status: "ok",
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            version: "1.0.0",
            service: "YAGO SPORTS AI"
        };

        return new Response(
            JSON.stringify(healthStatus),
            {
                status: 200,
                headers: {
                    "Content-Type": "application/json",
                }
            }
        );
    } catch (error) {
        return new Response(
            JSON.stringify({
                status: "error",
                error: error instanceof Error ? error.message : "Unknown error"
            }),
            {
                status: 500,
                headers: {
                    "Content-Type": "application/json",
                }
            }
        );
    }
}

// POST도 지원
export async function POST() {
    return GET();
}

