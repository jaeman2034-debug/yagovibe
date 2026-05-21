/**
 * 공지 히스토리 & 롤백 유틸리티 (감사 로그)
 * 
 * 원칙:
 * - 변경 시 이전/이후 스냅샷을 서브컬렉션에 저장
 * - 히스토리는 불변 로그 (수정/삭제 금지)
 * - 롤백 = 해당 스냅샷을 다시 덮어쓰기
 * - 운영자의 보험 역할
 */

import {
  doc,
  getDoc,
  getDocs,
  collection,
  addDoc,
  updateDoc,
  serverTimestamp,
  runTransaction,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Notice } from "@/types/notice";

/**
 * 히스토리 액션 타입
 */
export type NoticeHistoryAction = 
  | 'create'    // 최초 생성
  | 'update'    // 임시 저장 / 수정
  | 'request'   // 게시 요청
  | 'approve'   // 게시 승인
  | 'reject'    // 게시 반려
  | 'schedule'  // 게시 예약
  | 'pin'       // 상단 고정
  | 'unpin'     // 상단 고정 해제
  | 'expire'    // 공지 만료
  | 'rollback'; // 롤백

/**
 * 히스토리 엔트리 타입
 */
export interface NoticeHistoryEntry {
  id?: string;
  action: NoticeHistoryAction;
  before?: {
    title?: string;
    content?: string;
    status?: string;
  };
  after: {
    title: string;
    content: string;
    status: string;
  };
  reason?: string; // 반려 사유 / 수정 사유
  actorUid: string;
  actorRole: 'admin' | 'superAdmin';
  createdAt: Timestamp;
}

/**
 * 공지 히스토리 저장 (트랜잭션 사용 권장)
 * 
 * @param noticeId 공지 ID
 * @param action 액션 타입
 * @param beforeData 변경 전 데이터 (update/rollback일 때만)
 * @param afterData 변경 후 데이터
 * @param actorUid 수행자 UID
 * @param actorRole 수행자 역할
 * @param reason 사유 (반려/수정 사유)
 */
export async function saveNoticeHistory(
  noticeId: string,
  action: NoticeHistoryAction,
  afterData: { title: string; content: string; status: string },
  actorUid: string,
  actorRole: 'admin' | 'superAdmin',
  beforeData?: { title?: string; content?: string; status?: string },
  reason?: string
): Promise<void> {
  try {
    const historyRef = collection(db, "notices", noticeId, "history");
    
    await addDoc(historyRef, {
      action,
      before: beforeData || null,
      after: afterData,
      reason: reason || null,
      actorUid,
      actorRole,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("공지 히스토리 저장 실패:", error);
    // 히스토리 실패해도 저장은 계속 진행
  }
}

/**
 * 공지 히스토리 조회
 */
export async function fetchNoticeHistory(noticeId: string): Promise<NoticeHistoryEntry[]> {
  const snap = await getDocs(collection(db, "notices", noticeId, "history"));

  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  } as NoticeHistoryEntry));
}

/**
 * 공지 롤백 실행 (히스토리 기록 포함)
 */
export async function rollbackNotice(
  noticeId: string,
  snapshot: Partial<Notice>,
  adminId: string,
  isSuperAdmin: boolean,
  reason?: string
): Promise<void> {
  const noticeRef = doc(db, "notices", noticeId);
  
  // 현재 상태 조회
  const currentSnap = await getDoc(noticeRef);
  if (!currentSnap.exists()) {
    throw new Error("공지를 찾을 수 없습니다.");
  }
  
  const currentData = currentSnap.data() as Notice;
  
  // 롤백 실행
  await runTransaction(db, async (transaction) => {
    // 공지 복원
    transaction.update(noticeRef, {
      ...snapshot,
      updatedAt: serverTimestamp(),
      updatedBy: adminId,
    });
    
    // 히스토리 기록
    const historyRef = collection(db, "notices", noticeId, "history");
    const historyDocRef = doc(historyRef);
    transaction.set(historyDocRef, {
      action: 'rollback' as NoticeHistoryAction,
      before: {
        title: currentData.title,
        content: currentData.content,
        status: currentData.status,
      },
      after: {
        title: snapshot.title || currentData.title,
        content: snapshot.content || currentData.content,
        status: snapshot.status || currentData.status,
      },
      reason: reason || null,
      actorUid: adminId,
      actorRole: isSuperAdmin ? 'superAdmin' : 'admin',
      createdAt: serverTimestamp(),
    });
  });
}

