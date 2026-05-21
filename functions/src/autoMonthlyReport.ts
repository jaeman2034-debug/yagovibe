// functions/src/autoMonthlyReport.ts
// 📊 월간 운영 리포트 자동 생성 함수
// 매월 1일 00:05 (KST) 자동 실행

import { onSchedule } from "firebase-functions/v2/scheduler";
import { onCall } from "firebase-functions/v2/https";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { initializeApp, getApps } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";
import { UNPAID_1_MONTH, UNPAID_2_MONTHS, UNPAID_3_MONTHS_PLUS, ANNUAL_FEE_REMINDER, getTemplate } from "./notifications/templates/unpaid_reminder";
// 🔥 Lazy import: memberStatusTransition은 함수 실행 시점에 동적 로드
// import { autoTransitionMemberStatuses } from "./memberStatusTransition";

// Firebase Admin 초기화
if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();

/**
 * 📊 월간 리포트 생성 로직 (Functions 내부 구현)
 */
async function generateMonthlyReportForTeam(
  members: any[],
  month: string,
  feePolicy: any,
  ledgerItemsByMonth?: { [yyyymm: string]: any[] }
): Promise<any> {
  // 🔥 삭제된 회원 제외
  const activeMembers = members.filter((m: any) => !m.isDeleted);
  
  // 📊 회원 통계
  const memberStats = {
    total: activeMembers.length,
    active: activeMembers.filter((m: any) => m.status === "active").length,
    paused: activeMembers.filter((m: any) => m.status === "paused").length,
    expelled: activeMembers.filter((m: any) => m.status === "expelled").length,
  };
  
  // 💰 회비 통계
  const feeStats = {
    totalEligible: activeMembers.filter((m: any) => {
      const resolved = m.feePlan || "monthly";
      return resolved !== "exempt";
    }).length,
    monthly: activeMembers.filter((m: any) => m.feePlan === "monthly").length,
    annual: activeMembers.filter((m: any) => m.feePlan === "annual").length,
    exempt: activeMembers.filter((m: any) => m.feePlan === "exempt").length,
  };
  
  // 💰 회비 수입 계산
  let expectedAmount = 0;
  let actualAmount = 0;
  let paidCount = 0;
  let unpaidCount = 0;
  const exemptCount = feeStats.exempt;
  
  activeMembers.forEach((member: any) => {
    if (member.status === "paused" || member.status === "expelled") {
      return; // 휴원/제명은 회비 계산 제외
    }
    
    // 월회비 계산 (간단 버전)
    const monthlyFee = member.feePlan === "annual" ? 0 : (member.feePlan === "exempt" ? 0 : feePolicy.monthly);
    
    if (member.feePlan === "exempt") {
      return; // 면제자는 제외
    }
    
    expectedAmount += monthlyFee;
    
    // 🔥 해당 월 ledger 항목 확인
    if (ledgerItemsByMonth && ledgerItemsByMonth[month]) {
      const ledgerItem = ledgerItemsByMonth[month].find(
        (item: any) => item.memberId === member.id
      );
      
      if (ledgerItem && ledgerItem.paidAmount >= ledgerItem.dueAmount) {
        actualAmount += ledgerItem.paidAmount;
        paidCount++;
      } else {
        unpaidCount++;
      }
    } else {
      unpaidCount++;
    }
  });
  
  const unpaidAmount = expectedAmount - actualAmount;
  
  // ⚠️ 주의 항목 생성
  const alerts: any[] = [];
  
  // 2개월 연속 미납자
  const consecutiveUnpaid: string[] = [];
  activeMembers.forEach((member: any) => {
    if (member.status === "active" && member.feePlan !== "exempt" && (member.unpaidMonths || 0) >= 2) {
      consecutiveUnpaid.push(member.name);
    }
  });
  if (consecutiveUnpaid.length > 0) {
    alerts.push({
      type: "CONSECUTIVE_UNPAID",
      message: `${consecutiveUnpaid.length}명의 회원이 2개월 이상 미납 상태입니다`,
      memberNames: consecutiveUnpaid,
    });
  }
  
  // 휴원 후 미복귀
  const pausedNotRestored: string[] = [];
  activeMembers.forEach((member: any) => {
    if (member.status === "paused") {
      pausedNotRestored.push(member.name);
    }
  });
  if (pausedNotRestored.length > 0) {
    alerts.push({
      type: "PAUSED_NOT_RESTORED",
      message: `${pausedNotRestored.length}명의 회원이 휴원 상태입니다`,
      memberNames: pausedNotRestored,
    });
  }
  
  // 임원 중 회비 미납
  const executiveUnpaid: string[] = [];
  activeMembers.forEach((member: any) => {
    const isExecutive = member.role !== "일반";
    if (isExecutive && member.status === "active" && member.feePlan !== "exempt" && (member.unpaidMonths || 0) > 0) {
      executiveUnpaid.push(member.name);
    }
  });
  if (executiveUnpaid.length > 0) {
    alerts.push({
      type: "EXECUTIVE_UNPAID",
      message: `${executiveUnpaid.length}명의 임원이 회비 미납 상태입니다`,
      memberNames: executiveUnpaid,
    });
  }
  
  return {
    month,
    memberStats,
    feeStats: {
      ...feeStats,
      expectedAmount,
      paidAmount: actualAmount,
      unpaidAmount,
    },
    feeRevenue: {
      expectedAmount,
      actualAmount,
      unpaidAmount,
      paidCount,
      unpaidCount,
      exemptCount,
    },
    alerts,
    generatedAt: new Date(),
    generatedBy: "SYSTEM",
  };
}

/**
 * 📊 월간 운영 리포트 자동 생성
 * 매월 1일 00:05 (KST) 자동 실행
 * 모든 팀에 대해 전월 리포트 생성
 */
export const autoMonthlyReport = onSchedule(
  {
    schedule: "5 0 1 * *", // 매월 1일 00:05 (KST)
    timeZone: "Asia/Seoul",
  },
  async () => {
    try {
      console.log("📊 [autoMonthlyReport] 월간 운영 리포트 자동 생성 시작");

      // 🔥 전월 계산 (이번 달 1일이므로 전월 리포트 생성)
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const monthStr = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, "0")}`;
      
      console.log(`📅 생성 대상 월: ${monthStr}`);

      // 🔥 모든 팀 조회
      const teamsSnapshot = await db.collection("teams").get();
      console.log(`👥 총 ${teamsSnapshot.size}개 팀 발견`);

      let successCount = 0;
      let errorCount = 0;

      // 🔥 각 팀별 리포트 생성
      for (const teamDoc of teamsSnapshot.docs) {
        const teamId = teamDoc.id;
        const teamData = teamDoc.data();

        try {
          console.log(`📊 팀 ${teamData.name || teamId} 리포트 생성 중...`);

          // 🔥 회원 데이터 조회
          const membersSnapshot = await db
            .collection("teams")
            .doc(teamId)
            .collection("members")
            .get();

          const members = membersSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          // 🔥 feePolicy 가져오기 (팀 설정에서)
          const feePolicy = {
            monthly: teamData.monthlyFee || 20000,
            annualAmount: teamData.annualAmount || 200000,
            annualPayBy: teamData.annualPayBy || "02-28",
            annualBenefitMonths: teamData.annualBenefitMonths || 2,
            graceUnpaidMonths: teamData.graceUnpaidMonths || 3,
          };

          // 🔥 ledger 항목 가져오기 (해당 월)
          const ledgerSnapshot = await db
            .collection("teams")
            .doc(teamId)
            .collection("ledger")
            .where("month", "==", monthStr)
            .get();

          const ledgerItemsByMonth: { [key: string]: any[] } = {};
          ledgerSnapshot.forEach((doc) => {
            const data = doc.data();
            const month = data.month || monthStr;
            if (!ledgerItemsByMonth[month]) {
              ledgerItemsByMonth[month] = [];
            }
            ledgerItemsByMonth[month].push({ id: doc.id, ...data });
          });

          // 📊 리포트 생성 (로직 직접 구현 - Functions 환경에서는 클라이언트 코드 직접 import 불가)
          // generateMonthlyReport 로직을 Functions 내부에서 직접 구현
          const reportData = await generateMonthlyReportForTeam(
            members as any,
            monthStr,
            feePolicy,
            ledgerItemsByMonth
          );

          // 🔥 Firestore에 저장
          const reportRef = db
            .collection("teams")
            .doc(teamId)
            .collection("monthlyReports")
            .doc(monthStr);

          await reportRef.set({
            ...reportData,
            generatedAt: FieldValue.serverTimestamp(),
            generatedBy: "SYSTEM",
            generatedByName: "자동 생성 시스템",
          });

          console.log(`✅ 팀 ${teamData.name || teamId} 리포트 생성 완료`);
          successCount++;

          // 🔥 0️⃣ 장기 미납 자동 상태 전환 (월간 리포트 생성 = 공식 판결문)
          try {
            console.log(`🔄 장기 미납 자동 상태 전환 시작...`);
            // 🔥 Lazy import: 초기화 단계에서 로드되지 않도록 동적 import
            const { autoTransitionMemberStatuses } = await import("./memberStatusTransition");
            await autoTransitionMemberStatuses(teamId, monthStr);
            console.log(`✅ 상태 전환 완료`);
          } catch (transitionError) {
            console.error(`❌ 상태 전환 실패:`, transitionError);
            // 상태 전환 실패해도 리포트 생성은 성공으로 처리
          }

          // 🔥 1️⃣ 미납자 자동 알림
          const unpaidAlert = reportData.alerts?.find(
            (a: any) => a.type === "CONSECUTIVE_UNPAID" || a.type === "UNPAID_2_MONTHS"
          );

          if (unpaidAlert && unpaidAlert.memberNames && unpaidAlert.memberNames.length > 0) {
            console.log(`⚠️ 미납 알림 대상: ${unpaidAlert.memberNames.length}명`);
            
            // 🔥 미납 회원 정보 조회
            const unpaidMembersSnapshot = await db
              .collection("teams")
              .doc(teamId)
              .collection("members")
              .where("name", "in", unpaidAlert.memberNames.slice(0, 10)) // Firestore 'in' 쿼리 제한: 최대 10개
              .get();

            const unpaidMembers: any[] = [];
            unpaidMembersSnapshot.forEach((doc) => {
              const memberData = doc.data();
              unpaidMembers.push({
                id: doc.id,
                name: memberData.name,
                phone: memberData.phone || memberData.phoneLast4,
                unpaidMonths: memberData.unpaidMonths || 0,
                userId: memberData.userId,
                ...memberData,
              });
            });

            // 🔥 미납 알림 로그 기록
            const notificationRef = await db.collection("teams").doc(teamId).collection("unpaidNotifications").add({
              month: monthStr,
              memberNames: unpaidAlert.memberNames,
              memberIds: unpaidMembers.map((m) => m.id),
              count: unpaidAlert.memberNames.length,
              notifiedAt: FieldValue.serverTimestamp(),
              status: "PENDING",
            });

            // 🔔 미납 알림 발송 (앱 푸시/문자)
            for (const member of unpaidMembers) {
              try {
                // 🔥 알림 메시지 템플릿
                const message = `[${teamData.name || "팀"}] ${member.name}님, 회비 미납 안내\n\n` +
                  `현재 ${member.unpaidMonths || 0}개월 미납 상태입니다.\n` +
                  `빠른 시일 내에 납부 부탁드립니다.\n\n` +
                  `문의: ${teamData.contact || "팀 관리자"}`;

                // 🔥 Firestore에 알림 기록
                await db.collection("teams").doc(teamId).collection("memberNotifications").add({
                  memberId: member.id,
                  memberName: member.name,
                  type: "UNPAID_REMINDER",
                  message,
                  month: monthStr,
                  unpaidMonths: member.unpaidMonths || 0,
                  sentAt: FieldValue.serverTimestamp(),
                  status: "SENT",
                });

                // 🔥 FCM 푸시 알림 발송 (userId가 있는 경우)
                if (member.userId) {
                  try {
                    const { sendNotificationToUser } = await import("./sendUserNotification");
                    await sendNotificationToUser(member.userId, {
                      title: `회비 미납 안내`,
                      body: `${member.name}님, 현재 ${member.unpaidMonths || 0}개월 미납 상태입니다.`,
                      data: {
                        type: "UNPAID_REMINDER",
                        memberId: member.id,
                        month: monthStr,
                      },
                    });
                    console.log(`📱 푸시 알림 발송: ${member.name}`);
                  } catch (pushError) {
                    console.error(`❌ 푸시 알림 발송 실패 (${member.name}):`, pushError);
                  }
                }

                // 🔥 TODO: 문자 발송 (SMS API 연동)
                // if (member.phone) {
                //   await sendSMS(member.phone, message);
                // }

                console.log(`📱 미납 알림 발송: ${member.name} (${member.unpaidMonths}개월 미납)`);
              } catch (error) {
                console.error(`❌ ${member.name} 알림 발송 실패:`, error);
              }
            }

            // 🔥 알림 상태 업데이트
            await notificationRef.update({
              status: "SENT",
              sentAt: FieldValue.serverTimestamp(),
            });
          }

          // 🔥 2️⃣ 연회비 자동 판정 (2월 리포트인 경우)
          if (monthStr.endsWith("-02")) {
            console.log("💰 2월 리포트: 연회비 자동 판정 시작");
            
            // 🔥 연회비 납부 기한 확인 (기본: 2월 28일)
            const annualPayBy = teamData.annualPayBy || "02-28";
            const [payMonth, payDay] = annualPayBy.split("-").map(Number);
            const currentDate = new Date();
            const payDeadline = new Date(currentDate.getFullYear(), payMonth - 1, payDay);

            // 🔥 연회비 회원 조회
            const annualMembersSnapshot = await db
              .collection("teams")
              .doc(teamId)
              .collection("members")
              .where("feePlan", "==", "annual")
              .get();

            const unpaidAnnualMembers: string[] = [];
            const paidAnnualMembers: string[] = [];

            for (const memberDoc of annualMembersSnapshot.docs) {
              const memberData = memberDoc.data();
              const annualPaidYear = memberData.annualPaidYear;
              const currentYear = currentDate.getFullYear();

              // 🔥 연회비 납부 여부 확인
              if (!annualPaidYear || annualPaidYear < currentYear) {
                // 미납자
                unpaidAnnualMembers.push(memberData.name);
                
                // 연회비 미납 플래그
                await memberDoc.ref.update({
                  annualFeeUnpaid: true,
                  annualFeeUnpaidSince: FieldValue.serverTimestamp(),
                });
              } else {
                // 납부 완료
                paidAnnualMembers.push(memberData.name);
                
                // 플래그 제거
                await memberDoc.ref.update({
                  annualFeeUnpaid: false,
                });
              }
            }

            // 🔥 연회비 판정 결과 기록
            await db.collection("teams").doc(teamId).collection("annualFeeEvaluations").add({
              month: monthStr,
              year: currentDate.getFullYear(),
              deadline: payDeadline,
              evaluatedAt: FieldValue.serverTimestamp(),
              unpaidCount: unpaidAnnualMembers.length,
              paidCount: paidAnnualMembers.length,
              unpaidMembers: unpaidAnnualMembers,
              paidMembers: paidAnnualMembers,
              status: "EVALUATED",
            });

            // 🔥 연회비 미납자 알림
            if (unpaidAnnualMembers.length > 0) {
              console.log(`⚠️ 연회비 미납자: ${unpaidAnnualMembers.length}명`);
              
              // 연회비 미납 알림 발송 (배치 처리: 10개씩)
              for (let i = 0; i < unpaidAnnualMembers.length; i += 10) {
                const batch = unpaidAnnualMembers.slice(i, i + 10);
                const annualUnpaidMembersSnapshot = await db
                  .collection("teams")
                  .doc(teamId)
                  .collection("members")
                  .where("name", "in", batch)
                  .get();

                for (const memberDoc of annualUnpaidMembersSnapshot.docs) {
                  const memberData = memberDoc.data();
                  const template = ANNUAL_FEE_REMINDER;
                  const message = template.getMessage({
                    memberName: memberData.name,
                    year: currentDate.getFullYear(),
                    deadline: annualPayBy,
                    amount: feePolicy.annualAmount,
                    teamName: teamData.name || "팀",
                  });

                  await db.collection("teams").doc(teamId).collection("memberNotifications").add({
                    memberId: memberDoc.id,
                    memberName: memberData.name,
                    type: "ANNUAL_FEE_REMINDER",
                    message,
                    month: monthStr,
                    year: currentDate.getFullYear(),
                    deadline: annualPayBy,
                    sentAt: FieldValue.serverTimestamp(),
                    status: "SENT",
                  });

                  // 🔥 FCM 푸시 알림 발송
                  if (memberData.userId) {
                    try {
                      const { sendNotificationToUser } = await import("./sendUserNotification");
                      await sendNotificationToUser(memberData.userId, {
                        title: `연회비 납부 안내`,
                        body: `${memberData.name}님, ${currentDate.getFullYear()}년 연회비 납부 기한이 ${annualPayBy}입니다.`,
                        data: {
                          type: "ANNUAL_FEE_REMINDER",
                          memberId: memberDoc.id,
                          year: String(currentDate.getFullYear()),
                          deadline: annualPayBy,
                        },
                      });
                    } catch (pushError) {
                      console.error(`❌ 연회비 푸시 알림 발송 실패 (${memberData.name}):`, pushError);
                    }
                  }
                }
              }
            }
          }

        } catch (error) {
          console.error(`❌ 팀 ${teamData.name || teamId} 리포트 생성 실패:`, error);
          errorCount++;

          // 에러 로그 기록
          await db.collection("monthlyReportErrors").add({
            teamId,
            teamName: teamData.name || teamId,
            month: monthStr,
            error: String(error),
            createdAt: FieldValue.serverTimestamp(),
          });
        }
      }

      // 🔥 전체 결과 로그
      const summary = {
        month: monthStr,
        totalTeams: teamsSnapshot.size,
        successCount,
        errorCount,
        generatedAt: new Date(),
      };

      await db.collection("monthlyReportLogs").add(summary);

      console.log(`✅ 월간 리포트 자동 생성 완료: ${successCount}개 성공, ${errorCount}개 실패`);

    } catch (error) {
      console.error("❌ 월간 리포트 자동 생성 실패:", error);
      
      // 에러 로그 기록
      try {
        await db.collection("monthlyReportErrors").add({
          type: "GLOBAL_ERROR",
          error: String(error),
          createdAt: new Date(),
        });
      } catch (logError) {
        console.error("❌ 에러 로그 기록 실패:", logError);
      }
    }
  }
);

