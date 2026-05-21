/**
 * 🔥 Experiment Decider - AB 테스트 승자 자동 판정
 * 
 * Week5 핵심: 표본/기간 체크 → uplift 10% 판정 → 승자 자동 고정
 */

import { prisma } from "../data/prisma";

const MIN_SAMPLE = 3000; // 최소 표본 수
const MIN_DAYS = 7; // 최소 실험 기간 (일)
const UPLIFT = 1.1; // 10% uplift

/**
 * 실험 승자 자동 판정
 * 
 * 조건:
 * - 표본 수 >= 3000
 * - 실험 기간 >= 7일
 * - 한쪽 variant의 CTR이 다른 쪽보다 10% 이상 높음
 */
export async function decideWinner(expId: string): Promise<boolean> {
  try {
    const exp = await prisma.experiment.findUnique({
      where: { id: expId },
    });

    if (!exp || exp.status !== "RUNNING") {
      return false;
    }

    // 통계 조회
    const stats = await prisma.experimentStat.findMany({
      where: { expId },
    });

    const variantA = stats.find((s) => s.variant === "A");
    const variantB = stats.find((s) => s.variant === "B");

    if (!variantA || !variantB) {
      return false;
    }

    // 실험 기간 체크
    const ageDays =
      (Date.now() - new Date(exp.startedAt).getTime()) /
      (1000 * 60 * 60 * 24);

    if (ageDays < MIN_DAYS) {
      console.log(
        `[EXP_DECIDER] ${expId}: Too early (${ageDays.toFixed(1)} days < ${MIN_DAYS} days)`
      );
      return false;
    }

    // 표본 수 체크
    const totalImp = variantA.imp + variantB.imp;
    if (totalImp < MIN_SAMPLE) {
      console.log(
        `[EXP_DECIDER] ${expId}: Insufficient sample (${totalImp} < ${MIN_SAMPLE})`
      );
      return false;
    }

    // CTR 계산
    const ctrA = variantA.imp > 0 ? variantA.click / variantA.imp : 0;
    const ctrB = variantB.imp > 0 ? variantB.click / variantB.imp : 0;

    // 승자 판정 (10% uplift 기준)
    let winner: "A" | "B" | null = null;

    if (ctrB > ctrA * UPLIFT) {
      winner = "B";
    } else if (ctrA > ctrB * UPLIFT) {
      winner = "A";
    }

    if (!winner) {
      console.log(
        `[EXP_DECIDER] ${expId}: No clear winner (A: ${(ctrA * 100).toFixed(2)}%, B: ${(ctrB * 100).toFixed(2)}%)`
      );
      return false;
    }

    // 승자 고정
    await prisma.experiment.update({
      where: { id: expId },
      data: {
        status: "WIN",
        winner,
        endedAt: new Date(),
      },
    });

    console.log(
      `[EXP_WIN] ${expId} → ${winner} (A: ${(ctrA * 100).toFixed(2)}%, B: ${(ctrB * 100).toFixed(2)}%)`
    );

    return true;
  } catch (error) {
    console.error(`[EXP_DECIDER] Error for ${expId}:`, error);
    return false;
  }
}

/**
 * 모든 실행 중인 실험에 대해 승자 판정
 */
export async function decideAllWinners(): Promise<void> {
  const runningExps = await prisma.experiment.findMany({
    where: { status: "RUNNING" },
  });

  console.log(`[EXP_DECIDER] Checking ${runningExps.length} running experiments`);

  for (const exp of runningExps) {
    await decideWinner(exp.id);
  }
}
