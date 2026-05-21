/**
 * 🔥 시스템 공지 생성 헬퍼 함수
 * 
 * 공통 로직:
 * - 중복 생성 방지
 * - 일관된 스키마 적용
 * - 에러 처리
 */

import { getFirestore } from "firebase-admin/firestore";
import * as admin from "firebase-admin";
import { logger } from "firebase-functions/v2";

export type SystemNoticeEvent =
  | "TOURNAMENT_CREATED"
  | "APPLY_STARTED"
  | "APPLY_CLOSED"
  | "ROSTER_CLOSED"
  | "REVIEW_COMPLETED"
  | "DRAW_COMPLETED"
  | "TOURNAMENT_STARTED"
  | "TOURNAMENT_ENDED";

export interface CreateSystemNoticeParams {
  associationId: string;
  tournamentId: string;
  tournament: any;
  event: SystemNoticeEvent;
  title: string;
  summary: string;
  content: {
    tournamentId: string;
    tournamentName: string;
    effectiveAt?: string;
    status?: string;
    [key: string]: any;
  };
  effectiveAt?: Date; // 이벤트 발생 시각
}

/**
 * 시스템 공지 생성 (중복 방지 포함)
 */
export async function createSystemNotice(
  params: CreateSystemNoticeParams
): Promise<string | null> {
  try {
    const { associationId, tournamentId, event, title, summary, content, effectiveAt } = params;
    const db = getFirestore();
    const now = admin.firestore.Timestamp.now();
    const effectiveDate = effectiveAt || now.toDate();

    // 🔥 중복 생성 방지: 이미 같은 이벤트의 공지가 생성되었는지 확인
    const tournamentRef = db.doc(`associations/${associationId}/tournaments/${tournamentId}`);
    const tournamentSnap = await tournamentRef.get();
    
    if (!tournamentSnap.exists) {
      logger.warn("⚠️ 대회 문서가 없습니다:", { tournamentId });
      return null;
    }

    const tournamentData = tournamentSnap.data() as any;
    const systemNotices = tournamentData.systemNotices || {};

    // 이미 같은 이벤트의 공지가 생성되었는지 확인
    if (systemNotices[event]) {
      logger.info(`⏭️ 이미 ${event} 시스템 공지가 생성됨:`, { tournamentId, event });
      return systemNotices[event].noticeId;
    }

    // 대회명 추출
    const tournamentName = tournament.title || tournament.name || "대회";

    // 시스템 공지 생성
    const noticesRef = db.collection(`associations/${associationId}/notices`);
    const noticeDoc = await noticesRef.add({
      // 🔥 기본 필드
      associationId,
      type: "SYSTEM",
      event,
      title,
      summary,
      
      // 🔥 콘텐츠 구조화
      content: {
        ...content,
        tournamentId,
        tournamentName,
        effectiveAt: effectiveDate.toISOString(),
      },
      
      // 🔥 마크다운 본문 (하위 호환성)
      contentMarkdown: `${title}\n\n${summary}\n\n---\n본 공지는 시스템에 의해 자동으로 생성되었습니다.`,
      
      // 🔥 메타데이터
      official: tournament.isOfficial || false,
      createdBy: "SYSTEM",
      createdAt: effectiveDate.toISOString(),
      immutable: true, // 수정 불가
      
      // 🔥 연결 리소스
      linkedResource: {
        type: "TOURNAMENT",
        id: tournamentId,
        url: `/association/${associationId}/tournaments/${tournamentId}`,
      },
      
      // 🔥 가시성
      visibility: "PUBLIC",
      visibleFrom: admin.firestore.Timestamp.fromDate(effectiveDate),
      visibleUntil: tournament.dateEnd || null, // 대회 종료일까지 노출
      
      // 🔥 하위 호환성 필드 (기존 UI 호환)
      status: "published",
      publishAt: admin.firestore.Timestamp.fromDate(effectiveDate),
      publishedAt: admin.firestore.Timestamp.fromDate(effectiveDate),
      isVisible: true,
      isPinned: false,
      label: "대회",
      level: "normal",
      isOfficial: tournament.isOfficial || false,
      isSystemGenerated: true,
      systemEventType: event,
      relatedTournamentId: tournamentId,
      viewCount: 0,
      clickCount: 0,
      updatedAt: admin.firestore.Timestamp.fromDate(effectiveDate),
    });

    // 🔥 대회 문서에 시스템 공지 생성 플래그 설정 (중복 방지)
    const updateData: any = {
      [`systemNotices.${event}`]: {
        noticeId: noticeDoc.id,
        createdAt: admin.firestore.Timestamp.fromDate(effectiveDate),
      },
    };

    // 최초 시스템 공지 생성 플래그 (하위 호환성)
    if (event === "TOURNAMENT_CREATED") {
      updateData.systemNoticeCreated = true;
      updateData.systemNoticeId = noticeDoc.id;
      updateData.systemNoticeCreatedAt = admin.firestore.Timestamp.fromDate(effectiveDate);
    }

    await tournamentRef.update(updateData);

    logger.info(`✅ ${event} 시스템 공지 생성 완료:`, {
      associationId,
      tournamentId,
      noticeId: noticeDoc.id,
      event,
    });

    return noticeDoc.id;
  } catch (error: any) {
    logger.error(`❌ ${params.event} 시스템 공지 생성 오류:`, {
      tournamentId: params.tournamentId,
      event: params.event,
      error: error.message,
      stack: error.stack,
    });
    return null;
  }
}

/**
 * 날짜 포맷팅 헬퍼
 */
export function formatDate(date: any): string {
  if (!date) return "미정";
  try {
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "미정";
  }
}

/**
 * 기간 포맷팅 헬퍼
 */
export function formatPeriod(period: any): string {
  if (!period?.startDate || !period?.endDate) return "미정";
  try {
    const start = period.startDate.toDate ? period.startDate.toDate() : new Date(period.startDate);
    const end = period.endDate.toDate ? period.endDate.toDate() : new Date(period.endDate);
    return `${start.toLocaleDateString("ko-KR", { month: "long", day: "numeric" })} ~ ${end.toLocaleDateString("ko-KR", { month: "long", day: "numeric" })}`;
  } catch {
    return "미정";
  }
}

