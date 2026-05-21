// src/hooks/useOpsActions.ts
// 🔥 홈 블록2: 운영 액션 카드용 데이터 훅 (정본 구조 - 무한 루프 완전 차단)

import { useEffect, useState, useRef } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useNavigate } from "react-router-dom";

export type OpsActionId = "TODO" | "UNPAID" | "NEXT_GAME" | "ATTENDANCE";

export type OpsActionSeverity = "critical" | "warning" | "info";

export interface OpsAction {
  id: OpsActionId;
  title: string;
  subtitle?: string;
  severity: OpsActionSeverity;
  ctaLabel: string;
  onClick: () => void;
}

interface OpsCard {
  id: string;
  title: string;
  message: string;
  severity: "info" | "warn" | "urgent";
  actionPath: string;
  count?: number;
  icon?: string;
}

interface OpsSummary {
  unpaidCount?: number;
  unpaidAmountTotal?: number;
  nextEventAt?: any;
  nextEventTitle?: string | null;
  attendanceOpenEventId?: string | null;
  attendancePendingCount?: number;
  cards?: OpsCard[];
  latestAiReportId?: string | null;
}

export function useOpsActions(teamId?: string, sportType?: string) {
  // ✅ 규칙 1: 모든 Hooks는 최상단, 항상 같은 순서로 호출
  const [actions, setActions] = useState<OpsAction[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const cancelledRef = useRef(false);
  const permissionDeniedRef = useRef(false); // ✅ permission-denied 재시도 완전 차단

  useEffect(() => {
    // ✅ teamId 없으면 즉시 종료 (Firestore 접근 안 함)
    if (!teamId) {
      setActions([]);
      setLoading(false);
      setError(null);
      permissionDeniedRef.current = false;
      return;
    }

    // ✅ permission-denied가 이미 발생했으면 재시도 완전 차단
    if (permissionDeniedRef.current) {
      setLoading(false);
      setError("NO_PERMISSION");
      return;
    }

    cancelledRef.current = false;
    setLoading(true);
    setError(null);

    const fetchSummary = async () => {
      try {
        const ref = doc(db, `teams/${teamId}/ops/summary`);
        const snap = await getDoc(ref);

        if (cancelledRef.current) return;

        if (!snap.exists()) {
          setActions([]);
          setError(null);
          setLoading(false);
          return;
        }

        const s = snap.data() as OpsSummary;
        const list: OpsAction[] = [];

        // 🔥 cards 배열이 있으면 우선 사용 (서버에서 생성된 카드)
        if (s.cards && s.cards.length > 0) {
          for (const card of s.cards) {
            // actionPath를 sportType 기반으로 조정
            let finalPath = card.actionPath;
            if (card.id === "unpaid" && sportType) {
              finalPath = `/sports/${sportType}/team/ledger`;
            } else if (card.id === "attendance" && sportType && s.attendanceOpenEventId) {
              finalPath = `/sports/${sportType}/team/attendance?event=${s.attendanceOpenEventId}`;
            } else if (card.id === "schedule" && sportType) {
              finalPath = `/sports/${sportType}/team/attendance`;
            } else if (card.id === "ai-report" && s.latestAiReportId) {
              // AI 리포트는 전용 페이지로 이동 (공유/북마크 가능)
              finalPath = `/ai-reports/${s.latestAiReportId}`;
            }

            // severity 매핑: urgent -> critical, warn -> warning, info -> info
            const severityMap: Record<string, OpsActionSeverity> = {
              urgent: "critical",
              warn: "warning",
              info: "info",
            };

            list.push({
              id: card.id.toUpperCase().replace("-", "_") as OpsActionId,
              title: card.title,
              subtitle: card.message,
              severity: severityMap[card.severity] || "info",
              ctaLabel: card.id === "ai-report" ? "리포트 보기" : card.id === "unpaid" ? "미납 처리" : card.id === "attendance" ? "출석 체크" : card.id === "schedule" ? "일정 보기" : "확인",
              onClick: () => {
                // 모든 카드는 finalPath로 이동 (AI 리포트는 이미 전용 페이지로 설정됨)
                navigate(finalPath);
              },
            });
          }
        } else {
          // 🔄 레거시: cards가 없으면 기존 로직 사용
          // 1️⃣ 미납 (최우선)
          if ((s.unpaidCount ?? 0) > 0) {
            list.push({
              id: "UNPAID",
              title: `미납 ${s.unpaidCount}명`,
              subtitle:
                s.unpaidAmountTotal != null
                  ? `총 ${s.unpaidAmountTotal.toLocaleString()}원`
                  : undefined,
              severity: "critical",
              ctaLabel: "미납 처리",
              onClick: () => {
                if (sportType) {
                  navigate(`/sports/${sportType}/team/ledger`);
                } else {
                  navigate("/sports-hub");
                }
              },
            });
          }

          // 2️⃣ 출석
          if (s.attendanceOpenEventId) {
            list.push({
              id: "ATTENDANCE",
              title: "출석 체크 진행 중",
              subtitle: `미응답 ${s.attendancePendingCount ?? 0}명`,
              severity: "warning",
              ctaLabel: "출석 체크",
              onClick: () => {
                if (sportType) {
                  navigate(
                    `/sports/${sportType}/team/attendance?event=${s.attendanceOpenEventId}`
                  );
                } else {
                  navigate("/sports-hub");
                }
              },
            });
          }

          // 3️⃣ 다음 일정
          if (s.nextEventAt) {
            let dateText = "";
            try {
              if (typeof s.nextEventAt.toDate === "function") {
                dateText = s.nextEventAt.toDate().toLocaleString("ko-KR");
              } else if (typeof s.nextEventAt === "string") {
                dateText = s.nextEventAt;
              }
            } catch {
              dateText = "";
            }

            list.push({
              id: "NEXT_GAME",
              title: s.nextEventTitle || "다가오는 일정",
              subtitle: dateText,
              severity: "info",
              ctaLabel: "일정 보기",
              onClick: () => {
                if (sportType) {
                  navigate(`/sports/${sportType}/team/attendance`);
                } else {
                  navigate("/schedule");
                }
              },
            });
          }
        }

        // 🎯 할 일 1개 자동 선정 (severity 우선) - cards가 있을 때는 제외
        if (list.length > 0 && !s.cards) {
          const pick =
            list.find((a) => a.severity === "critical") ||
            list.find((a) => a.severity === "warning") ||
            list[0];

          list.unshift({
            ...pick,
            id: "TODO",
            title: `할 일 1개 · ${pick.title}`,
          });
        }

        if (!cancelledRef.current) {
          setActions(list);
          setError(null);
          setLoading(false);
        }
      } catch (error: any) {
        if (cancelledRef.current) return;
        
        // ✅ permission-denied는 "정상 상태"로 처리 (재시도 완전 차단)
        if (error?.code === "permission-denied") {
          console.log("[useOpsActions] 권한 없음 - 정상 상태 (재시도 차단)");
          permissionDeniedRef.current = true; // ❗ 재시도 완전 차단 플래그
          setActions([]);
          setError("NO_PERMISSION");
          setLoading(false);
          return; // ❗ 재시도 금지
        }
        
        console.error("[useOpsActions] ops/summary 조회 실패:", error);
        setActions([]);
        setError("로드 실패");
        setLoading(false);
      }
    };

    fetchSummary();

    // ✅ cleanup 보장
    return () => {
      cancelledRef.current = true;
    };
  }, [teamId, sportType, navigate]);

  return { actions, loading, error };
}
