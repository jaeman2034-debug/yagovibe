// src/pages/team/TeamLedgerPage.tsx
// 🔥 통합 엔진: 월별 정산 실행 (총무용)

import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useTeam } from "@/context/TeamContext";
import { useAuth } from "@/context/AuthProvider";
import { collection, query, where, getDocs, doc, setDoc, updateDoc, serverTimestamp, getDoc, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { reconcileMonth, calculateDueAmount, type TeamMember, type TeamFeePolicy, type LedgerItem } from "@/utils/teamRules";
import { createNotificationQueueAfterReconcile } from "@/utils/notificationService";
import { generateMonthlyReportPDF } from "@/utils/pdfReportGenerator";
import { simulateReconciliation } from "@/utils/simulationMode";
import { getActiveRuleSet } from "@/utils/ruleRegistry";
import { createMonthlyBackup } from "@/utils/backupService";

export default function TeamLedgerPage() {
  const { type } = useParams<{ type: string }>();
  const navigate = useNavigate();
  const { myTeam } = useTeam();
  const { user } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(
    `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`
  );
  const [ledgerItems, setLedgerItems] = useState<{ [memberId: string]: LedgerItem }>({});
  const [loading, setLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [showSimulation, setShowSimulation] = useState(false);
  const [simulationResult, setSimulationResult] = useState<any>(null);

  // 🔥 회원 목록 조회
  useEffect(() => {
    if (!myTeam?.id) return;

    const fetchMembers = async () => {
      try {
        const membersQuery = query(
          collection(db, "teams", myTeam.id, "members")
        );
        const snapshot = await getDocs(membersQuery);
        const membersList: TeamMember[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          membersList.push({
            id: doc.id,
            name: data.name || "",
            role: (data.role as TeamMember["role"]) || "일반",
            status: (data.status as "active" | "paused" | "expelled") || "active",
            feePlan: (data.feePlan as "monthly" | "annual" | "exempt") || "monthly",
            exemptReason: data.exemptReason,
            manualFeeOverride: data.manualFeeOverride || false,
            unpaidMonths: data.unpaidMonths || 0,
            annualPaidYear: data.annualPaidYear || undefined,
            annualPaidAt: data.annualPaidAt?.toDate() || undefined,
            penaltyPoints: data.penaltyPoints || 0,
            phoneLast4: data.phoneLast4,
            memo: data.memo,
            joinedAt: data.joinedAt?.toDate() || new Date(),
          });
        });
        setMembers(membersList);
      } catch (error) {
        console.error("회원 목록 조회 실패:", error);
      }
    };

    fetchMembers();
  }, [myTeam?.id]);

  // 🔥 ledger 항목 조회
  useEffect(() => {
    if (!myTeam?.id || !selectedMonth) return;

    const fetchLedger = async () => {
      try {
        const [year, month] = selectedMonth.split("-");
        const ledgerRef = collection(
          db,
          "teams",
          myTeam.id,
          "ledger",
          selectedMonth,
          "items"
        );
        const snapshot = await getDocs(ledgerRef);
        const items: { [memberId: string]: LedgerItem } = {};
        snapshot.forEach((doc) => {
          const data = doc.data();
          items[doc.id] = {
            memberId: doc.id,
            dueAmount: data.dueAmount || 0,
            paidAmount: data.paidAmount || 0,
            paidAt: data.paidAt?.toDate() || undefined,
            method: data.method,
            note: data.note,
          };
        });
        setLedgerItems(items);
      } catch (error) {
        console.error("ledger 조회 실패:", error);
      }
    };

    fetchLedger();
  }, [myTeam?.id, selectedMonth]);

  // 🔒 정산 미리보기 (시뮬레이션 모드)
  const handleSimulate = async () => {
    if (!myTeam?.id) return;

    setLoading(true);
    try {
      const feePolicy = myTeam.feePolicy || {
        monthly: 20000,
        annualAmount: 200000,
        annualPayBy: "02-28",
        annualBenefitMonths: 2,
        graceUnpaidMonths: 3,
      };

      const result = await simulateReconciliation(
        myTeam.id,
        selectedMonth,
        members,
        feePolicy
      );

      setSimulationResult(result);
      setShowSimulation(true);
    } catch (error) {
      console.error("시뮬레이션 실패:", error);
      alert("시뮬레이션에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 🔥 정산 실행 (중복 방지 + 확인 모달)
  const handleReconcile = async () => {
    if (!myTeam?.id || !user?.uid) return;

    // 🔥 1. 중복 실행 방지: 이미 정산된 월인지 확인
    try {
      const ledgerMonthRef = doc(db, "teams", myTeam.id, "ledger", selectedMonth);
      const ledgerMonthSnap = await getDoc(ledgerMonthRef);
      const ledgerMonthData = ledgerMonthSnap.data();
      
      if (ledgerMonthData?.finalized === true) {
        const confirmed = window.confirm(
          `${selectedMonth}은(는) 이미 정산이 완료된 월입니다.\n\n재정산을 진행하시겠습니까?\n\n⚠️ 주의: 재정산 시 기존 데이터가 덮어씌워집니다.`
        );
        if (!confirmed) return;
      }
    } catch (error) {
      console.error("정산 상태 확인 실패:", error);
    }

    // 🔥 2. 확인 모달 (요약 미리보기)
    const summary = `정산 실행 요약:\n\n` +
      `• 대상 월: ${selectedMonth}\n` +
      `• 회원 수: ${members.length}명\n` +
      `• 정산 후 알림 자동 발송\n` +
      `• PDF 리포트 자동 생성\n` +
      `• 자동 백업 실행\n\n` +
      `정산을 실행하시겠습니까?`;
    
    if (!window.confirm(summary)) return;

    setLoading(true);
    try {
      // 🔒 활성 규칙 버전 조회
      const activeRuleSet = await getActiveRuleSet(myTeam.id);
      const ruleVersion = activeRuleSet?.version || "2025.1";
      // feePolicy 조회
      const teamRef = doc(db, "teams", myTeam.id);
      const teamSnap = await getDoc(teamRef);
      const teamData = teamSnap.data();
      
      const feePolicy: TeamFeePolicy = teamData?.feePolicy || {
        monthly: 20000,
        annualAmount: 200000,
        annualPayBy: "02-28",
        annualBenefitMonths: 2,
        graceUnpaidMonths: 3,
      };

      // 기존 ledger 항목 수집 (월별로 그룹화)
      const existingLedgerItemsByMonth: { [yyyymm: string]: LedgerItem[] } = {};
      
      // 최근 12개월 ledger 조회
      const now = new Date();
      for (let i = 0; i < 12; i++) {
        const checkDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const yyyymm = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, "0")}`;
        
        try {
          const ledgerRef = collection(
            db,
            "teams",
            myTeam.id,
            "ledger",
            yyyymm,
            "items"
          );
          const snapshot = await getDocs(ledgerRef);
          const monthItems: LedgerItem[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            monthItems.push({
              memberId: doc.id,
              dueAmount: data.dueAmount || 0,
              paidAmount: data.paidAmount || 0,
              paidAt: data.paidAt?.toDate() || undefined,
              method: data.method,
              note: data.note,
            });
          });
          existingLedgerItemsByMonth[yyyymm] = monthItems;
        } catch (error) {
          // 해당 월 ledger가 없으면 빈 배열
          existingLedgerItemsByMonth[yyyymm] = [];
        }
      }
      
      // 현재 선택된 월의 ledger 항목도 추가
      existingLedgerItemsByMonth[selectedMonth] = Object.values(ledgerItems);

      // 🔒 정산 실행 (규칙 버전 포함)
      const { updatedMembers, ledgerUpdates, auditLogs } = await reconcileMonth(
        myTeam.id,
        selectedMonth,
        members,
        feePolicy,
        existingLedgerItemsByMonth,
        ruleVersion
      );

      // 🔥 ledger 업데이트
      for (const item of ledgerUpdates) {
        const itemRef = doc(
          db,
          "teams",
          myTeam.id,
          "ledger",
          selectedMonth,
          "items",
          item.memberId
        );
        await setDoc(itemRef, {
          dueAmount: item.dueAmount,
          paidAmount: item.paidAmount,
          paidAt: item.paidAt ? serverTimestamp() : null,
          method: item.method || null,
          note: item.note || null,
          calculatedByRuleVersion: item.calculatedByRuleVersion || ruleVersion, // 🔒 규칙 버전 기록
          updatedAt: serverTimestamp(),
        }, { merge: true });
      }

      // 🔥 정산 완료 마킹 (중복 실행 방지)
      const ledgerMonthRef = doc(db, "teams", myTeam.id, "ledger", selectedMonth);
      await setDoc(ledgerMonthRef, {
        finalized: true,
        finalizedAt: serverTimestamp(),
        finalizedBy: user.uid,
        finalizedByName: user.email || "시스템",
      }, { merge: true });

      // 회원 상태 업데이트
      for (const member of updatedMembers) {
        const memberRef = doc(db, "teams", myTeam.id, "members", member.id!);
        await updateDoc(memberRef, {
          unpaidMonths: member.unpaidMonths,
          status: member.status,
        });
      }

      // 감사 로그 기록
      for (const log of auditLogs) {
        await setDoc(doc(collection(db, "teams", myTeam.id, "auditLogs")), {
          actorId: user.uid,
          actorName: user.email || "시스템",
          action: log.action,
          targetMemberId: log.targetMemberId,
          before: log.before,
          after: log.after,
          reason: log.reason,
          createdAt: serverTimestamp(),
        });
      }

      // 🔥 통지 레이어: PDF 생성 및 알림 큐 생성
      try {
        // 1. 월간 리포트 PDF 생성 및 Storage 저장
        let pdfLink: string | undefined;
        try {
          pdfLink = await generateMonthlyReportPDF(
            myTeam.id,
            selectedMonth,
            updatedMembers.length > 0 ? updatedMembers : members,
            feePolicy
          );
          
          // 🔥 감사 로그: PDF 생성 기록
          await addDoc(collection(db, "teams", myTeam.id, "auditLogs"), {
            actorId: user.uid,
            actorName: user.email || "시스템",
            action: "PDF_REPORT_GENERATED",
            targetMemberId: null,
            before: {},
            after: { yyyymm: selectedMonth, pdfLink },
            reason: "월간 정산 리포트 생성",
            createdAt: serverTimestamp(),
          });
          
          console.log(`[PDF Report] 생성 완료: ${pdfLink}`);
        } catch (pdfError) {
          console.error("PDF 생성 실패:", pdfError);
          // PDF 실패해도 알림은 발송
        }
        
        // 2. 알림 큐 생성 (PDF 링크 포함)
        const queueCount = await createNotificationQueueAfterReconcile(
          myTeam.id,
          selectedMonth,
          updatedMembers.length > 0 ? updatedMembers : members,
          feePolicy,
          pdfLink // 🔥 PDF 링크 전달
        );
        console.log(`[Notification] ${queueCount}개의 알림이 큐에 추가되었습니다. (PDF 링크 포함)`);
      } catch (error) {
        console.error("알림 큐 생성 실패:", error);
        // 알림 실패해도 정산은 완료된 것으로 처리
      }

      // 🔒 자동 백업 실행 (정산 후)
      try {
        await createMonthlyBackup(myTeam.id, selectedMonth, pdfBlob ? undefined : undefined);
        console.log(`[Backup] 월간 백업 완료: ${selectedMonth}`);
      } catch (backupError) {
        console.error("백업 실패:", backupError);
        // 백업 실패해도 정산은 완료된 것으로 처리
      }

      setToastMessage("정산이 완료되었습니다");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    } catch (error) {
      console.error("정산 실행 실패:", error);
      alert("정산 실행에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 🔥 납부 체크/금액 업데이트
  const handlePaymentUpdate = async (memberId: string, paidAmount: number, method?: "cash" | "transfer" | "other") => {
    if (!myTeam?.id) return;

    try {
      const itemRef = doc(
        db,
        "teams",
        myTeam.id,
        "ledger",
        selectedMonth,
        "items",
        memberId
      );
      
      const currentItem = ledgerItems[memberId];
      await setDoc(itemRef, {
        memberId,
        dueAmount: currentItem?.dueAmount || 0,
        paidAmount,
        paidAt: paidAmount > 0 ? serverTimestamp() : null,
        method: method || null,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      // ledgerItems 상태 업데이트
      setLedgerItems({
        ...ledgerItems,
        [memberId]: {
          ...currentItem,
          memberId,
          paidAmount,
          paidAt: paidAmount > 0 ? new Date() : undefined,
          method,
        },
      });
    } catch (error) {
      console.error("납부 업데이트 실패:", error);
      alert("납부 업데이트에 실패했습니다.");
    }
  };

  // 🔥 PDF 출력
  const handleExportPDF = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${selectedMonth} 회비 정산 보고서</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #1f2937; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f3f4f6; }
        </style>
      </head>
      <body>
        <h1>${selectedMonth} 회비 정산 보고서</h1>
        <p><strong>팀명:</strong> ${myTeam?.name || ""}</p>
        <table>
          <thead>
            <tr>
              <th>이름</th>
              <th>청구액</th>
              <th>납부액</th>
              <th>미납액</th>
              <th>납부일</th>
            </tr>
          </thead>
          <tbody>
            ${members.map((member) => {
              const item = ledgerItems[member.id!];
              const due = item?.dueAmount || 0;
              const paid = item?.paidAmount || 0;
              return `
                <tr>
                  <td>${member.name}</td>
                  <td>${due.toLocaleString()}원</td>
                  <td>${paid.toLocaleString()}원</td>
                  <td>${(due - paid).toLocaleString()}원</td>
                  <td>${item?.paidAt ? new Date(item.paidAt).toLocaleDateString("ko-KR") : "-"}</td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  };

  // myTeam이 없으면 로딩 또는 안내 메시지 표시
  if (!myTeam?.id) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <p className="text-gray-600">팀 정보를 불러오는 중...</p>
            <p className="text-sm text-gray-500 mt-2">팀에 가입되어 있지 않거나 팀 정보를 찾을 수 없습니다.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full max-w-none md:mx-auto md:max-w-4xl py-6">
        <div className="mb-6">
          <button
            onClick={() => navigate(`/sports/${type}/team`)}
            className="text-blue-600 hover:text-blue-700 mb-4"
          >
            ← 뒤로
          </button>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">회비 정산</h1>
            <div className="flex gap-2">
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg"
              />
              <button
                onClick={handleSimulate}
                disabled={loading}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 text-sm"
              >
                {loading ? "계산 중..." : "🔒 정산 미리보기"}
              </button>
              <button
                onClick={handleReconcile}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
              >
                {loading ? "정산 중..." : "정산 실행"}
              </button>
              <button
                onClick={handleExportPDF}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
              >
                📄 PDF 출력
              </button>
            </div>
          </div>
        </div>

        {/* 정산 리스트 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">회원별 정산</h2>
          <div className="space-y-3">
            {members.map((member) => {
              const item = ledgerItems[member.id!];
              const due = item?.dueAmount || 0;
              const paid = item?.paidAmount || 0;
              const unpaid = due - paid;
              
              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{member.name}</span>
                      <span className="text-sm text-gray-500">({member.role})</span>
                    </div>
                    <div className="mt-1 text-sm text-gray-600">
                      청구: {due.toLocaleString()}원 | 납부: {paid.toLocaleString()}원
                      {unpaid > 0 && (
                        <span className="ml-2 text-red-600">미납: {unpaid.toLocaleString()}원</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={paid}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 0;
                        handlePaymentUpdate(member.id!, value);
                      }}
                      className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                      placeholder="납부액"
                    />
                    <select
                      onChange={(e) => {
                        const method = e.target.value as "cash" | "transfer" | "other" | "";
                        handlePaymentUpdate(member.id!, paid, method || undefined);
                      }}
                      className="px-2 py-1 border border-gray-300 rounded text-sm"
                    >
                      <option value="">방법</option>
                      <option value="cash">현금</option>
                      <option value="transfer">계좌이체</option>
                      <option value="other">기타</option>
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 🔒 시뮬레이션 결과 모달 */}
      {showSimulation && simulationResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">정산 미리보기</h2>
              <button
                onClick={() => setShowSimulation(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-700 mb-2">
                  ⚠️ 실제 반영되지 않습니다. 확인 후 "정산 실행" 버튼을 눌러주세요.
                </p>
                <p className="text-xs text-blue-600">
                  사용 규칙 버전: {simulationResult.ruleVersion}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-500 mb-1">전체 회원</p>
                  <p className="text-2xl font-bold text-gray-900">{simulationResult.totalMembers}명</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-500 mb-1">활성 회원</p>
                  <p className="text-2xl font-bold text-green-600">{simulationResult.activeMembers}명</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-500 mb-1">예상 수납액</p>
                  <p className="text-2xl font-bold text-blue-600">{simulationResult.expectedRevenue.toLocaleString()}원</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-500 mb-1">미납 증가</p>
                  <p className={`text-2xl font-bold ${simulationResult.unpaidIncrease > 0 ? "text-red-600" : "text-green-600"}`}>
                    {simulationResult.unpaidIncrease}명
                  </p>
                </div>
              </div>

              {simulationResult.pauseCandidates.length > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <h3 className="font-semibold text-orange-900 mb-2">
                    ⚠️ 휴원 예정자 ({simulationResult.pauseCandidates.length}명)
                  </h3>
                  <ul className="space-y-1">
                    {simulationResult.pauseCandidates.map((member: any) => (
                      <li key={member.id || member.memberId} className="text-sm text-orange-700">
                        • {member.name} (미납 {member.unpaidMonths || 0}개월)
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {simulationResult.expelCandidates.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h3 className="font-semibold text-red-900 mb-2">
                    🚨 제명 예정자 ({simulationResult.expelCandidates.length}명)
                  </h3>
                  <ul className="space-y-1">
                    {simulationResult.expelCandidates.map((member: any) => (
                      <li key={member.id || member.memberId} className="text-sm text-red-700">
                        • {member.name} (벌점 {member.penaltyPoints || 0}점)
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowSimulation(false)}
                  className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  닫기
                </button>
                <button
                  onClick={() => {
                    setShowSimulation(false);
                    handleReconcile();
                  }}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  정산 실행
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 토스트 */}
      {showToast && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50">
          {toastMessage}
        </div>
      )}
    </div>
  );
}

