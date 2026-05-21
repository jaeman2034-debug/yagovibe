/**
 * 🚀 Autopilot Runner - 무인 운영 오토파일럿 실행기
 * 
 * 목표: 지표 보고 스스로 움직이는 시스템
 */

import { prisma } from "../data/prisma";
import { decideAction, prioritizeActions, Signal } from "../domain/autopilot.rules";
import { executeAction } from "./autopilot.actions";

/**
 * 오토파일럿 실행 (지역별)
 */
export async function runAutopilot(region: string): Promise<void> {
  try {
    console.log(`[AUTO] 오토파일럿 실행 시작: ${region}`);

    // 최신 KPI 조회
    const kpi = await prisma.dailyKpi.findFirst({
      where: { region },
      orderBy: { date: "desc" },
    });

    if (!kpi) {
      console.log(`[AUTO] ${region} KPI 데이터 없음, 스킵`);
      return;
    }

    // 활성 스토리 수 확인 (FillRate 계산)
    const activeStories = await prisma.story.count({
      where: {
        region,
        status: "PUBLISHED",
        startAt: { lte: new Date() },
        endAt: { gte: new Date() },
      },
    });

    const fillRate = activeStories >= 5 ? 1.0 : activeStories / 5;

    // 오늘 팀 가입 수 확인
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const teamJoins = await prisma.teamMember.count({
      where: {
        createdAt: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    // 취소율 계산
    const cancelRate =
      Number(kpi.paySuccess) + Number(kpi.payFail) > 0
        ? Number(kpi.payFail) /
          (Number(kpi.paySuccess) + Number(kpi.payFail))
        : 0;

    // PayFail Rate 계산
    const payFailRate =
      Number(kpi.paySuccess) + Number(kpi.payFail) > 0
        ? Number(kpi.payFail) /
          (Number(kpi.paySuccess) + Number(kpi.payFail))
        : 0;

    // Signal 구성
    const signal: Signal = {
      ctr: kpi.storyCtr || 0,
      reserveCr: kpi.bookingCr || 0,
      payFail: payFailRate,
      fillRate,
      teamJoins,
      cancelRate,
    };

    console.log(`[AUTO] ${region} Signal:`, {
      ctr: `${(signal.ctr * 100).toFixed(2)}%`,
      reserveCr: `${(signal.reserveCr * 100).toFixed(2)}%`,
      payFail: `${(signal.payFail * 100).toFixed(2)}%`,
      fillRate: `${(signal.fillRate * 100).toFixed(0)}%`,
      teamJoins: signal.teamJoins,
      cancelRate: `${(signal.cancelRate * 100).toFixed(2)}%`,
    });

    // 액션 결정
    const actions = decideAction(signal);
    const prioritizedActions = prioritizeActions(actions);

    if (prioritizedActions.length === 0) {
      console.log(`[AUTO] ${region} 액션 없음, 모든 지표 정상`);
      return;
    }

    console.log(`[AUTO] ${region} 실행할 액션 ${prioritizedActions.length}개:`);
    prioritizedActions.forEach((a, i) => {
      console.log(`  ${i + 1}. ${a.type}: ${a.reason}`);
    });

    // 액션 실행
    for (const action of prioritizedActions) {
      try {
        await executeAction(action, region);
        console.log(`[AUTO] ${region} 액션 실행 완료: ${action.type}`);
      } catch (error) {
        console.error(
          `[AUTO] ${region} 액션 실행 실패: ${action.type}`,
          error
        );
        // 액션 실패해도 다음 액션 계속 실행
      }
    }

    console.log(`[AUTO] ${region} 오토파일럿 실행 완료`);
  } catch (error) {
    console.error(`[AUTO] ${region} 오토파일럿 실행 실패:`, error);
    // 오류 발생해도 시스템은 계속 동작
  }
}

/**
 * 모든 지역 오토파일럿 실행
 */
export async function runAutopilotAllRegions(): Promise<void> {
  const regions = ["seoul", "busan", "incheon", "daegu", "gwangju"];

  for (const region of regions) {
    await runAutopilot(region);
  }
}
