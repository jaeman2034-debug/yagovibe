import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";

/**
 * Step 66: Chaos Proxy - 외부 의존 차단 시뮬레이터
 * 혼돈 실험: 외부 서비스 장애 시뮬레이션
 * GET /chaosProxy?mode=ok|drop|slow|error
 *   - ok: 정상 응답
 *   - drop: 패킷 드랍 시뮬 (응답 없음)
 *   - slow: 느린 응답 (4초 지연)
 *   - error: 오류 응답 (502)
 */
export const chaosProxy = onRequest(
    {
        region: "asia-northeast3",
        cors: true,
        timeoutSeconds: 10,
    },
    async (req, res) => {
        try {
            const mode = String(req.query.mode || "ok");

            logger.info("🔀 Chaos Proxy 시작:", { mode });

            switch (mode) {
                case "drop":
                    // 패킷 드랍 시뮬 (응답 없이 종료)
                    logger.warn("⚠️ Chaos: 패킷 드랍 시뮬");
                    // 응답을 보내지 않고 종료
                    return;

                case "slow":
                    // 느린 응답 (4초 지연)
                    logger.warn("⚠️ Chaos: 느린 응답 시뮬");
                    await new Promise((r) => setTimeout(r, 4000));
                    res.setHeader("Access-Control-Allow-Origin", "*");
                    res.json({
                        ok: true,
                        mode: "slow",
                        message: "Chaos testing: 느린 응답",
                    });
                    return;

                case "error":
                    // 오류 응답 (502)
                    logger.warn("⚠️ Chaos: 오류 응답 시뮬");
                    res.setHeader("Access-Control-Allow-Origin", "*");
                    res.status(502).json({
                        error: "upstream_error",
                        message: "Chaos testing: 업스트림 오류",
                        mode: "error",
                    });
                    return;

                case "ok":
                default:
                    // 정상 응답
                    logger.info("✅ Chaos Proxy: 정상 응답");
                    res.setHeader("Access-Control-Allow-Origin", "*");
                    res.json({
                        ok: true,
                        mode: "ok",
                        message: "정상 응답",
                    });
                    return;
            }
        } catch (error: any) {
            logger.error("❌ Chaos Proxy 오류:", error);
            res.status(500).json({ error: error.message });
        }
    }
);

