/**
 * 공지 상세 페이지 (Public)
 * /association/:associationId/notices/:noticeId
 * 
 * 원칙:
 * - published 상태만 노출
 * - 읽기 전용 (문서형)
 * - 공식 기준 배지 전면 고정
 * - SectionLayout으로 통일된 UI
 */

import { useParams, useNavigate, Link } from "react-router-dom";
import { Trophy } from "lucide-react";
import { useState, useEffect } from "react";
import { doc, getDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Notice } from "@/types/notice";
import { SectionLayout } from "@/components/association/SectionLayout";
import { OfficialSystemBadge } from "@/components/common/OfficialSystemBadge";
import { useIsAssociationAdmin } from "@/hooks/useIsAssociationAdmin";
import { NoticeLogSection } from "@/components/association/notice/NoticeLogSection";
import { formatDate, safeToDate } from "@/utils/dateUtils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, BarChart3, FileText, Download } from "lucide-react";
import { getNoticeStats, CATEGORY_LABELS, type NoticeStats } from "@/lib/notice/noticeStatsRepository";
import { getNoticeSnapshot } from "@/lib/notice/noticeSnapshotRepository";
import { generateNoticeSnapshotPdf } from "@/utils/noticeSnapshotPdf";
import { FeeSummaryBox } from "@/components/notice/FeeSummaryBox";
import { FeeCalculator } from "@/components/notice/FeeCalculator";
import { toast } from "sonner";

export default function NoticeDetailPage() {
  const { associationId, noticeId } = useParams<{ associationId: string; noticeId: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useIsAssociationAdmin(associationId);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [stats, setStats] = useState<NoticeStats | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  useEffect(() => {
    if (!associationId || !noticeId) return;

    const fetchNotice = async () => {
      try {
        // ✅ 서브컬렉션 사용 (실제 저장된 경로와 일치)
        const noticeRef = doc(db, `associations/${associationId}/notices/${noticeId}`);
        const noticeSnap = await getDoc(noticeRef);

        if (!noticeSnap.exists()) {
          console.error("[NoticeDetailPage] 공지 문서가 존재하지 않음:", { noticeId });
          setNotFound(true);
          return;
        }

        const data = noticeSnap.data();
        
        // 🔥 디버그: 공지 데이터 확인
        console.log("[NoticeDetailPage] 공지 데이터:", {
          noticeId,
          status: data.status,
          title: data.title,
          hasContent: !!data.content,
          publishAt: data.publishAt,
          endAt: data.endAt,
        });
        
        // ✅ 서브컬렉션 사용 시 경로에 이미 associationId가 포함되어 있으므로
        // 문서 내부의 associationId 필드 체크는 불필요 (값이 잘못 저장되어 있어도 경로로 보호됨)
        
        // published 상태만 노출 (일반 사용자 페이지)
        if (data.status !== "published") {
          console.log("[NoticeDetailPage] published 상태가 아님:", { status: data.status });
          setNotFound(true);
          return;
        }

        // 게시 기간 체크
        const now = Timestamp.now();
        if (data.publishAt && data.publishAt > now) {
          console.log("[NoticeDetailPage] 아직 게시되지 않음:", { publishAt: data.publishAt, now });
          setNotFound(true);
          return;
        }
        if (data.endAt && data.endAt < now) {
          console.log("[NoticeDetailPage] 게시 기간 만료:", { endAt: data.endAt, now });
          setNotFound(true);
          return;
        }

        setNotice({
          id: noticeSnap.id,
          ...data,
        } as Notice);

        // 통계 로드 (관리자만, 선택적 - 실패해도 페이지는 정상 작동)
        if (isAdmin) {
          try {
            const noticeStats = await getNoticeStats(associationId, noticeId);
            setStats(noticeStats);
          } catch (error: any) {
            // 통계는 선택적 기능이므로 에러를 조용히 처리
            // 권한 없음 또는 통계 미생성 상태는 정상
            if (error?.code !== "permission-denied") {
              console.warn("통계 로드 실패 (선택적 기능):", error?.message || error);
            }
            // 통계가 없어도 페이지는 정상 작동
            setStats(null);
          }
        }
      } catch (error) {
        console.error("공지 조회 오류:", error);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    fetchNotice();
  }, [associationId, noticeId, isAdmin]);

  if (loading) {
    return (
      <SectionLayout title="공지사항" associationId={associationId}>
        <div className="flex items-center justify-center py-8">
          <p className="text-gray-500">로딩 중...</p>
        </div>
      </SectionLayout>
    );
  }

  if (notFound || !notice) {
    return (
      <SectionLayout title="공지사항" associationId={associationId}>
        <div className="text-center py-8">
          <p className="text-gray-500 mb-4">공지를 찾을 수 없습니다.</p>
          <button
            onClick={() => navigate(`/association/${associationId}/notices`)}
            className="text-blue-600 hover:text-blue-800"
          >
            공지 목록으로 돌아가기
          </button>
        </div>
      </SectionLayout>
    );
  }

  const getLabelColor = (label?: string) => {
    switch (label) {
      case "필독":
        return "bg-red-100 text-red-700";
      case "변경":
        return "bg-blue-100 text-blue-700";
      case "대회":
        return "bg-green-100 text-green-700";
      default:
        return "";
    }
  };

  return (
    <SectionLayout
      title="공지사항"
      associationId={associationId}
      description="✔ 본 공지는 협회 공식 기준입니다."
    >
      {/* 공지 내용 (문서형) */}
      <article className="bg-white rounded-lg shadow-md p-6 md:p-8">
        {/* 헤더 */}
        <header className="mb-6 border-b border-gray-200 pb-4">
          <div className="flex items-start justify-between gap-4 mb-3">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 flex-1">
              {notice.title}
            </h2>
            <div className="flex items-center gap-2 flex-shrink-0">
              {notice.isPinned && (
                <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">
                  ⭐ 고정
                </span>
              )}
              {notice.label && (
                <span className={`px-2 py-1 rounded text-xs font-medium ${getLabelColor(notice.label)}`}>
                  [{notice.label}]
                </span>
              )}
              {isAdmin && (
                <button
                  onClick={() => {
                    // 공지 목록 페이지로 이동하여 Drawer로 수정
                    navigate(`/association/${associationId}/notices?edit=${noticeId}`);
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800 px-2 py-1"
                >
                  수정
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <span>게시일: {formatDate(notice.publishAt || notice.createdAt)}</span>
            <OfficialSystemBadge variant="header" />
          </div>
        </header>

        {/* 🔥 참가비 요약 박스 (공지 상단 고정) */}
        {notice.feePolicy && (
          <div className="mb-6">
            <FeeSummaryBox feePolicy={notice.feePolicy} />
          </div>
        )}

        {/* 본문 */}
        <div className="noticeContent prose prose-lg max-w-none">
          {notice.content?.trim() ? (
            <div className="text-gray-700 whitespace-pre-wrap leading-relaxed text-base">
              {notice.content}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <p className="text-sm">본문 내용이 없습니다.</p>
            </div>
          )}
        </div>

        {/* 🔥 참가비 자동 계산기 (본문 하단) */}
        {notice.feePolicy && (
          <div className="mt-6">
            <FeeCalculator feePolicy={notice.feePolicy} />
          </div>
        )}

        {/* 🔥 참가 신청 버튼 (본문 하단) */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex flex-col items-center gap-3">
            {(() => {
              const now = new Date();
              const endAt = notice.endAt?.toDate();
              const isExpired = endAt && endAt < now;
              const isBeforeStart = notice.publishAt?.toDate() && notice.publishAt.toDate() > now;

              if (isBeforeStart) {
                return (
                  <div className="w-full text-center py-4 bg-gray-100 rounded-lg border border-gray-300">
                    <p className="text-gray-700 font-semibold">🔒 참가 신청 준비 중</p>
                    <p className="text-sm text-gray-500 mt-1">신청 기간이 시작되면 신청할 수 있습니다.</p>
                  </div>
                );
              }

              if (isExpired) {
                return (
                  <div className="w-full text-center py-4 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-red-700 font-semibold">❌ 참가 신청 마감</p>
                    <p className="text-sm text-red-600 mt-1">신청 기간이 종료되었습니다.</p>
                  </div>
                );
              }

              return (
                <>
                  <Button
                    onClick={() => {
                      if (!associationId || !noticeId) return;
                      navigate(`/association/${associationId}/apply?noticeId=${noticeId}`);
                    }}
                    className="w-full sm:w-auto min-w-[250px]"
                    variant="default"
                    size="lg"
                  >
                    ⚽ 대회 참가 신청하기
                  </Button>
                  <p className="text-xs text-gray-500 w-full max-w-none text-center md:mx-auto md:max-w-3xl">
                    신청 제출 후 협회 승인을 거쳐 팀장 초대 링크가 발송됩니다.
                  </p>
                </>
              );
            })()}
          </div>
        </div>

        {/* 수정 이력 (하단) */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="text-xs text-gray-500">
            최초 등록 · {formatDate(notice.createdAt, {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
            {notice.updatedAt && safeToDate(notice.updatedAt) && safeToDate(notice.createdAt) && 
              safeToDate(notice.updatedAt)!.getTime() !== safeToDate(notice.createdAt)!.getTime() && (
              <>
                {" · "}
                <span className="font-medium">최종 수정</span>
                {" · "}
                {formatDate(notice.updatedAt, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </>
            )}
          </div>
        </div>

        {/* 이력 로그 (행정 모드에서만) */}
        {isAdmin && associationId && noticeId && (
          <NoticeLogSection associationId={associationId} noticeId={noticeId} />
        )}

        {/* 🔥 질문 통계 카드 (관리자만) */}
        {isAdmin && stats && stats.totalQuestions > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="w-5 h-5" />
                문의 통계
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm font-semibold text-gray-700">
                총 질문 수: {stats.totalQuestions}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {Object.entries(stats.categoryCounts)
                  .filter(([_, count]) => count > 0)
                  .sort(([_, a], [__, b]) => (b as number) - (a as number))
                  .map(([category, count]) => (
                    <div
                      key={category}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded border"
                    >
                      <span className="text-sm text-gray-700">
                        {CATEGORY_LABELS[category] || category}
                      </span>
                      <Badge variant="secondary" className="ml-2">
                        {count}
                      </Badge>
                    </div>
                  ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                💡 통계를 바탕으로 공지 개선 포인트를 파악하세요.
              </p>
            </CardContent>
          </Card>
        )}

        {/* 🔥 이 공지로 대회 생성 버튼 (관리자만, published 상태만) */}
        {isAdmin && notice.status === "published" && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex flex-col items-center gap-3">
              <div className="text-center mb-2">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  이 공지로 대회 생성하기
                </h3>
                <p className="text-sm text-gray-600">
                  공지 내용이 자동으로 대회 등록 페이지에 반영됩니다
                </p>
              </div>
              <Button
                onClick={() => {
                  if (!associationId || !noticeId) return;
                  // 대회 생성 페이지로 이동 (fromNotice 파라미터 전달)
                  const targetPath = `/association/${associationId}/admin/tournaments/new?fromNotice=${noticeId}`;
                  console.log("[NoticeDetailPage] 대회 생성 페이지로 이동:", targetPath);
                  navigate(targetPath);
                }}
                className="w-full sm:w-auto min-w-[200px]"
                variant="default"
                size="lg"
              >
                <Trophy className="w-5 h-5 mr-2" />
                이 공지로 대회 생성
              </Button>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 max-w-md text-center">
                <p className="text-xs text-blue-800">
                  <strong>자동 반영 항목:</strong> 제목, 본문, 참가비, 공식 여부
                  <br />
                  <span className="text-blue-600">
                    거의 수정 없이 저장만 누르면 됩니다.
                  </span>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 공식성 선언 (하단 고정) */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-600 text-center mb-4">
            본 공지는 협회 공식 시스템에 등록된 기준 공지입니다.
          </p>
          
          {/* 🔥 이 공지로 문의하기 버튼 */}
          {notice.isOfficial && (
            <div className="flex flex-col items-center gap-3">
              {notice.status === "closed" ? (
                <div className="text-center space-y-2">
                  <Badge variant="secondary" className="text-sm">
                    🔒 공지 종료됨
                  </Badge>
                  <p className="text-xs text-gray-500">
                    이 공지는 종료되었습니다. 공식 기준 답변은 FAQ를 참고해 주세요.
                  </p>
                </div>
              ) : (
                <Button
                  onClick={() => {
                    if (!associationId || !noticeId) return;
                    // 대화 화면으로 이동 (Functions가 자동 생성)
                    navigate(
                      `/association/${associationId}/notices/${noticeId}/chat`
                    );
                  }}
                  className="w-full sm:w-auto"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  이 공지로 문의하기
                </Button>
              )}

              {/* 🔥 공지 스냅샷 PDF 다운로드 버튼 (종료된 공지만) */}
              {isAdmin && notice.status === "closed" && (
                <Button
                  variant="outline"
                  onClick={async () => {
                    if (!associationId || !noticeId) return;

                    setDownloadingPdf(true);
                    try {
                      const snapshot = await getNoticeSnapshot(
                        associationId,
                        noticeId
                      );

                      if (!snapshot) {
                        toast.error("스냅샷을 찾을 수 없습니다. 공지가 종료되었는지 확인해주세요.");
                        return;
                      }

                      // 날짜 포맷팅
                      const publishedAt = notice.publishedAt?.toDate?.() || notice.createdAt?.toDate?.() || new Date();
                      const closedAt = snapshot.closedAt?.toDate?.() || new Date();

                      generateNoticeSnapshotPdf({
                        noticeTitle: snapshot.noticeTitle || notice.title,
                        publishedAt,
                        closedAt,
                        noticeContent: snapshot.noticeContent || notice.content || "",
                        faqs: snapshot.faqSnapshot || [],
                        stats: snapshot.statsSnapshot,
                      });

                      toast.success("공지 스냅샷 PDF가 생성되었습니다.");
                    } catch (error) {
                      console.error("PDF 생성 오류:", error);
                      toast.error("PDF 생성 중 오류가 발생했습니다.");
                    } finally {
                      setDownloadingPdf(false);
                    }
                  }}
                  disabled={downloadingPdf}
                  className="w-full sm:w-auto"
                >
                  {downloadingPdf ? (
                    <>
                      <FileText className="w-4 h-4 mr-2 animate-pulse" />
                      생성 중...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      공지 스냅샷 PDF 다운로드
                    </>
                  )}
                </Button>
              )}
            </div>
          )}
        </div>
      </article>
    </SectionLayout>
  );
}

