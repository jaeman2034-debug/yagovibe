// src/pages/team/TeamAccountingPage.tsx
// 🔥 레벨 2: 월간 회계 리포트 엔진 (총무용)

import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { useTeam } from "@/context/TeamContext";
import { collection, query, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "@/lib/firebase";
import {
  calculateDueAmount,
  resolveFeePlan,
  type TeamFeePolicy,
  type TeamMember as RulesTeamMember,
} from "@/utils/teamRules";
import {
  teamFeeCurrentSeoulMonthKey,
  teamFeeSeoulCalendarYear,
  isDueInSeoulYm,
} from "@/lib/fees/seoulFeeMonthKey";
import { getSeoulMonthQueryConstraints } from "@/lib/fees/getSeoulMonthQueryConstraints";
import { addMonthsYm, feeMonthKeyForPicker, normalizeYmKey, seoulYmNow } from "@/features/fees/utils/feeMonthUi";
import type { FeePayment, TeamFee, TeamMember as FeeTeamMember } from "@/features/fees/types";
import { useTeamMembers } from "@/features/team/hooks/useTeamMembers";
import { useTeamFees } from "@/features/fees/hooks/useTeamFees";
import {
  buildFeeMemberRows,
  filterFeePaymentsForActiveMembers,
  filterMembersForFeeKpi,
} from "@/features/fees/utils/feeDashboard";
import { fetchTeamPaymentsByFeeId } from "@/lib/team/fetchTeamFeeRollupData";
import { firestoreLikeToDate } from "@/lib/firebase/firestoreLikeToDate";

export type AccountingBasisMode = "cash" | "accrual";

/** 회차·`buildFeeMemberRows` 기준 미납 — CSV/인쇄/UI 금액 SoT */
export type AccountingUnpaidDetail = {
  memberId: string;
  displayName: string;
  amountWon: number;
};

interface AccountingReport {
  month: string; // "2025-03"
  expectedTotal: number; // 예상 회비 총액 (회차 있으면 accrual 청구 합)
  /** 하위 호환·현금주의 기본 표시 — `collectedCashWon`과 동일 */
  collectedTotal: number;
  /** paidAt이 선택 서울 월에 속한 입금(현금 흐름) */
  collectedCashWon: number;
  /** 해당 서울 월 회차별 `buildFeeMemberRows` 완납 금액 합(발생주의) */
  collectedAccrualWon: number;
  unpaidCount: number;
  /** 표시용 이름 목록(회차 미납 시 `unpaidDetails`와 동일 순서 아님) */
  unpaidList: string[];
  /** 회차 미납 시 멤버별 실제 청구 행 합산 금액 */
  unpaidDetails: AccountingUnpaidDetail[];
  exemptCount: number;
  exemptList: string[];
  annualPaidCount: number;
  annualPaidList: string[];
  /** 회차 데이터로 미납 명단을 맞췄는지 */
  unpaidFromPayments: boolean;
}

/** `calculateMonthlyFee`와 동일 기본 정책 — 서울 월 키(연·월)로 `calculateDueAmount`에 전달 */
const ACCOUNTING_PAGE_FEE_POLICY: TeamFeePolicy = {
  monthly: 20000,
  annualAmount: 200000,
  annualPayBy: "02-28",
  annualBenefitMonths: 2,
  graceUnpaidMonths: 3,
};

function parseYmForAccounting(monthStr: string): { y: number; m: number } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(monthStr.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || mo < 1 || mo > 12) return null;
  return { y, m: mo };
}

function isPaidLikeTeamPaymentStatus(raw: unknown): boolean {
  const s = String(raw ?? "")
    .trim()
    .toLowerCase();
  return (
    s === "paid" ||
    s === "already_paid" ||
    s === "completed" ||
    s === "done" ||
    s === "success" ||
    s === "succeeded"
  );
}

/** `teams/.../payments` — `paidAt`이 서울 달 `ym` 안에 있는 문서만 (반개구간 쿼리) */
async function sumPaidAmountsByPaidAtSeoulMonth(teamId: string, ym: string): Promise<number> {
  const monthQ = getSeoulMonthQueryConstraints("paidAt", ym);
  if (!monthQ) return 0;
  const snap = await getDocs(query(collection(db, "teams", teamId, "payments"), ...monthQ));
  let sum = 0;
  for (const docSnap of snap.docs) {
    const data = docSnap.data() as Record<string, unknown>;
    if (!isPaidLikeTeamPaymentStatus(data.status)) continue;
    const amt = Math.floor(Number(data.amount ?? 0));
    if (Number.isFinite(amt) && amt > 0) sum += amt;
  }
  return sum;
}

// 🔥 회계 계산 코어 (선택 월 = Asia/Seoul `YYYY-MM` 키와 동일 축)
function generateAccountingReport(members: any[], monthStr: string): AccountingReport {
  const parsed = parseYmForAccounting(monthStr);
  if (!parsed) {
    return {
      month: monthStr,
      expectedTotal: 0,
      collectedTotal: 0,
      collectedCashWon: 0,
      collectedAccrualWon: 0,
      unpaidCount: 0,
      unpaidList: [],
      unpaidDetails: [],
      exemptCount: 0,
      exemptList: [],
      annualPaidCount: 0,
      annualPaidList: [],
      unpaidFromPayments: false,
    };
  }
  const { y, m: month1to12 } = parsed;

  let expectedTotal = 0;
  let collectedHeuristic = 0;
  const unpaidList: string[] = [];
  const exemptList: string[] = [];
  const annualPaidList: string[] = [];
  let exemptCount = 0;
  let annualPaidCount = 0;

  for (const member of members) {
    const fee = calculateDueAmount(member, ACCOUNTING_PAGE_FEE_POLICY, y, month1to12);
    const resolved = resolveFeePlan(member);

    if (fee === 0) {
      if (resolved.feePlan === "exempt") {
        exemptCount++;
        exemptList.push(member.name);
      } else if (resolved.feePlan === "annual") {
        annualPaidCount++;
        annualPaidList.push(member.name);
      }
    } else {
      expectedTotal += fee;
      collectedHeuristic += fee;
    }
  }

  return {
    month: monthStr,
    expectedTotal,
    collectedTotal: collectedHeuristic,
    collectedCashWon: 0,
    collectedAccrualWon: 0,
    unpaidCount: unpaidList.length,
    unpaidList,
    unpaidDetails: [],
    exemptCount,
    exemptList,
    annualPaidCount,
    annualPaidList,
    unpaidFromPayments: false,
  };
}

function feeMatchesSeoulYm(fee: TeamFee, ym: string): boolean {
  const picker = feeMonthKeyForPicker(fee);
  const normPicker = picker ? normalizeYmKey(picker) : null;
  const normYm = normalizeYmKey(ym);
  if (normPicker && normYm && normPicker === normYm) return true;
  const d = firestoreLikeToDate(fee.dueDate as unknown);
  return isDueInSeoulYm(d, ym);
}

/** 선택 서울 월에 해당하는 회차들 — payments + `buildFeeMemberRows`와 동일 축 */
function computeAccrualRollupForYm(
  roster: FeeTeamMember[],
  feesInMonth: TeamFee[],
  paymentsByFeeId: Record<string, FeePayment[]>
): {
  expectedTotal: number;
  collectedAccrualWon: number;
  unpaidDetails: AccountingUnpaidDetail[];
} {
  let expectedTotal = 0;
  let collectedAccrualWon = 0;
  const unpaidByMember = new Map<string, { displayName: string; amountWon: number }>();

  for (const fee of feesInMonth) {
    const raw = paymentsByFeeId[fee.id] ?? [];
    const plist = filterFeePaymentsForActiveMembers(raw, roster);
    const rows = buildFeeMemberRows(roster, plist, fee.amount, fee.dueDate ?? null, fee.id);
    for (const r of rows) {
      const amt = Math.max(0, Math.floor(Number(r.amount) || 0));
      if (amt <= 0) continue;
      expectedTotal += amt;
      if (r.paymentStatus === "paid") {
        collectedAccrualWon += amt;
        continue;
      }
      const memberId = String(r.memberId ?? r.uid ?? "").trim();
      if (!memberId) continue;
      const displayName = String(r.name ?? "").trim() || "이름없음";
      const prev = unpaidByMember.get(memberId);
      if (prev) {
        unpaidByMember.set(memberId, {
          displayName: displayName !== "이름없음" ? displayName : prev.displayName,
          amountWon: prev.amountWon + amt,
        });
      } else {
        unpaidByMember.set(memberId, { displayName, amountWon: amt });
      }
    }
  }

  const unpaidDetails = [...unpaidByMember.entries()]
    .map(([memberId, v]) => ({
      memberId,
      displayName: v.displayName,
      amountWon: v.amountWon,
    }))
    .sort(
      (a, b) =>
        a.displayName.localeCompare(b.displayName, "ko") || a.memberId.localeCompare(b.memberId)
    );

  return {
    expectedTotal,
    collectedAccrualWon,
    unpaidDetails,
  };
}

function feeMemberToRulesMember(m: FeeTeamMember): RulesTeamMember {
  const dues = m.duesType ?? "monthly";
  const feePlan =
    dues === "exempt" ? "exempt" : dues === "yearly" ? "annual" : "monthly";
  let annualPaidYear: number | undefined;
  if (m.yearlyPaidAt) {
    const d = firestoreLikeToDate(m.yearlyPaidAt);
    if (d) annualPaidYear = teamFeeSeoulCalendarYear(d);
  }
  return {
    name: m.name,
    status: "active",
    role: "일반",
    feePlan,
    exemptReason: feePlan === "exempt" ? "special" : undefined,
    annualPaidYear,
    annualPaidAt: m.yearlyPaidAt ? firestoreLikeToDate(m.yearlyPaidAt) ?? undefined : undefined,
    unpaidMonths: 0,
  };
}

// 🔥 PDF 리포트 생성
function generatePDFReport(report: AccountingReport, teamName: string) {
  // 간단한 PDF 생성 (jsPDF 또는 window.print 사용)
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${report.month} 회비 정산 보고서</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { color: #1f2937; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f3f4f6; }
        .summary { background-color: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <h1>${report.month} 회비 정산 보고서</h1>
      <p><strong>팀명:</strong> ${teamName}</p>
      
      <div class="summary">
        <h2>요약</h2>
        <p>예상 회비 총액: ${report.expectedTotal.toLocaleString()}원</p>
        <p>실제 수납액 (현금·paidAt): ${report.collectedCashWon.toLocaleString()}원</p>
        <p>회차별 완납 합 (발생): ${report.collectedAccrualWon.toLocaleString()}원</p>
        <p>미납자: ${report.unpaidCount}명</p>
        <p>면제자: ${report.exemptCount}명</p>
        <p>연회비 납부자: ${report.annualPaidCount}명</p>
      </div>

      ${
        report.unpaidDetails.length > 0
          ? `
        <h2>미납자 명단</h2>
        <table>
          <thead><tr><th>이름</th><th>미납액(회차 행 기준)</th></tr></thead>
          <tbody>
            ${report.unpaidDetails
              .map(
                (u) =>
                  `<tr><td>${u.displayName}</td><td>${u.amountWon.toLocaleString()}원</td></tr>`
              )
              .join("")}
          </tbody>
        </table>
      `
          : report.unpaidList.length > 0
            ? `
        <h2>미납자 명단</h2>
        <ul>
          ${report.unpaidList.map((name) => `<li>${name}</li>`).join("")}
        </ul>
      `
            : ""
      }

      ${report.exemptList.length > 0 ? `
        <h2>면제자 명단</h2>
        <ul>
          ${report.exemptList.map((name) => `<li>${name}</li>`).join("")}
        </ul>
      ` : ""}

      ${report.annualPaidList.length > 0 ? `
        <h2>연회비 납부자 명단</h2>
        <ul>
          ${report.annualPaidList.map((name) => `<li>${name}</li>`).join("")}
        </ul>
      ` : ""}
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.print();
}

function feeForMemberInYm(member: FeeTeamMember, monthStr: string): number {
  const p = parseYmForAccounting(monthStr);
  if (!p) return 0;
  return calculateDueAmount(feeMemberToRulesMember(member), ACCOUNTING_PAGE_FEE_POLICY, p.y, p.m);
}

export default function TeamAccountingPage() {
  const { type, teamId } = useParams<{ type: string; teamId?: string }>();
  const navigate = useNavigate();
  const { myTeam, plan } = useTeam();
  const currentTeamId = teamId || myTeam?.id;
  const { members, loading: membersLoading } = useTeamMembers(currentTeamId ?? "");
  const { fees, loading: feesLoading } = useTeamFees(currentTeamId ?? "");
  const [selectedMonth, setSelectedMonth] = useState(() => teamFeeCurrentSeoulMonthKey());
  const [accountingMode, setAccountingMode] = useState<AccountingBasisMode>("cash");
  const [report, setReport] = useState<AccountingReport | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [csvLoading, setCsvLoading] = useState(false);

  const loading = membersLoading || feesLoading;
  
  // 🔥 Pro 확장 포인트: Free는 최근 1개월만, Pro는 전체 월 선택 가능
  const isPro = plan === "pro";
  /** Pro: 전년 1월(서울) ~ 당월, Free: 서울 당월만 */
  const availableMonths = useMemo(() => {
    const nowYm = seoulYmNow();
    if (!isPro) return [nowYm];
    const y = Number(nowYm.slice(0, 4));
    const startYm = `${y - 1}-01`;
    const months: string[] = [];
    let cursor = nowYm;
    let guard = 0;
    while (cursor >= startYm && guard < 40) {
      months.push(cursor);
      if (cursor === startYm) break;
      cursor = addMonthsYm(cursor, -1);
      guard += 1;
    }
    return months;
  }, [isPro]);

  // 🔥 리포트: 규칙 기반 요약 + 현금(paidAt) + 회차별(accrual·payments)
  useEffect(() => {
    if (!currentTeamId || membersLoading || feesLoading) return;
    if (members.length === 0) return;
    let cancelled = false;

    void (async () => {
      const rulesMembers = members.map(feeMemberToRulesMember);
      const generated = generateAccountingReport(rulesMembers, selectedMonth);

      let collectedCashWon = generated.collectedTotal;
      try {
        collectedCashWon = await sumPaidAmountsByPaidAtSeoulMonth(currentTeamId, selectedMonth);
      } catch (e) {
        console.error("[TeamAccountingPage] payments paidAt query failed", e);
      }

      const roster = filterMembersForFeeKpi(members);
      const feesInMonth = fees.filter((f) => feeMatchesSeoulYm(f, selectedMonth));

      let expectedTotal = generated.expectedTotal;
      let collectedAccrualWon = 0;
      let unpaidList = generated.unpaidList;
      let unpaidDetails = generated.unpaidDetails;
      let unpaidFromPayments = false;

      if (feesInMonth.length > 0) {
        try {
          const paymentsByFeeId = await fetchTeamPaymentsByFeeId(currentTeamId);
          if (!cancelled) {
            const acc = computeAccrualRollupForYm(roster, feesInMonth, paymentsByFeeId);
            expectedTotal = acc.expectedTotal;
            collectedAccrualWon = acc.collectedAccrualWon;
            unpaidDetails = acc.unpaidDetails;
            unpaidList = acc.unpaidDetails.map((d) => d.displayName);
            unpaidFromPayments = true;
          }
        } catch (e) {
          console.error("[TeamAccountingPage] accrual payments fetch failed", e);
        }
      }

      if (cancelled) return;

      setReport({
        ...generated,
        expectedTotal,
        unpaidList,
        unpaidDetails,
        unpaidCount: unpaidDetails.length,
        collectedCashWon,
        collectedAccrualWon,
        collectedTotal: collectedCashWon,
        unpaidFromPayments,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [members, membersLoading, fees, feesLoading, selectedMonth, currentTeamId]);

  const collectedDisplay = report
    ? accountingMode === "cash"
      ? report.collectedCashWon
      : report.collectedAccrualWon
    : 0;

  // 🔥 PDF 다운로드 (Functions 호출)
  const handleDownloadPDF = async () => {
    if (!currentTeamId || !report || pdfLoading) return; // 중복 클릭 방지
    
    setPdfLoading(true);
    try {
      // 🔥 region 명시 (asia-northeast3)
      const fn = getFunctions(app, "asia-northeast3");
      const generateReport = httpsCallable(fn, "generateMonthlyReportCallable");
      
      // 1. 리포트 생성 (idempotent)
      try {
        await generateReport({ teamId: currentTeamId, month: selectedMonth });
      } catch (error: any) {
        // 리포트가 이미 존재하면 무시 (idempotent)
        if (error.code !== "already-exists") {
          throw error;
        }
      }
      
      // 2. PDF 생성 및 다운로드 (Storage signed URL 방식)
      const generatePDF = httpsCallable(fn, "generateMonthlyReportPDFCallable");
      const result: any = await generatePDF({ teamId: currentTeamId, month: selectedMonth });
      
      if (result.data.success && result.data.downloadUrl) {
        // 🔥 Storage signed URL로 직접 다운로드
        const downloadUrl = result.data.downloadUrl;
        const filename = result.data.filename || `monthly_report_${selectedMonth}.pdf`;
        
        // 새 창에서 다운로드 또는 직접 다운로드
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = filename;
        a.target = "_blank"; // 새 탭에서 열기
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        // 다운로드 완료 메시지 (선택적)
        console.log("✅ PDF 다운로드 시작:", filename);
      } else {
        throw new Error("PDF 생성 결과가 없습니다.");
      }
    } catch (error: any) {
      // 🔥 개발 중: 에러 상세 표시 (프로덕션에서는 단순화)
      console.error("❌ PDF 다운로드 실패:", error);
      console.error("❌ 에러 전체 객체:", JSON.stringify(error, null, 2));
      console.error("❌ 에러 코드:", error.code);
      console.error("❌ 에러 메시지:", error.message);
      console.error("❌ 에러 상세:", error.details);
      console.error("❌ 에러 스택:", error.stack);
      
      const errorMessage = error.message || error.code || error.toString() || "알 수 없는 오류";
      const errorDetails = error.details || error.message || "";
      
      // 개발 환경에서는 상세 에러 표시
      if (import.meta.env.DEV) {
        alert(`리포트 생성 실패\n\n에러: ${errorMessage}\n${errorDetails ? `상세: ${errorDetails}` : ""}\n\n콘솔에서 자세한 로그를 확인하세요.`);
      } else {
        alert("리포트 생성에 실패했습니다.\n잠시 후 다시 시도해주세요.");
      }
    } finally {
      setPdfLoading(false);
    }
  };

  // 🔥 CSV 다운로드 (완납/미납/면제/연회비 구분)
  const handleDownloadCSV = () => {
    if (!report || csvLoading) return; // 중복 클릭 방지
    
    setCsvLoading(true);
    try {
      const csvRows: string[] = [];
      // 헤더
      csvRows.push("구분,이름,금액,상태");
      
      const unpaidMemberIds = new Set(report.unpaidDetails.map((u) => u.memberId));
      const unpaidNameFallback = new Set(report.unpaidList);
      const excludedNames = new Set([...report.exemptList, ...report.annualPaidList]);

      members.forEach((member) => {
        const uid = String(member.uid ?? "").trim();
        if (report.unpaidFromPayments) {
          if (uid && unpaidMemberIds.has(uid)) return;
        } else if (unpaidNameFallback.has(member.name)) {
          return;
        }
        if (excludedNames.has(member.name)) return;
        const fee = feeForMemberInYm(member, selectedMonth);
        if (fee > 0) {
          csvRows.push(`완납,${member.name},${fee},완납`);
        }
      });

      if (report.unpaidFromPayments && report.unpaidDetails.length > 0) {
        report.unpaidDetails.forEach((u) => {
          csvRows.push(`미납,${u.displayName},${u.amountWon},미납`);
        });
      } else {
        report.unpaidList.forEach((name) => {
          const member = members.find((m) => m.name === name);
          const fee = member ? feeForMemberInYm(member, selectedMonth) : 0;
          csvRows.push(`미납,${name},${fee},미납`);
        });
      }
      
      // 면제자
      report.exemptList.forEach((name) => {
        csvRows.push(`면제,${name},0,면제`);
      });
      
      // 연회비 납부자
      report.annualPaidList.forEach((name) => {
        csvRows.push(`연회비,${name},0,납부완료`);
      });
      
      // CSV 생성 (BOM 포함 - Excel 한글 깨짐 방지)
      const csv = csvRows.join("\n");
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `monthly_report_${selectedMonth}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      // 🔥 개발 중: 에러 상세 표시
      console.error("❌ CSV 다운로드 실패:", error);
      const errorMessage = error.message || error.toString() || "알 수 없는 오류";
      
      // 개발 환경에서는 상세 에러 표시
      if (import.meta.env.DEV) {
        alert(`CSV 다운로드 실패\n\n에러: ${errorMessage}\n\n콘솔에서 자세한 로그를 확인하세요.`);
      } else {
        alert("CSV 다운로드에 실패했습니다.\n잠시 후 다시 시도해주세요.");
      }
    } finally {
      setCsvLoading(false);
    }
  };

  // 🔥 PDF 1장 템플릿 고급화 (기존 함수 유지 - 프린트용)
  const handlePrintPDF = () => {
    if (!report) return;
    
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const [year, month] = selectedMonth.split("-").map(Number);
    const monthName = `${year}년 ${month}월`;
    
    const totalMembers = members.length;
    const exemptCount = report.exemptCount;
    const unpaidCount = report.unpaidCount;
    const cashLabel = report.collectedCashWon.toLocaleString();
    const accrualLabel = report.collectedAccrualWon.toLocaleString();
    const unpaidTotal =
      report.unpaidFromPayments && report.unpaidDetails.length > 0
        ? report.unpaidDetails.reduce((sum, u) => sum + u.amountWon, 0)
        : report.unpaidList.reduce((sum, name) => {
            const member = members.find((m) => m.name === name);
            return sum + (member ? feeForMemberInYm(member, selectedMonth) : 0);
          }, 0);

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${monthName} 회비 정산 보고서</title>
        <style>
          @media print {
            @page { size: A4; margin: 20mm; }
            body { margin: 0; padding: 0; }
          }
          body { 
            font-family: "Malgun Gothic", "맑은 고딕", Arial, sans-serif; 
            padding: 20px; 
            max-width: 210mm;
            margin: 0 auto;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 3px solid #1f2937;
            padding-bottom: 20px;
          }
          .header h1 {
            font-size: 24px;
            font-weight: bold;
            color: #1f2937;
            margin: 0;
          }
          .header p {
            font-size: 14px;
            color: #6b7280;
            margin: 5px 0;
          }
          .summary {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-bottom: 30px;
          }
          .summary-card {
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 15px;
          }
          .summary-card h3 {
            font-size: 12px;
            color: #6b7280;
            margin: 0 0 8px 0;
            font-weight: normal;
          }
          .summary-card .value {
            font-size: 20px;
            font-weight: bold;
            color: #1f2937;
          }
          .section {
            margin-bottom: 25px;
          }
          .section h2 {
            font-size: 16px;
            font-weight: bold;
            color: #1f2937;
            margin-bottom: 10px;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 5px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
            font-size: 12px;
          }
          th, td {
            border: 1px solid #d1d5db;
            padding: 8px;
            text-align: left;
          }
          th {
            background-color: #f3f4f6;
            font-weight: bold;
            color: #374151;
          }
          .signature {
            margin-top: 40px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
          }
          .signature-box {
            text-align: center;
          }
          .signature-box .label {
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 40px;
            color: #374151;
          }
          .signature-line {
            border-top: 1px solid #1f2937;
            padding-top: 5px;
            font-size: 12px;
            color: #6b7280;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${monthName} 회비 정산 보고서</h1>
          <p><strong>팀명:</strong> ${myTeam?.name || ""}</p>
          <p><strong>작성일:</strong> ${new Date().toLocaleDateString("ko-KR")}</p>
        </div>

        <div class="summary">
          <div class="summary-card">
            <h3>총 회원 수</h3>
            <div class="value">${totalMembers}명</div>
          </div>
          <div class="summary-card">
            <h3>면제자 수</h3>
            <div class="value">${exemptCount}명</div>
          </div>
          <div class="summary-card">
            <h3>수납·완납 (현금)</h3>
            <div class="value">${cashLabel}원</div>
          </div>
          <div class="summary-card">
            <h3>회차별 완납 합</h3>
            <div class="value">${accrualLabel}원</div>
          </div>
          <div class="summary-card">
            <h3>미납액</h3>
            <div class="value" style="color: ${unpaidTotal > 0 ? '#dc2626' : '#059669'}">${unpaidTotal.toLocaleString()}원</div>
          </div>
        </div>

        <div class="section">
          <h2>미납자 명단</h2>
          ${
            report.unpaidDetails.length > 0
              ? `
            <table>
              <thead>
                <tr>
                  <th>이름</th>
                  <th>미납액(회차 행)</th>
                </tr>
              </thead>
              <tbody>
                ${report.unpaidDetails
                  .map(
                    (u) => `
                    <tr>
                      <td>${u.displayName}</td>
                      <td>${u.amountWon.toLocaleString()}원</td>
                    </tr>
                  `
                  )
                  .join("")}
              </tbody>
            </table>
          `
              : report.unpaidList.length > 0
                ? `
            <table>
              <thead>
                <tr>
                  <th>이름</th>
                  <th>미납액(정책)</th>
                </tr>
              </thead>
              <tbody>
                ${report.unpaidList
                  .map((name) => {
                    const member = members.find((m) => m.name === name);
                    const fee = member ? feeForMemberInYm(member, selectedMonth) : 0;
                    return `
                    <tr>
                      <td>${name}</td>
                      <td>${fee.toLocaleString()}원</td>
                    </tr>
                  `;
                  })
                  .join("")}
              </tbody>
            </table>
          `
                : "<p style='color: #6b7280;'>미납자가 없습니다.</p>"
          }
        </div>

        <div class="section">
          <h2>면제자 명단</h2>
          ${report.exemptList.length > 0 ? `
            <table>
              <thead>
                <tr>
                  <th>이름</th>
                  <th>면제 사유</th>
                </tr>
              </thead>
              <tbody>
                ${report.exemptList.map((name) => {
                  const member = members.find(m => m.name === name);
                  const resolved = member ? resolveFeePlan(member) : { feePlan: "exempt" as const, exemptReason: "role" as const };
                  return `
                    <tr>
                      <td>${name}</td>
                      <td>${resolved.exemptReason === "role" ? "역할 면제" : "특별 면제"}</td>
                    </tr>
                  `;
                }).join("")}
              </tbody>
            </table>
          ` : "<p style='color: #6b7280;'>면제자가 없습니다.</p>"}
        </div>

        <div class="signature">
          <div class="signature-box">
            <div class="label">회장</div>
            <div class="signature-line">(서명)</div>
          </div>
          <div class="signature-box">
            <div class="label">총무</div>
            <div class="signature-line">(서명)</div>
          </div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">리포트를 생성할 수 없습니다.</p>
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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">회비 정산 리포트</h1>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-600">
                <span className="font-medium text-gray-700">실제 수납 표시 기준</span>
                <button
                  type="button"
                  onClick={() => setAccountingMode("cash")}
                  className={`rounded-full px-3 py-1 ${
                    accountingMode === "cash"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  현금 입금 (paidAt)
                </button>
                <button
                  type="button"
                  onClick={() => setAccountingMode("accrual")}
                  className={`rounded-full px-3 py-1 ${
                    accountingMode === "accrual"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  회차 완납 (청구·payments)
                </button>
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg"
                disabled={!isPro && availableMonths.length === 1}
              >
                {availableMonths.map((month) => (
                  <option key={month} value={month}>
                    {month}
                  </option>
                ))}
              </select>
              {!isPro && (
                <span className="px-2 py-2 text-xs text-gray-500 flex items-center">
                  Pro로 업그레이드하면 과거 리포트도 조회 가능
                </span>
              )}
              <button
                onClick={() => {
                  if (!isPro) {
                    alert("📊 월간 리포트는 Pro 플랜에서만 이용 가능합니다.\n\nPro 플랜으로 업그레이드하면:\n• PDF/CSV 리포트 다운로드\n• 과거 리포트 조회\n• 자동 리포트 생성\n• 알림 연동\n\n을 이용하실 수 있습니다.");
                    return;
                  }
                  handleDownloadPDF();
                }}
                disabled={pdfLoading || !isPro}
                className={`px-4 py-2 text-white rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${
                  isPro
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "bg-gray-400 cursor-not-allowed"
                }`}
              >
                {pdfLoading ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    <span>생성 중...</span>
                  </>
                ) : (
                  <>
                    <span>📄</span>
                    <span>PDF 다운로드</span>
                    {!isPro && <span className="ml-1 text-xs">(Pro)</span>}
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  if (!isPro) {
                    alert("📊 월간 리포트는 Pro 플랜에서만 이용 가능합니다.\n\nPro 플랜으로 업그레이드하면:\n• PDF/CSV 리포트 다운로드\n• 과거 리포트 조회\n• 자동 리포트 생성\n• 알림 연동\n\n을 이용하실 수 있습니다.");
                    return;
                  }
                  handleDownloadCSV();
                }}
                disabled={csvLoading || !report || !isPro}
                className={`px-4 py-2 text-white rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${
                  isPro
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-gray-400 cursor-not-allowed"
                }`}
              >
                {csvLoading ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    <span>생성 중...</span>
                  </>
                ) : (
                  <>
                    <span>📊</span>
                    <span>CSV 다운로드</span>
                    {!isPro && <span className="ml-1 text-xs">(Pro)</span>}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* 요약 카드 */}
        <div 
          onClick={() => {
            if (currentTeamId) {
              navigate(`/team/${currentTeamId}/fee-detail?month=${selectedMonth}`);
            }
          }}
          className="bg-white rounded-lg shadow-md p-6 mb-6 cursor-pointer hover:shadow-lg transition-all border-2 border-transparent hover:border-blue-200"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-700">이번 달 회비</h2>
            <div className="flex items-center gap-2 text-blue-600 text-sm">
              <span>이번 달 상세 보기</span>
              <span>▶</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 mb-4">회원별 납부 현황 보기</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">예상 회비 총액</p>
              <p className="text-xl font-bold text-gray-900">
                {report.expectedTotal.toLocaleString()}원
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">
                실제 수납액
                {accountingMode === "cash" ? " (현금)" : " (회차 완납)"}
              </p>
              <p className="text-xl font-bold text-green-600">{collectedDisplay.toLocaleString()}원</p>
              <p className="mt-1 text-[11px] text-gray-400">
                현금 {report.collectedCashWon.toLocaleString()}원 · 회차 완납{" "}
                {report.collectedAccrualWon.toLocaleString()}원
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">미납자</p>
              <p className="text-xl font-bold text-red-600">
                {report.unpaidCount}명
              </p>
              {report.unpaidFromPayments && (
                <p className="mt-1 text-[11px] text-gray-400">회차·payments 기준</p>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">면제자</p>
              <p className="text-xl font-bold text-gray-600">
                {report.exemptCount}명
              </p>
            </div>
          </div>
          
          {/* 이번 달 상세 보기 버튼 */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (currentTeamId) {
                  navigate(`/team/${currentTeamId}/fee-detail?month=${selectedMonth}`);
                }
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <span>이번 달 상세 보기</span>
              <span>▶</span>
            </button>
          </div>
        </div>

        {/* 미납자 명단 */}
        {(report.unpaidDetails.length > 0 || report.unpaidList.length > 0) && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">미납자 명단</h2>
            <div className="space-y-2">
              {report.unpaidDetails.length > 0
                ? report.unpaidDetails.map((u) => (
                    <div
                      key={u.memberId}
                      className="flex items-center justify-between gap-3 p-3 border border-red-200 bg-red-50 rounded-lg"
                    >
                      <span className="font-medium text-red-900">{u.displayName}</span>
                      <span className="text-sm font-semibold text-red-800 tabular-nums">
                        {u.amountWon.toLocaleString()}원
                      </span>
                    </div>
                  ))
                : report.unpaidList.map((name, index) => {
                    const member = members.find((m) => m.name === name);
                    const amt = member ? feeForMemberInYm(member, selectedMonth) : 0;
                    return (
                      <div
                        key={`${name}-${index}`}
                        className="flex items-center justify-between gap-3 p-3 border border-red-200 bg-red-50 rounded-lg"
                      >
                        <span className="font-medium text-red-900">{name}</span>
                        <span className="text-sm font-semibold text-red-800 tabular-nums">
                          {amt.toLocaleString()}원
                        </span>
                      </div>
                    );
                  })}
            </div>
          </div>
        )}

        {/* 면제자 명단 */}
        {report.exemptList.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">면제자 명단</h2>
            <div className="space-y-2">
              {report.exemptList.map((name, index) => (
                <div
                  key={index}
                  className="flex items-center p-3 border border-gray-200 rounded-lg"
                >
                  <span className="font-medium text-gray-900">{name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 연회비 납부자 명단 */}
        {report.annualPaidList.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">연회비 납부자 명단</h2>
            <div className="space-y-2">
              {report.annualPaidList.map((name, index) => (
                <div
                  key={index}
                  className="flex items-center p-3 border border-yellow-200 bg-yellow-50 rounded-lg"
                >
                  <span className="font-medium text-yellow-900">{name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

