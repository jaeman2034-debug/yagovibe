/**
 * NoticeSection - 협회 공지 섹션 (Public 읽기 전용)
 * 
 * 원칙:
 * - published 상태만 노출
 * - scheduled는 서버 시간 기준 자동 전환
 * - 단톡/문자/전화 → 이걸로 종료
 */

import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { collection, query, where, orderBy, getDocs, onSnapshot, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Notice } from "@/types/notice";
import { NoticeCard } from "./notice/NoticeCard";
import { NoticeEmptyState } from "./NoticeEmptyState";

interface NoticeSectionProps {
  associationId: string;
}

export function NoticeSection({ associationId }: NoticeSectionProps) {
  const navigate = useNavigate();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!associationId) return;

    setLoading(true);

    // 🔥 개발/운영 환경 분리: 개발은 루트 컬렉션, 운영은 서브컬렉션
    const isDevelopment = import.meta.env.DEV;
    const noticesPath = isDevelopment 
      ? 'notices'  // 개발: Emulator의 루트 컬렉션 사용
      : `associations/${associationId}/notices`;  // 운영: 서브컬렉션 사용
    const noticesRef = collection(db, noticesPath);
    
    // 🔥 디버깅: 쿼리 경로 및 조건 확인
    console.log("🔍 [NoticeSection] 공지 조회 시작:", {
      associationId,
      path: noticesPath,
      mode: isDevelopment ? '개발 모드 (루트 컬렉션)' : '운영 모드 (서브컬렉션)',
      isDevelopment,
    });
    
    // published 상태만 조회 (운영 공지 + 시스템 공지 모두 포함)
    // 🔥 시스템 공지도 status: "published"이므로 자동 포함됨
    const q = query(
      noticesRef, 
      where("status", "==", "published"),
      ...(isDevelopment ? [where("isOfficial", "==", true)] : []),  // 개발 환경에서만 isOfficial 필터
      orderBy("createdAt", "desc")
    );
    
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const now = Timestamp.now();
        
        // 🔥 디버깅: 원본 문서 개수 확인
        console.log("🔍 [NoticeSection] Firestore 응답:", {
          totalDocs: snapshot.docs.length,
          docs: snapshot.docs.map(doc => ({
            id: doc.id,
            data: doc.data(),
          })),
        });
        
        const noticesData = snapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
          .filter((notice) => {
            // 게시 시작일 체크
            if (notice.publishAt && notice.publishAt > now) return false;
            if (notice.visibleFrom && notice.visibleFrom > now) return false;
            // 종료일 체크
            if (notice.endAt && notice.endAt < now) return false;
            if (notice.visibleUntil && notice.visibleUntil < now) return false;
            return true;
          })
          .sort((a, b) => {
            // 클라이언트에서 정렬: isPinned 우선, 그 다음 publishedAt/createdAt (최신순)
            if (a.isPinned !== b.isPinned) {
              return b.isPinned ? 1 : -1; // 고정된 것이 위로
            }
            // 시스템 공지는 createdAt, 운영 공지는 publishedAt 사용
            const aDate = a.publishedAt?.toDate 
              ? a.publishedAt.toDate().getTime() 
              : a.createdAt?.toDate 
                ? a.createdAt.toDate().getTime()
                : 0;
            const bDate = b.publishedAt?.toDate 
              ? b.publishedAt.toDate().getTime()
              : b.createdAt?.toDate
                ? b.createdAt.toDate().getTime()
                : 0;
            return bDate - aDate; // 최신순
          }) as Notice[];
        
        setNotices(noticesData);
        setLoading(false);
        
        // 🔥 실시간 업데이트를 위한 디버깅 로그
        console.log("✅ [NoticeSection] 최종 공지 목록:", {
          total: noticesData.length,
          systemNotices: noticesData.filter(n => n.isSystemGenerated).length,
          regularNotices: noticesData.filter(n => !n.isSystemGenerated).length,
          notices: noticesData.map(n => ({ 
            id: n.id, 
            title: n.title, 
            status: n.status,
            isSystemGenerated: n.isSystemGenerated,
            systemEventType: n.systemEventType 
          }))
        });
      },
      (error) => {
        console.error("❌ [NoticeSection] 공지 실시간 구독 오류:", error);
        console.error("❌ [NoticeSection] 에러 상세:", {
          code: error.code,
          message: error.message,
          path: noticesPath,
          associationId,
        });
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [associationId]);

  if (loading) {
    return (
      <section id="notice" className="py-12 border-b bg-white">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">공지사항</h2>
            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
              공식 기준
            </span>
          </div>
          <p className="text-gray-500">로딩 중...</p>
        </div>
      </section>
    );
  }

  const pinnedNotices = notices.filter((n) => n.isPinned);
  const regularNotices = notices.filter((n) => !n.isPinned);

  return (
    <section id="notice" className="py-12 border-b bg-white">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">공지사항</h2>
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
              공식 기준
            </span>
            {notices.length > 0 && (
              <button
                onClick={() => navigate(`/association/${associationId}/notices`)}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                전체 보기 →
              </button>
            )}
          </div>
        </div>

        {notices.length === 0 ? (
          <NoticeEmptyState />
        ) : (
          <div className="space-y-4">
            {/* 상단 고정 공지 */}
            {pinnedNotices.length > 0 && (
              <div className="space-y-3">
                {pinnedNotices.map((notice) => (
                  <NoticeCard
                    key={notice.id}
                    notice={notice}
                    associationId={associationId}
                  />
                ))}
              </div>
            )}

            {/* 일반 공지 (최대 5개만 표시) */}
            {regularNotices.length > 0 && (
              <div className="space-y-3">
                {regularNotices.slice(0, 5).map((notice) => (
                  <NoticeCard
                    key={notice.id}
                    notice={notice}
                    associationId={associationId}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}


