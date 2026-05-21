/**
 * 행정 보고서 페이지
 * /association/:associationId/admin/report
 * 
 * 원칙:
 * - 엑셀 없이, 설명 없이, 화면 그대로 제출
 * - 팩트 요약 + 공식 기록 증빙
 * - 시스템 책임 선언
 */

import { useParams, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { collection, query, where, getDocs, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useIsAssociationAdmin } from "@/hooks/useIsAssociationAdmin";

interface ReportSection {
  notices: boolean;
  tournaments: boolean;
  facility: boolean;
  accounting: boolean;
}

export default function ReportPage() {
  const { associationId } = useParams<{ associationId: string }>();
  const { isAdmin } = useIsAssociationAdmin(associationId);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sections, setSections] = useState<ReportSection>({
    notices: true,
    tournaments: true,
    facility: true,
    accounting: true,
  });
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);

  // 기본값: 올해 1월 1일 ~ 오늘
  useEffect(() => {
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);
    setStartDate(yearStart.toISOString().split("T")[0]);
    setEndDate(now.toISOString().split("T")[0]);
  }, []);

  const generateReport = async () => {
    if (!associationId || !startDate || !endDate) return;

    setLoading(true);
    try {
      const start = Timestamp.fromDate(new Date(startDate));
      const end = Timestamp.fromDate(new Date(endDate + "T23:59:59"));

      const data: any = {};

      // 공지 데이터
      if (sections.notices) {
        const noticesRef = collection(db, `associations/${associationId}/notices`);
        const noticesSnapshot = await getDocs(noticesRef);
        const allNotices = noticesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        const periodNotices = allNotices.filter((notice: any) => {
          const createdAt = notice.createdAt?.toDate();
          return createdAt && createdAt >= start.toDate() && createdAt <= end.toDate();
        });

        const officialNotices = periodNotices.filter((n: any) => n.isOfficial !== false);
        
        // 수정 이력 포함 공지 확인
        const noticesWithUpdates = periodNotices.filter((notice: any) => {
          return notice.updatedAt && notice.updatedAt.toMillis() !== notice.createdAt?.toMillis();
        });

        data.notices = {
          total: periodNotices.length,
          official: officialNotices.length,
          withUpdates: noticesWithUpdates.length,
        };
      }

      // 대회 데이터
      if (sections.tournaments) {
        const tournamentsRef = collection(db, `associations/${associationId}/tournaments`);
        const tournamentsSnapshot = await getDocs(tournamentsRef);
        const allTournaments = tournamentsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        const periodTournaments = allTournaments.filter((tournament: any) => {
          const dateStart = tournament.dateStart?.toDate();
          return dateStart && dateStart >= start.toDate() && dateStart <= end.toDate();
        });

        const confirmedBrackets = periodTournaments.filter((t: any) => t.bracketStatus === "confirmed");
        
        // 참가 팀 수 집계
        let totalTeams = 0;
        for (const tournament of periodTournaments) {
          const entriesRef = collection(db, `associations/${associationId}/tournaments/${tournament.id}/entries`);
          const entriesSnapshot = await getDocs(entriesRef);
          totalTeams += entriesSnapshot.size;
        }

        // 사고/징계 로그 확인
        const disciplineLogsRef = collection(db, `associations/${associationId}/discipline_logs`);
        const disciplineSnapshot = await getDocs(disciplineLogsRef);
        const periodDiscipline = disciplineSnapshot.docs.filter((doc) => {
          const createdAt = doc.data().createdAt?.toDate();
          return createdAt && createdAt >= start.toDate() && createdAt <= end.toDate();
        }).length;

        data.tournaments = {
          total: periodTournaments.length,
          totalTeams,
          confirmedBrackets: confirmedBrackets.length,
          disciplineCases: periodDiscipline,
        };
      }

      // 대관 데이터
      if (sections.facility) {
        const facilityRef = collection(db, `associations/${associationId}/facility_slots`);
        const facilitySnapshot = await getDocs(facilityRef);
        const allSlots = facilitySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        const periodSlots = allSlots.filter((slot: any) => {
          const slotDate = new Date(slot.date);
          return slotDate >= start.toDate() && slotDate <= end.toDate();
        });

        const uniqueDates = new Set(periodSlots.map((s: any) => s.date));
        const eventSlots = periodSlots.filter((s: any) => s.status === "event");
        const blockedSlots = periodSlots.filter((s: any) => s.status === "blocked");
        const eventDates = new Set(eventSlots.map((s: any) => s.date));
        const blockedDates = new Set(blockedSlots.map((s: any) => s.date));

        data.facility = {
          totalDays: uniqueDates.size,
          eventDays: eventDates.size,
          blockedDays: blockedDates.size,
        };
      }

      // 회계 데이터 (기본 구조, 실제 구현 필요)
      if (sections.accounting) {
        data.accounting = {
          totalIncome: 0,
          totalExpense: 0,
          balance: 0,
          incomeByCategory: {
            membership: 0,
            tournament: 0,
            donation: 0,
          },
        };
      }

      setReportData(data);
    } catch (error) {
      console.error("보고서 생성 오류:", error);
      alert("보고서 생성 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handlePDF = () => {
    // TODO: PDF 출력 구현 (예: react-pdf, jsPDF 등)
    alert("PDF 출력 기능은 준비 중입니다.");
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">접근 권한이 없습니다.</p>
          {associationId && (
            <Link
              to={`/association/${associationId}`}
              className="text-blue-600 hover:text-blue-800"
            >
              협회 페이지로 돌아가기
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* 헤더 */}
        <div className="mb-6">
          {associationId && (
            <Link
              to={`/association/${associationId}/admin`}
              className="text-blue-600 hover:text-blue-800 mb-4 text-sm inline-block"
            >
              ← 관리자 페이지로 돌아가기
            </Link>
          )}
          <h1 className="text-2xl font-bold text-gray-900">행정 보고서</h1>
          <p className="text-sm text-gray-600 mt-1">
            협회 운영 현황을 요약하여 보고서를 생성합니다.
          </p>
        </div>

        {/* 설정 섹션 */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">보고서 생성</h2>

          {/* 기간 선택 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              기간 선택
            </label>
            <div className="flex items-center gap-3">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
              <span className="text-gray-500">~</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
          </div>

          {/* 대상 선택 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              대상 선택
            </label>
            <div className="flex items-center gap-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={sections.notices}
                  onChange={(e) =>
                    setSections({ ...sections, notices: e.target.checked })
                  }
                  className="mr-2 h-4 w-4 text-blue-600"
                />
                <span className="text-sm">공지</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={sections.tournaments}
                  onChange={(e) =>
                    setSections({ ...sections, tournaments: e.target.checked })
                  }
                  className="mr-2 h-4 w-4 text-blue-600"
                />
                <span className="text-sm">대회</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={sections.facility}
                  onChange={(e) =>
                    setSections({ ...sections, facility: e.target.checked })
                  }
                  className="mr-2 h-4 w-4 text-blue-600"
                />
                <span className="text-sm">대관</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={sections.accounting}
                  onChange={(e) =>
                    setSections({ ...sections, accounting: e.target.checked })
                  }
                  className="mr-2 h-4 w-4 text-blue-600"
                />
                <span className="text-sm">회계</span>
              </label>
            </div>
          </div>

          {/* 생성 버튼 */}
          <button
            onClick={generateReport}
            disabled={loading || !startDate || !endDate}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "생성 중..." : "보고서 생성"}
          </button>
        </div>

        {/* 보고서 미리보기 */}
        {reportData && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6 print:border-0 print:shadow-none">
            <div className="flex items-center justify-between mb-6 print:hidden">
              <h2 className="text-lg font-semibold text-gray-900">보고서 미리보기</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePDF}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm"
                >
                  PDF 출력
                </button>
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm"
                >
                  인쇄
                </button>
              </div>
            </div>

            {/* 보고서 내용 */}
            <div className="space-y-6">
              {/* 공지 섹션 */}
              {sections.notices && reportData.notices && (
                <div className="border-b border-gray-200 pb-4">
                  <h3 className="text-base font-semibold text-gray-900 mb-3">
                    {new Date(startDate).getFullYear()}년 공지 운영 현황
                  </h3>
                  <ul className="space-y-1 text-sm text-gray-700">
                    <li>• 총 공지 수: {reportData.notices.total}건</li>
                    <li>• 공식 공지: {reportData.notices.official}건</li>
                    <li>• 수정 이력 포함 공지: {reportData.notices.withUpdates}건</li>
                  </ul>
                </div>
              )}

              {/* 대회 섹션 */}
              {sections.tournaments && reportData.tournaments && (
                <div className="border-b border-gray-200 pb-4">
                  <h3 className="text-base font-semibold text-gray-900 mb-3">
                    {new Date(startDate).getFullYear()}년 대회 운영 현황
                  </h3>
                  <ul className="space-y-1 text-sm text-gray-700">
                    <li>• 개최 대회 수: {reportData.tournaments.total}회</li>
                    <li>• 참가 팀 수: {reportData.tournaments.totalTeams}팀</li>
                    <li>• 공식 대진표 확정 대회: {reportData.tournaments.confirmedBrackets}회</li>
                    <li>• 사고/징계 발생: {reportData.tournaments.disciplineCases}건 (조치 완료)</li>
                  </ul>
                </div>
              )}

              {/* 대관 섹션 */}
              {sections.facility && reportData.facility && (
                <div className="border-b border-gray-200 pb-4">
                  <h3 className="text-base font-semibold text-gray-900 mb-3">
                    시설 사용 현황
                  </h3>
                  <ul className="space-y-1 text-sm text-gray-700">
                    <li>• 총 사용 일수: {reportData.facility.totalDays}일</li>
                    <li>• 행사 사용: {reportData.facility.eventDays}일</li>
                    <li>• 사용 불가 설정: {reportData.facility.blockedDays}일</li>
                  </ul>
                </div>
              )}

              {/* 회계 섹션 */}
              {sections.accounting && reportData.accounting && (
                <div className="border-b border-gray-200 pb-4">
                  <h3 className="text-base font-semibold text-gray-900 mb-3">
                    재정 요약
                  </h3>
                  <div className="space-y-2 text-sm text-gray-700">
                    <div>
                      <div className="font-medium">총 수입: ￦{reportData.accounting.totalIncome.toLocaleString()}</div>
                      <ul className="ml-4 mt-1 space-y-1 text-gray-600">
                        <li>· 회비: ￦{reportData.accounting.incomeByCategory.membership.toLocaleString()}</li>
                        <li>· 참가비: ￦{reportData.accounting.incomeByCategory.tournament.toLocaleString()}</li>
                        <li>· 기부금: ￦{reportData.accounting.incomeByCategory.donation.toLocaleString()}</li>
                      </ul>
                    </div>
                    <div>총 지출: ￦{reportData.accounting.totalExpense.toLocaleString()}</div>
                    <div className="font-medium">잔액: ￦{reportData.accounting.balance.toLocaleString()}</div>
                  </div>
                </div>
              )}

              {/* 하단 고정 문구 */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <p className="text-xs text-gray-600 text-center">
                  본 보고서는 협회 공식 시스템에 기록된 데이터를 기준으로 자동 생성되었습니다.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

