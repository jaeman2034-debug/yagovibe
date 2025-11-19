import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";

/**
 * Step 66: Chaos Delay - 랜덤 지연/오류 주입
 * 혼돈 실험: 지연 및 오류 시뮬레이션
 * GET /chaosDelay?p=0.2&d=300
 *   - p: 오류 확률 (0.0 ~ 1.0, 기본 0.2 = 20%)
 *   - d: 기본 지연 시간 (ms, 기본 300)
 */
export const chaosDelay = onRequest(
    {
        region: "asia-northeast3",
        cors: true,
    },
    async (req, res) => {
        try {
            const p = Number(req.query.p || "0.2"); // 오류 확률
            const d = Number(req.query.d || "300"); // 기본 지연 시간 (ms)

            logger.info("🔀 Chaos Delay 시작:", { p, d });

            // 랜덤 지연 (d ~ 2d 범위)
            const delay = d + Math.random() * d;
            await new Promise((r) => setTimeout(r, delay));

            // 랜덤 오류 주입
            if (Math.random() < p) {
                logger.warn("⚠️ Chaos 오류 주입:", { p, delay });
                res.status(503).json({
                    error: "chaos_injected",
                    message: "Chaos testing: 서비스 일시 중단",
                    delay,
                });
                return;
            }

            logger.info("✅ Chaos Delay 완료:", { delay });
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.json({
                ok: true,
                delayed: true,
                delay: Math.round(delay),
            });
        } catch (error: any) {
            logger.error("❌ Chaos Delay 오류:", error);
            res.status(500).json({ error: error.message });
        }
    }
);

