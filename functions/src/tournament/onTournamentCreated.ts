/**
 * 🔥 대회 게시 시 자동 시스템 공지 생성
 * 
 * 원칙:
 * - 대회 게시 = 공식 사건 발생 = 기록으로 남아야 함
 * - 시스템 자동 생성 공지는 "시간의 기록"
 * - 운영 공지(사람용)와 시스템 공지(자동 기록) 분리
 * 
 * 트리거 조건 (엄격):
 * ✅ adminStatus: "published"
 * ✅ isOfficial: true
 * ✅ systemNotices.TOURNAMENT_CREATED 없음 (최초 1회만)
 */

import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions/v2";
import * as admin from "firebase-admin";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { triggerTournamentCreated, triggerDrawCompleted } from "./systemNoticeTriggers";
import { triggerReviewCompleted } from "./systemNoticeTriggers";

/**
 * 대회 생성 시 자동 시스템 공지 생성 (생성 시점에 이미 published인 경우)
 */
export const onTournamentCreated = onDocumentCreated(
  {
    document: "associations/{associationId}/tournaments/{tournamentId}",
    region: "asia-northeast3",
  },
  async (event) => {
    try {
      const { associationId, tournamentId } = event.params;
      const tournament = event.data?.data() as any;

      if (!tournament) {
        logger.warn("⚠️ 대회 데이터가 없습니다:", tournamentId);
        return;
      }

      // 🔥 트리거 조건 체크 (엄격)
      if (tournament.adminStatus !== "published") {
        logger.info("⏭️ 대회가 아직 게시되지 않음:", { tournamentId, adminStatus: tournament.adminStatus });
        return;
      }

      if (!tournament.isOfficial) {
        logger.info("⏭️ 공식 기준 대회가 아님:", { tournamentId, isOfficial: tournament.isOfficial });
        return;
      }

      // 중복 체크 (새로운 스키마: systemNotices)
      const systemNotices = tournament.systemNotices || {};
      if (systemNotices.TOURNAMENT_CREATED) {
        logger.info("⏭️ 이미 시스템 공지가 생성됨:", { tournamentId });
        return;
      }

      logger.info("🔥 대회 생성 감지 (published 상태), 시스템 공지 생성 시작:", { associationId, tournamentId });
      
      // 🔥 헬퍼 함수 사용
      await triggerTournamentCreated(associationId, tournamentId, tournament);

      // 🔥 실제 저장 필드명 확인 및 안전 처리
      // 대회 저장 시: title, dateStart, dateEnd 사용
      // Tournament 타입 정의: name, startDate, endDate (하위 호환성)
      const tournamentTitle = tournament.title || tournament.name || "대회";
      const tournamentDateStart = tournament.dateStart || tournament.startDate;
      const tournamentDateEnd = tournament.dateEnd || tournament.endDate;

      // 대회 기간 포맷팅
      const formatDate = (date: any): string => {
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
      };

      // 참가 신청 기간 포맷팅
      const formatPeriod = (period: any): string => {
        if (!period?.startDate || !period?.endDate) return "미정";
        try {
          const start = period.startDate.toDate ? period.startDate.toDate() : new Date(period.startDate);
          const end = period.endDate.toDate ? period.endDate.toDate() : new Date(period.endDate);
          return `${start.toLocaleDateString("ko-KR", { month: "long", day: "numeric" })} ~ ${end.toLocaleDateString("ko-KR", { month: "long", day: "numeric" })}`;
        } catch {
          return "미정";
        }
      };

      // 조 추첨일 포맷팅
      const formatDrawDate = (drawDate: any): string => {
        if (!drawDate?.date) return "";
        try {
          const d = drawDate.date.toDate ? drawDate.date.toDate() : new Date(drawDate.date);
          return d.toLocaleDateString("ko-KR", {
            year: "numeric",
            month: "long",
            day: "numeric",
          });
        } catch {
          return "";
        }
      };

      // 대회 상태 결정
      let statusText = "참가 신청 예정";
      if (tournament.registrationPeriod?.startDate) {
        try {
          const regStart = tournament.registrationPeriod.startDate.toDate
            ? tournament.registrationPeriod.startDate.toDate()
            : new Date(tournament.registrationPeriod.startDate);
          const regEnd = tournament.registrationPeriod.endDate.toDate
            ? tournament.registrationPeriod.endDate.toDate()
            : new Date(tournament.registrationPeriod.endDate);
          const today = new Date();
          
          if (today < regStart) {
            statusText = "참가 신청 예정";
          } else if (today >= regStart && today <= regEnd) {
            statusText = "참가 신청 진행 중";
          } else {
            statusText = "참가 신청 마감";
          }
        } catch {
          // 날짜 파싱 오류 시 기본값 유지
        }
      }

      // 현재 날짜 포맷팅
      const nowDateStr = now.toDate().toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      // 시스템 공지 제목 및 내용 생성
      const noticeTitle = `[대회 생성] ${tournamentTitle}`;
      const noticeContent = `
${tournamentTitle}가 ${nowDateStr}에 공식 생성되었습니다.

**대회 정보**
- 대회 기간: ${formatDate(tournamentDateStart)} ~ ${formatDate(tournamentDateEnd)}
- 참가 신청 기간: ${formatPeriod(tournament.registrationPeriod)}
- 선수 명단 수정 기간: ${formatPeriod(tournament.rosterEditPeriod)}
- 사무국 검수 기간: ${formatPeriod(tournament.reviewPeriod)}
${tournament.drawDate ? `- 조 추첨일: ${formatDrawDate(tournament.drawDate)}` : ""}

**현재 상태**
- ${statusText}

**대회 바로가기**
- [대회 상세 보기](/association/${associationId}/tournaments/${tournamentId})

---
본 공지는 시스템에 의해 자동으로 생성되었습니다.
`;

      // visibleUntil 설정 (대회 종료일)
      let visibleUntil: admin.firestore.Timestamp | null = null;
      if (tournamentDateEnd) {
        try {
          visibleUntil = tournamentDateEnd.toDate 
            ? tournamentDateEnd 
            : admin.firestore.Timestamp.fromDate(new Date(tournamentDateEnd));
        } catch {
          // 날짜 변환 실패 시 null (영구 노출)
        }
      }

      // 시스템 공지 생성 (새로운 스키마)
      const noticesRef = db.collection(`associations/${associationId}/notices`);
      const noticeDoc = await noticesRef.add({
        // 🔥 기본 필드
        associationId,
        type: "SYSTEM",
        event: "TOURNAMENT_CREATED",
        title: noticeTitle,
        summary: `${tournamentTitle}가 공식 생성되었습니다.`,
        
        // 🔥 콘텐츠 구조화
        content: {
          tournamentId,
          tournamentName: tournamentTitle,
          tournamentPeriod: {
            start: tournamentDateStart?.toDate ? tournamentDateStart.toDate().toISOString().split("T")[0] : null,
            end: tournamentDateEnd?.toDate ? tournamentDateEnd.toDate().toISOString().split("T")[0] : null,
          },
          applyPeriod: tournament.registrationPeriod ? {
            start: tournament.registrationPeriod.startDate?.toDate ? tournament.registrationPeriod.startDate.toDate().toISOString().split("T")[0] : null,
            end: tournament.registrationPeriod.endDate?.toDate ? tournament.registrationPeriod.endDate.toDate().toISOString().split("T")[0] : null,
          } : null,
          status: statusText,
        },
        
        // 🔥 마크다운 본문 (하위 호환성)
        contentMarkdown: noticeContent.trim(),
        
        // 🔥 메타데이터
        official: true,
        createdBy: "SYSTEM",
        createdAt: now.toDate().toISOString(),
        immutable: true, // 수정 불가
        
        // 🔥 연결 리소스
        linkedResource: {
          type: "TOURNAMENT",
          id: tournamentId,
          url: `/association/${associationId}/tournaments/${tournamentId}`,
        },
        
        // 🔥 가시성
        visibility: "PUBLIC",
        visibleFrom: now,
        visibleUntil,
        
        // 🔥 하위 호환성 필드 (기존 UI 호환)
        status: "published",
        publishAt: now,
        publishedAt: now,
        isVisible: true,
        isPinned: false,
        label: "대회",
        level: "normal",
        isOfficial: true,
        isSystemGenerated: true,
        systemEventType: "TOURNAMENT_CREATED",
        relatedTournamentId: tournamentId,
        viewCount: 0,
        clickCount: 0,
        updatedAt: now,
      });

      // 🔥 대회 문서에 시스템 공지 생성 플래그 설정 (중복 방지)
      const tournamentRef = db.doc(`associations/${associationId}/tournaments/${tournamentId}`);
      await tournamentRef.update({
        systemNoticeCreated: true,
        systemNoticeId: noticeDoc.id,
        systemNoticeCreatedAt: now,
      });

      logger.info("✅ 시스템 공지 생성 완료:", {
        associationId,
        tournamentId,
        noticeId: noticeDoc.id,
        noticeTitle,
      });
    } catch (error: any) {
      logger.error("❌ 시스템 공지 생성 오류:", {
        tournamentId: event.params.tournamentId,
        error: error.message,
        stack: error.stack,
      });
      // 오류가 발생해도 대회 생성은 성공한 상태이므로 throw하지 않음
    }
  }
);

/**
 * 대회 업데이트 시 자동 시스템 공지 생성 (draft → published 변경 시)
 */
export const onTournamentUpdated = onDocumentUpdated(
  {
    document: "associations/{associationId}/tournaments/{tournamentId}",
    region: "asia-northeast3",
  },
  async (event) => {
    try {
      const { associationId, tournamentId } = event.params;
      const before = event.data?.before.data() as any;
      const after = event.data?.after.data() as any;

      if (!before || !after) {
        return;
      }

      // 🔥 ① draft → published 변경 감지 (TOURNAMENT_CREATED)
      if (before.adminStatus !== "published" && after.adminStatus === "published") {
        if (after.isOfficial) {
          const systemNotices = after.systemNotices || {};
          if (!systemNotices.TOURNAMENT_CREATED) {
            logger.info("🔥 대회 게시 감지 (draft → published), 시스템 공지 생성 시작:", { associationId, tournamentId });
            await triggerTournamentCreated(associationId, tournamentId, after);
          }
        }
      }

      // 🔥 ⑥ drawExecuted 변경 감지 (DRAW_COMPLETED)
      if (before.drawExecuted !== after.drawExecuted && after.drawExecuted === true) {
        if (after.isOfficial) {
          logger.info("🔥 조 추첨 완료 감지, 시스템 공지 생성 시작:", { associationId, tournamentId });
          await triggerDrawCompleted(associationId, tournamentId, after, before);
        }
      }

      // 🔥 ⑤ 검수 기간 종료 체크 (REVIEW_COMPLETED) - 매일 스케줄러가 처리하지만, 여기서도 즉시 체크
      if (after.isOfficial && after.reviewPeriod?.endDate) {
        const endDate = after.reviewPeriod.endDate.toDate
          ? after.reviewPeriod.endDate.toDate()
          : new Date(after.reviewPeriod.endDate);
        const now = new Date();
        if (endDate <= now) {
          await triggerReviewCompleted(associationId, tournamentId, after);
        }
      }
    } catch (error: any) {
      logger.error("❌ 대회 업데이트 트리거 오류:", {
        tournamentId: event.params.tournamentId,
        error: error.message,
        stack: error.stack,
      });
    }
  }
);
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
      };

      // 참가 신청 기간 포맷팅
      const formatPeriod = (period: any): string => {
        if (!period?.startDate || !period?.endDate) return "미정";
        try {
          const start = period.startDate.toDate ? period.startDate.toDate() : new Date(period.startDate);
          const end = period.endDate.toDate ? period.endDate.toDate() : new Date(period.endDate);
          return `${start.toLocaleDateString("ko-KR", { month: "long", day: "numeric" })} ~ ${end.toLocaleDateString("ko-KR", { month: "long", day: "numeric" })}`;
        } catch {
          return "미정";
        }
      };

      // 조 추첨일 포맷팅
      const formatDrawDate = (drawDate: any): string => {
        if (!drawDate?.date) return "";
        try {
          const d = drawDate.date.toDate ? drawDate.date.toDate() : new Date(drawDate.date);
          return d.toLocaleDateString("ko-KR", {
            year: "numeric",
            month: "long",
            day: "numeric",
          });
        } catch {
          return "";
        }
      };

      // 대회 상태 결정
      let statusText = "참가 신청 예정";
      if (tournament.registrationPeriod?.startDate) {
        try {
          const regStart = tournament.registrationPeriod.startDate.toDate
            ? tournament.registrationPeriod.startDate.toDate()
            : new Date(tournament.registrationPeriod.startDate);
          const regEnd = tournament.registrationPeriod.endDate.toDate
            ? tournament.registrationPeriod.endDate.toDate()
            : new Date(tournament.registrationPeriod.endDate);
          const today = new Date();
          
          if (today < regStart) {
            statusText = "참가 신청 예정";
          } else if (today >= regStart && today <= regEnd) {
            statusText = "참가 신청 진행 중";
          } else {
            statusText = "참가 신청 마감";
          }
        } catch {
          // 날짜 파싱 오류 시 기본값 유지
        }
      }

      // 현재 날짜 포맷팅
      const nowDateStr = now.toDate().toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      // 시스템 공지 제목 및 내용 생성
      const tournamentTitle = tournament.title || tournament.name || "대회";
      const tournamentDateStart = tournament.dateStart || tournament.startDate;
      const tournamentDateEnd = tournament.dateEnd || tournament.endDate;
      const noticeTitle = `[대회 생성] ${tournamentTitle}`;
      const noticeContent = `
${tournamentTitle}가 ${nowDateStr}에 공식 생성되었습니다.

**대회 정보**
- 대회 기간: ${formatDate(tournamentDateStart)} ~ ${formatDate(tournamentDateEnd)}
- 참가 신청 기간: ${formatPeriod(tournament.registrationPeriod)}
- 선수 명단 수정 기간: ${formatPeriod(tournament.rosterEditPeriod)}
- 사무국 검수 기간: ${formatPeriod(tournament.reviewPeriod)}
${tournament.drawDate ? `- 조 추첨일: ${formatDrawDate(tournament.drawDate)}` : ""}

**현재 상태**
- ${statusText}

**대회 바로가기**
- [대회 상세 보기](/association/${associationId}/tournaments/${tournamentId})

---
본 공지는 시스템에 의해 자동으로 생성되었습니다.
`;

      // visibleUntil 설정 (대회 종료일)
      let visibleUntil: admin.firestore.Timestamp | null = null;
      if (tournamentDateEnd) {
        try {
          visibleUntil = tournamentDateEnd.toDate 
            ? tournamentDateEnd 
            : admin.firestore.Timestamp.fromDate(new Date(tournamentDateEnd));
        } catch {
          // 날짜 변환 실패 시 null (영구 노출)
        }
      }

      // 시스템 공지 생성
      const noticesRef = db.collection(`associations/${associationId}/notices`);
      const noticeDoc = await noticesRef.add({
        associationId,
        type: "SYSTEM",
        event: "TOURNAMENT_CREATED",
        title: noticeTitle,
        summary: `${tournamentTitle}가 공식 생성되었습니다.`,
        content: {
          tournamentId,
          tournamentName: tournamentTitle,
          tournamentPeriod: {
            start: tournamentDateStart?.toDate ? tournamentDateStart.toDate().toISOString().split("T")[0] : null,
            end: tournamentDateEnd?.toDate ? tournamentDateEnd.toDate().toISOString().split("T")[0] : null,
          },
          applyPeriod: tournament.registrationPeriod ? {
            start: tournament.registrationPeriod.startDate?.toDate ? tournament.registrationPeriod.startDate.toDate().toISOString().split("T")[0] : null,
            end: tournament.registrationPeriod.endDate?.toDate ? tournament.registrationPeriod.endDate.toDate().toISOString().split("T")[0] : null,
          } : null,
          status: statusText,
        },
        contentMarkdown: noticeContent.trim(),
        official: true,
        createdBy: "SYSTEM",
        createdAt: now.toDate().toISOString(),
        immutable: true,
        linkedResource: {
          type: "TOURNAMENT",
          id: tournamentId,
          url: `/association/${associationId}/tournaments/${tournamentId}`,
        },
        visibility: "PUBLIC",
        visibleFrom: now,
        visibleUntil,
        
        // 🔥 하위 호환성 필드 (기존 UI 호환)
        status: "published",
        publishAt: now,
        publishedAt: now,
        isVisible: true,
        isPinned: false,
        label: "대회",
        level: "normal",
        isOfficial: true,
        isSystemGenerated: true,
        systemEventType: "TOURNAMENT_CREATED",
        relatedTournamentId: tournamentId,
        viewCount: 0,
        clickCount: 0,
        updatedAt: now,
      });

      // 대회 문서에 시스템 공지 생성 플래그 설정
      const tournamentRef = db.doc(`associations/${associationId}/tournaments/${tournamentId}`);
      await tournamentRef.update({
        systemNoticeCreated: true,
        systemNoticeId: noticeDoc.id,
        systemNoticeCreatedAt: now,
      });

      logger.info("✅ 시스템 공지 생성 완료 (게시 시):", {
        associationId,
        tournamentId,
        noticeId: noticeDoc.id,
        noticeTitle,
      });
    } catch (error: any) {
      logger.error("❌ 시스템 공지 생성 오류 (게시 시):", {
        tournamentId: event.params.tournamentId,
        error: error.message,
        stack: error.stack,
      });
    }
  }
);

