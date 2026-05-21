/**
 * 🔥 Admin Playbook Route - 운영 플레이북 체크리스트 자동화
 * 
 * 목표: 매일 10분 루틴을 자동화된 체크리스트로 제공
 */

import { Router } from "express";
import { prisma } from "../data/prisma";

const router = Router();

/**
 * GET /api/admin/playbook/daily
 * 매일 10분 루틴 체크리스트
 */
router.get("/daily", async (req, res) => {
  try {
    const region = (req.query.region as string) || "seoul";
    const date =
      (req.query.date as string) ||
      new Date().toISOString().split("T")[0];

    // 위젯 데이터 조회
    const widgetsRes = await fetch(
      `http://localhost:${process.env.PORT || 3001}/api/admin/widgets/all?region=${region}&date=${date}`
    ).catch(() => null);

    const widgets = widgetsRes ? await widgetsRes.json() : null;

    // 일일 체크리스트 데이터 조회
    const dailyRes = await fetch(
      `http://localhost:${process.env.PORT || 3001}/api/admin/daily/check?region=${region}&date=${date}`
    ).catch(() => null);

    const daily = dailyRes ? await dailyRes.json() : null;

    // 체크리스트 구성
    const checklist = {
      date,
      region,
      timestamp: new Date().toISOString(),
      sections: [
        {
          title: "⏱ 0–3분 | 대시보드 위젯 확인",
          items: widgets
            ? [
                {
                  id: "widget1_ctr",
                  label: "위젯 1 (Story Health): CTR ≥ 2.5%",
                  status:
                    widgets.widgets?.storyHealth?.metrics?.ctr?.status ===
                    "정상"
                      ? "pass"
                      : widgets.widgets?.storyHealth?.metrics?.ctr?.status ===
                        "주의"
                      ? "warning"
                      : "fail",
                  value: widgets.widgets?.storyHealth?.metrics?.ctr?.value,
                  target: 0.025,
                  action: widgets.widgets?.storyHealth?.metrics?.ctr?.action,
                },
                {
                  id: "widget1_fillrate",
                  label: "위젯 1 (Story Health): FillRate = 100%",
                  status:
                    widgets.widgets?.storyHealth?.metrics?.fillRate?.status ===
                    "정상"
                      ? "pass"
                      : widgets.widgets?.storyHealth?.metrics?.fillRate
                          ?.status === "주의"
                      ? "warning"
                      : "fail",
                  value: widgets.widgets?.storyHealth?.metrics?.fillRate?.value,
                  target: 1.0,
                  action:
                    widgets.widgets?.storyHealth?.metrics?.fillRate?.action,
                },
                {
                  id: "widget1_freshrate",
                  label: "위젯 1 (Story Health): FreshRate ≥ 40%",
                  status:
                    widgets.widgets?.storyHealth?.metrics?.freshRate?.status ===
                    "정상"
                      ? "pass"
                      : widgets.widgets?.storyHealth?.metrics?.freshRate
                          ?.status === "주의"
                      ? "warning"
                      : "fail",
                  value:
                    widgets.widgets?.storyHealth?.metrics?.freshRate?.value,
                  target: 0.4,
                  action:
                    widgets.widgets?.storyHealth?.metrics?.freshRate?.action,
                },
                {
                  id: "widget2_viewtoslot",
                  label: "위젯 2 (Booking Funnel): View→Slot ≥ 35%",
                  status:
                    widgets.widgets?.bookingFunnel?.metrics?.viewToSlot
                      ?.status === "정상"
                      ? "pass"
                      : widgets.widgets?.bookingFunnel?.metrics?.viewToSlot
                          ?.status === "주의"
                      ? "warning"
                      : "fail",
                  value:
                    widgets.widgets?.bookingFunnel?.metrics?.viewToSlot?.value,
                  target: 0.35,
                  action:
                    widgets.widgets?.bookingFunnel?.metrics?.viewToSlot?.action,
                },
                {
                  id: "widget2_reservecr",
                  label: "위젯 2 (Booking Funnel): Reserve CR ≥ 22%",
                  status:
                    widgets.widgets?.bookingFunnel?.metrics?.reserveCr
                      ?.status === "정상"
                      ? "pass"
                      : widgets.widgets?.bookingFunnel?.metrics?.reserveCr
                          ?.status === "주의"
                      ? "warning"
                      : "fail",
                  value:
                    widgets.widgets?.bookingFunnel?.metrics?.reserveCr?.value,
                  target: 0.22,
                  action:
                    widgets.widgets?.bookingFunnel?.metrics?.reserveCr?.action,
                },
                {
                  id: "widget2_paycr",
                  label: "위젯 2 (Booking Funnel): Pay CR ≥ 95%",
                  status:
                    widgets.widgets?.bookingFunnel?.metrics?.payCr?.status ===
                    "정상"
                      ? "pass"
                      : widgets.widgets?.bookingFunnel?.metrics?.payCr
                          ?.status === "주의"
                      ? "warning"
                      : "fail",
                  value: widgets.widgets?.bookingFunnel?.metrics?.payCr?.value,
                  target: 0.95,
                  action: widgets.widgets?.bookingFunnel?.metrics?.payCr?.action,
                },
                {
                  id: "widget6_payfail",
                  label: "위젯 6 (System Guard): PayFail ≤ 5건",
                  status:
                    widgets.widgets?.systemGuard?.metrics?.payFail?.status ===
                    "정상"
                      ? "pass"
                      : widgets.widgets?.systemGuard?.metrics?.payFail
                          ?.status === "주의"
                      ? "warning"
                      : "fail",
                  value: widgets.widgets?.systemGuard?.metrics?.payFail?.value,
                  target: 5,
                  action: widgets.widgets?.systemGuard?.metrics?.payFail?.action,
                },
                {
                  id: "widget6_offline",
                  label: "위젯 6 (System Guard): OfflineRate ≤ 12%",
                  status:
                    widgets.widgets?.systemGuard?.metrics?.offlineRate?.status ===
                    "정상"
                      ? "pass"
                      : widgets.widgets?.systemGuard?.metrics?.offlineRate
                          ?.status === "주의"
                      ? "warning"
                      : "fail",
                  value:
                    widgets.widgets?.systemGuard?.metrics?.offlineRate?.value,
                  target: 0.12,
                  action:
                    widgets.widgets?.systemGuard?.metrics?.offlineRate?.action,
                },
              ]
            : [],
        },
        {
          title: "⏱ 3–7분 | 위험 신호 대응",
          items: widgets
            ? [
                {
                  id: "risk_ctr",
                  label: "CTR < 2% (위험) → 스토리 자동 교체 확인",
                  status:
                    widgets.widgets?.storyHealth?.metrics?.ctr?.status ===
                    "위험"
                      ? "fail"
                      : "pass",
                  action: "오토파일럿이 자동 실행됨. 새 스토리 생성 확인",
                },
                {
                  id: "risk_reservecr",
                  label: "Reserve CR < 15% (위험) → 할인 캠페인 확인",
                  status:
                    widgets.widgets?.bookingFunnel?.metrics?.reserveCr
                      ?.status === "위험"
                      ? "fail"
                      : "pass",
                  action:
                    "오토파일럿이 자동 실행됨. 할인 캠페인 활성화 확인",
                },
                {
                  id: "risk_payfail",
                  label: "PayFail > 10건 (위험) → 결제 보호 모드 확인",
                  status:
                    widgets.widgets?.systemGuard?.metrics?.payFail?.status ===
                    "위험"
                      ? "fail"
                      : "pass",
                  action:
                    "오토파일럿이 자동 실행됨. PG 재시도 로그 확인",
                },
                {
                  id: "risk_fillrate",
                  label: "FillRate < 100% (위험) → 운영 픽 즉시 투입",
                  status:
                    widgets.widgets?.storyHealth?.metrics?.fillRate?.status ===
                    "위험"
                      ? "fail"
                      : "pass",
                  action: "수동 액션 필요: 운영 픽 즉시 투입 (5분)",
                },
              ]
            : [],
        },
        {
          title: "⏱ 7–10분 | 일일 체크리스트 확인",
          items: daily
            ? [
                {
                  id: "daily_story_slots",
                  label: "스토리 슬롯 5/5 유지",
                  status: daily.storySlots === 5 ? "pass" : "fail",
                  value: daily.storySlots,
                  target: 5,
                },
                {
                  id: "daily_ab_experiment",
                  label: "AB 실험 상태 확인",
                  status:
                    daily.abExperiment?.sample >= 3000 &&
                    daily.abExperiment?.uplift >= 0.1
                      ? "pass"
                      : "warning",
                  value: daily.abExperiment,
                },
                {
                  id: "daily_community",
                  label: "커뮤니티 엔진 확인 (팀 ≥ 20, 일 가입 ≥ 5)",
                  status:
                    daily.community?.teamCount >= 20 &&
                    daily.community?.todayJoins >= 5
                      ? "pass"
                      : "warning",
                  value: daily.community,
                },
                {
                  id: "daily_settlement",
                  label: "정산 상태 확인",
                  status: daily.settlement?.pendingCount > 0 ? "warning" : "pass",
                  value: daily.settlement,
                },
              ]
            : [],
        },
      ],
      summary: {
        totalItems: 0,
        passed: 0,
        warning: 0,
        failed: 0,
      },
    };

    // Summary 계산
    checklist.sections.forEach((section) => {
      section.items.forEach((item) => {
        checklist.summary.totalItems++;
        if (item.status === "pass") {
          checklist.summary.passed++;
        } else if (item.status === "warning") {
          checklist.summary.warning++;
        } else if (item.status === "fail") {
          checklist.summary.failed++;
        }
      });
    });

    res.json(checklist);
  } catch (error) {
    console.error("[GET /admin/playbook/daily]", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * GET /api/admin/playbook/slack
 * Slack 알림용 템플릿
 */
router.get("/slack", async (req, res) => {
  try {
    const region = (req.query.region as string) || "seoul";
    const date =
      (req.query.date as string) ||
      new Date().toISOString().split("T")[0];

    const checklistRes = await fetch(
      `http://localhost:${process.env.PORT || 3001}/api/admin/playbook/daily?region=${region}&date=${date}`
    ).catch(() => null);

    const checklist = checklistRes ? await checklistRes.json() : null;

    if (!checklist) {
      return res.json({
        text: `🚨 ${region} 허브 일일 체크리스트 조회 실패`,
      });
    }

    const { summary } = checklist;

    // Slack 메시지 포맷
    const slackMessage = {
      text: `📊 ${region} 허브 일일 체크리스트 (${date})`,
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: `📊 ${region} 허브 일일 체크리스트`,
            emoji: true,
          },
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*날짜:*\n${date}`,
            },
            {
              type: "mrkdwn",
              text: `*지역:*\n${region}`,
            },
          ],
        },
        {
          type: "divider",
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*📈 요약*\n✅ 통과: ${summary.passed}개\n⚠️ 주의: ${summary.warning}개\n❌ 실패: ${summary.failed}개`,
          },
        },
        {
          type: "divider",
        },
      ],
    };

    // 실패 항목만 상세 표시
    checklist.sections.forEach((section: any) => {
      const failedItems = section.items.filter(
        (item: any) => item.status === "fail"
      );

      if (failedItems.length > 0) {
        slackMessage.blocks.push({
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*❌ ${section.title}*\n${failedItems
              .map(
                (item: any) =>
                  `• ${item.label}\n  → ${item.action || "액션 필요"}`
              )
              .join("\n")}`,
          },
        });
      }
    });

    // 전체 체크리스트 링크
    slackMessage.blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*전체 체크리스트:*\n<http://localhost:${process.env.PORT || 3001}/api/admin/playbook/daily?region=${region}&date=${date}|여기서 확인>`,
      },
    });

    res.json(slackMessage);
  } catch (error) {
    console.error("[GET /admin/playbook/slack]", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

export default router;
