/**
 * 참가 신청 관리 페이지 (Admin 전용)
 * /association/:associationId/admin/applications
 * 
 * 역할:
 * - 참가 신청 목록 조회
 * - 승인/반려 처리
 * - 승인 시 자동으로 팀 생성 + 팀장 초대 링크 생성
 * 
 * 플로우:
 * 승인 버튼 클릭 → 팀 생성 → 팀장 초대 링크 생성 → 초대 링크 복사
 */

import { useParams, useNavigate, Link } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { collection, query, orderBy, onSnapshot, doc, getDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useIsAssociationAdmin } from "@/hooks/useIsAssociationAdmin";
import { getFunctions, httpsCallable } from "firebase/functions";
import { toast } from "sonner";

type Application = {
  id: string;
  noticeId: string;
  teamName: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  memo?: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: Timestamp;
  approvedAt?: Timestamp;
};

export default function ApplicationsManagementPage() {
  const { associationId } = useParams<{ associationId: string }>();
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useIsAssociationAdmin(associationId);

  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [qText, setQText] = useState("");

  // 권한 체크
  useEffect(() => {
    if (adminLoading) return;
    if (!isAdmin) {
      navigate(`/association/${associationId}/tournaments`);
    }
  }, [isAdmin, adminLoading, navigate, associationId]);

  // 신청 목록 실시간 구독
  useEffect(() => {
    if (!associationId) {
      setLoading(false);
      return;
    }

    const applicationsRef = collection(db, "associations", associationId, "Applications");
    const q = query(applicationsRef, orderBy("createdAt", "desc"));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as Application[];
        setApplications(data);
        setLoading(false);
      },
      (error) => {
        console.error("[참가 신청 목록 조회 오류]", error);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [associationId]);

  // 검색 필터
  const filtered = useMemo(() => {
    const t = qText.trim().toLowerCase();
    if (!t) return applications;
    return applications.filter((app) => 
      app.teamName.toLowerCase().includes(t) ||
      app.contactName.toLowerCase().includes(t) ||
      app.contactPhone.includes(t) ||
      app.contactEmail.toLowerCase().includes(t)
    );
  }, [applications, qText]);

  // 승인 처리 (Cloud Function 사용)
  const handleApprove = async (application: Application) => {
    // ⭐⭐⭐ 핵심: 중복 클릭 방지 (동시성 충돌 방지)
    if (processing === application.id) {
      console.warn("[승인] 이미 처리 중입니다. 중복 요청 무시", { applicationId: application.id });
      return;
    }

    if (!associationId || !window.confirm(`정말 ${application.teamName}의 참가 신청을 승인하시겠습니까?\n\n승인 시 자동으로 팀이 생성되고 팀장 초대 링크가 발송됩니다.`)) {
      return;
    }

    setProcessing(application.id);
    const loadingToastId = toast.loading("승인 처리 중입니다...");

    try {
      // 🔥 Cloud Function 호출 (프론트에서 Firestore 직접 업데이트 금지)
      // ⭐⭐⭐ 중요: region 명시 필수 (Callable 함수는 region이 다르면 호출 실패)
      const functions = getFunctions(undefined, "asia-northeast3");
      const approveFn = httpsCallable(functions, "approveApplicationCallable");

      // tournamentId는 application에서 가져와야 하는데, 이 페이지는 Applications 컬렉션을 사용하는 것 같음
      // 레거시 구조이므로 tournamentId를 null로 전달하거나, application에 tournamentId가 있는지 확인 필요
      const result = await approveFn({
        associationId,
        tournamentId: (application as any).tournamentId || null, // 레거시 구조 대응
        applicationId: application.id,
      });

      const resultData = result.data as any;
      const inviteLink = resultData?.inviteLink;
      
      if (inviteLink) {
        // 초대 링크 클립보드 복사
        await navigator.clipboard.writeText(inviteLink);
        toast.success(`✅ 승인 완료!\n\n팀장 초대 링크가 클립보드에 복사되었습니다.\n\n${inviteLink}`, {
          id: loadingToastId,
          duration: 10000,
        });
      } else {
        toast.success("✅ 참가 신청이 승인되었습니다. 팀장에게 알림이 발송되었습니다.", {
          id: loadingToastId,
        });
      }
      
      // ⭐⭐⭐ 핵심: 승인 성공 시 즉시 UI 반영 (강제 재조회)
      // 🔥 onSnapshot이 안 도는 경우를 대비해 getDoc()으로 직접 재조회
      try {
        // 레거시 구조: Applications 컬렉션 사용
        const appRef = doc(
          db,
          "associations",
          associationId!,
          "Applications",
          application.id
        );
        
        const latestSnap = await getDoc(appRef);
        if (latestSnap.exists()) {
          const latestData = latestSnap.data();
          console.log("[승인 후 재조회] 최신 상태:", {
            status: latestData?.status,
            approvedAt: latestData?.approvedAt,
          });
        }
      } catch (recheckError: any) {
        // 재조회 실패해도 승인은 성공했으므로 경고만
        console.warn("[승인 후 재조회] 실패 (승인은 성공):", recheckError);
      }
    } catch (error: any) {
      console.error("[참가 신청 승인 오류]", error);
      
      const errorCode = error?.code;
      const errorMessage = error?.message || error?.details?.message;
      
      // ⭐⭐⭐ 핵심: aborted / failed-precondition은 "이미 처리됨"으로 처리 (정상 상태)
      if (errorCode === "functions/aborted" || errorCode === "aborted") {
        toast.info("이미 처리 중이거나 완료된 신청입니다. 목록을 새로고침해주세요.", {
          id: loadingToastId,
          duration: 4000,
        });
        // 목록 새로고침은 부모 컴포넌트에서 처리
        setProcessing(null);
        return;
      }
      
      if (errorCode === "failed-precondition") {
        const isAlreadyProcessed = errorMessage?.includes("이미") || 
                                   errorMessage?.includes("already") ||
                                   errorMessage?.includes("대진표");
        
        if (isAlreadyProcessed) {
          toast.info(errorMessage || "이미 처리된 상태입니다. 목록을 새로고침해주세요.", {
            id: loadingToastId,
            duration: 4000,
          });
          setProcessing(null);
          return;
        }
      }
      
      // 그 외의 에러는 기존대로 처리
      const displayMessage = errorMessage || "알 수 없는 오류";
      toast.error(`승인 처리에 실패했습니다: ${displayMessage}`, {
        id: loadingToastId,
        duration: 5000,
      });
    } finally {
      setProcessing(null);
    }
  };

  // 반려 처리 (Cloud Function 사용)
  const handleReject = async (application: Application) => {
    // ⭐⭐⭐ 핵심: 중복 클릭 방지 (동시성 충돌 방지)
    if (processing === application.id) {
      console.warn("[반려] 이미 처리 중입니다. 중복 요청 무시", { applicationId: application.id });
      return;
    }

    if (!associationId) return;

    const reason = window.prompt(`반려 사유를 입력하세요 (선택):`, "");
    if (reason === null) return; // 취소

    setProcessing(application.id);
    const loadingToastId = toast.loading("반려 처리 중입니다...");

    try {
      // 🔥 Cloud Function 호출 (프론트에서 Firestore 직접 업데이트 금지)
      // ⭐⭐⭐ 중요: region 명시 필수 (Callable 함수는 region이 다르면 호출 실패)
      const functions = getFunctions(undefined, "asia-northeast3");
      const updateFn = httpsCallable(functions, "updateApplicationStatusCallable");

      // 레거시 구조: Applications 컬렉션은 tournamentId가 없을 수 있음
      // tournamentId를 null로 전달하거나, application에 tournamentId가 있는지 확인 필요
      await updateFn({
        associationId,
        tournamentId: (application as any).tournamentId || null, // 레거시 구조 대응
        applicationId: application.id,
        status: "REJECTED",
        reason: reason?.trim() || undefined,
      });

      toast.success("반려 처리되었습니다.", {
        id: loadingToastId,
      });
    } catch (error: any) {
      console.error("[참가 신청 반려 오류]", error);
      
      const errorCode = error?.code;
      const errorMessage = error?.message || error?.details?.message;
      
      // ⭐⭐⭐ 핵심: aborted / failed-precondition은 "이미 처리됨"으로 처리 (정상 상태)
      if (errorCode === "functions/aborted" || errorCode === "aborted") {
        toast.info("이미 처리 중이거나 완료된 신청입니다. 목록을 새로고침해주세요.", {
          id: loadingToastId,
          duration: 4000,
        });
        setProcessing(null);
        return;
      }
      
      if (errorCode === "failed-precondition") {
        const isAlreadyProcessed = errorMessage?.includes("이미") || 
                                   errorMessage?.includes("already");
        
        if (isAlreadyProcessed) {
          toast.info(errorMessage || "이미 처리된 상태입니다. 목록을 새로고침해주세요.", {
            id: loadingToastId,
            duration: 4000,
          });
          setProcessing(null);
          return;
        }
      }
      
      // 그 외의 에러는 기존대로 처리
      const displayMessage = errorMessage || "알 수 없는 오류";
      toast.error(`반려 처리에 실패했습니다: ${displayMessage}`, {
        id: loadingToastId,
        duration: 5000,
      });
    } finally {
      setProcessing(null);
    }
  };

  if (adminLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">불러오는 중...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return null; // navigate로 리다이렉트됨
  }

  const pendingCount = applications.filter((app) => app.status === "PENDING").length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="space-y-4">
          {/* 헤더 */}
          <div>
            <Link
              to={`/association/${associationId}/admin`}
              className="text-sm text-blue-600 hover:text-blue-800 mb-2 inline-block"
            >
              ← 관리 메뉴
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 mt-2">📋 참가 신청 관리</h1>
            <p className="text-sm text-gray-600 mt-1">
              총 {applications.length}건 (대기: {pendingCount}건)
            </p>
          </div>

          {/* 검색 */}
          <div className="flex items-center gap-2">
            <input
              value={qText}
              onChange={(e) => setQText(e.target.value)}
              placeholder="팀명, 대표자명, 연락처, 이메일 검색"
              className="flex-1 max-w-md px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="text-sm text-gray-500">
              {filtered.length}건
            </div>
          </div>

          {/* 신청 목록 */}
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              {loading ? "불러오는 중..." : "등록된 신청이 없습니다."}
            </div>
          ) : (
            <div className="grid gap-4">
              {filtered.map((app) => (
                <div
                  key={app.id}
                  className="bg-white border rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {app.teamName}
                        </h3>
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            (() => {
                              const normalizedStatus = app.status?.toUpperCase();
                              return normalizedStatus === "PENDING"
                                ? "bg-yellow-100 text-yellow-700"
                                : normalizedStatus === "APPROVED"
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700";
                            })()
                          }`}
                        >
                          {(() => {
                            const normalizedStatus = app.status?.toUpperCase();
                            return normalizedStatus === "PENDING"
                              ? "대기"
                              : normalizedStatus === "APPROVED"
                              ? "승인"
                              : "반려";
                          })()}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div>대표자: {app.contactName}</div>
                        <div>연락처: {app.contactPhone}</div>
                        <div>이메일: {app.contactEmail}</div>
                        {app.memo && (
                          <div className="mt-2 text-xs text-gray-500">
                            소개: {app.memo}
                          </div>
                        )}
                        <div className="mt-2 text-xs text-gray-400">
                          신청일: {app.createdAt?.toDate?.()?.toLocaleString("ko-KR") || "알 수 없음"}
                        </div>
                      </div>
                    </div>

                    {/* 액션 버튼 */}
                    {app.status === "PENDING" && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(app)}
                          disabled={processing === app.id}
                          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold"
                        >
                          {processing === app.id ? "처리 중..." : "승인"}
                        </button>
                        <button
                          onClick={() => handleReject(app)}
                          disabled={processing === app.id}
                          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold"
                        >
                          반려
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

