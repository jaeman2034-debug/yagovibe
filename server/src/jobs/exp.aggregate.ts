/**
 * 🔥 Experiment Aggregate - AB 테스트 통계 집계
 * 
 * Week5 핵심: 로그 → 통계 자동 집계
 */

import { prisma } from "../data/prisma";

/**
 * 실험 로그를 통계로 집계
 */
export async function aggregateExperiment(): Promise<void> {
  try {
    // 실험 관련 로그 조회
    const logs = await prisma.eventLog.findMany({
      where: {
        eventName: { in: ["exp_impression", "exp_click"] },
      },
      orderBy: { createdAt: "asc" },
    });

    console.log(`[EXP_AGGREGATE] Processing ${logs.length} logs`);

    for (const log of logs) {
      try {
        const payload = JSON.parse(log.payload || "{}");
        const experimentKey = payload.experimentKey || payload.experiment?.key;
        const variant = payload.variant || payload.experiment?.variant;
        const eventName = log.eventName;

        if (!experimentKey || !variant) {
          continue;
        }

        // 통계 조회 또는 생성
        const stat = await prisma.experimentStat.findUnique({
          where: {
            expId_variant: {
              expId: experimentKey,
              variant: variant,
            },
          },
        });

        if (!stat) {
          // 새 통계 생성
          await prisma.experimentStat.create({
            data: {
              id: `es_${Date.now()}_${Math.random().toString(16).slice(2)}`,
              expId: experimentKey,
              variant: variant,
              imp: eventName === "exp_impression" ? 1 : 0,
              click: eventName === "exp_click" ? 1 : 0,
            },
          });

          // 실험 레코드도 생성 (없으면)
          await prisma.experiment.upsert({
            where: { id: experimentKey },
            create: {
              id: experimentKey,
              status: "RUNNING",
              startedAt: new Date(),
            },
            update: {},
          });

          continue;
        }

        // 기존 통계 업데이트
        await prisma.experimentStat.update({
          where: { id: stat.id },
          data: {
            imp: stat.imp + (eventName === "exp_impression" ? 1 : 0),
            click: stat.click + (eventName === "exp_click" ? 1 : 0),
          },
        });
      } catch (parseError) {
        console.error("[EXP_AGGREGATE] Parse error:", parseError);
        continue;
      }
    }

    console.log(`[EXP_AGGREGATE] Completed`);
  } catch (error) {
    console.error("[EXP_AGGREGATE] Error:", error);
    throw error;
  }
}
