/**
 * 공지 생성/수정 Drawer 컴포넌트
 * 
 * 기능:
 * - 공지 ID로부터 사용
 * - 제목, 내용, 공식 여부, 노출 범위 입력
 * - 저장 기본 상태: draft
 */

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { doc, getDoc, updateDoc, collection, addDoc, Timestamp, serverTimestamp, runTransaction, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthProvider";
import { validateNotice, NOTICE_VALIDATION, getWarningMessage } from "@/utils/noticeValidation";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useIsAssociationAdmin } from "@/hooks/useIsAssociationAdmin";
import { useIsAssociationSuperAdmin } from "@/hooks/useIsAssociationSuperAdmin";
import { saveNoticeHistory } from "@/utils/noticeHistory";
import type { Notice, NoticeVisibility } from "@/types/notice";
import { safeToDate } from "@/utils/dateUtils";
import { evaluateEthics } from "@/lib/ethics/scoreEngine";
import { writeEthicsDecision } from "@/lib/firebase/writeEthics";
import { createApprovalRequest } from "@/lib/firebase/writeApproval";
import * as Sentry from "@sentry/react";
import { applyAutoGuard } from "@/lib/ethics/scoreEngine";
import { autoGuardFromSimulation } from "@/lib/guard/autoGuard";
import { useLatestPolicyRiskScore } from "@/lib/policy/useLatestPolicyRiskScore";

// 기본 Visibility 계산 헬퍼 (공지 시스템 표준 사용)
const FAR_PAST = Timestamp.fromDate(new Date('1970-01-01T00:00:00.000Z'));
const FAR_FUTURE = Timestamp.fromDate(new Date('2999-12-31T23:59:59.000Z'));

function calcVisibility(exposureStart?: Date | null, exposureEnd?: Date | null) {
  return {
    visibleFrom: exposureStart ? Timestamp.fromDate(exposureStart) : FAR_PAST,
    visibleUntil: exposureEnd ? Timestamp.fromDate(exposureEnd) : FAR_FUTURE,
  };
}

interface NoticeEditDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  associationId: string;
  noticeId?: string; // 수정 시 공지 ID
}

export function NoticeEditDrawer({
  isOpen,
  onClose,
  onSuccess,
  associationId,
  noticeId,
}: NoticeEditDrawerProps) {
  const { user } = useAuth();
  const { isAdmin: canPublish, loading: adminLoading } = useIsAssociationAdmin(associationId);
  const { isSuperAdmin, loading: superAdminLoading } = useIsAssociationSuperAdmin(associationId);
  const isEditMode = !!noticeId;

  // 기본 Drawer 상태 확인
  useEffect(() => {
    console.log("[NoticeEditDrawer] isOpen 상태:", isOpen, { associationId, noticeId });
  }, [isOpen, associationId, noticeId]);

    const latestRiskScore = useLatestPolicyRiskScore(associationId);

const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isOfficial, setIsOfficial] = useState(true); // 공식 기준 여부 (기본값: true)
  const [visibility, setVisibility] = useState<NoticeVisibility>("public"); // 노출 범위
  const [isPinned, setIsPinned] = useState(false);
  const [label, setLabel] = useState<"" | "필독" | "변경" | "대회">("");
  const [saveType, setSaveType] = useState<"draft" | "publish">("draft"); // 저장 타입
  const [publishMode, setPublishMode] = useState<"immediate" | "schedule">("immediate"); // 게시 모드 (즉시/예약)
  const [scheduledAt, setScheduledAt] = useState<Date | null>(null); // 예약 게시 시각
  const [exposureStart, setExposureStart] = useState<Date | null>(null); // 노출 시작 시각
  const [exposureEnd, setExposureEnd] = useState<Date | null>(null); // 노출 종료 시각
  const [hasExpiry, setHasExpiry] = useState(false); // 만료 여부 설정 여부
  const [expiresAt, setExpiresAt] = useState<Date | null>(null); // 공지 만료 시각
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<Error | null>(null); // 저장 실패 상태
  const [originalData, setOriginalData] = useState<{ title: string; content: string } | null>(null); // 변경 전 원본 데이터
  const [loaded, setLoaded] = useState(false); // 🔥 로드 완료 플래그 (중복 로드 방지)
  const [saveTimeoutId, setSaveTimeoutId] = useState<NodeJS.Timeout | null>(null); // 🔥 debounce용 timeout ID
  
  // 변경 전 원본
  const hasUnsavedChanges = () => {
    if (!originalData) {
      // 새로 생성 시 제목이나 내용이라도 입력되어 있으면 변경사항이 있음
      return title.trim().length > 0 || content.trim().length > 0;
    }
    // 수정 모드: 원본과 현재 값 비교
    return originalData.title.trim() !== title.trim() || originalData.content.trim() !== content.trim();
  };

  // Drawer 닫기 처리 (변경사항 확인)
  const handleClose = () => {
    if (hasUnsavedChanges() && !saving) {
      if (confirm("저장하지 않고 닫으시겠습니까? 변경사항이 있습니다. 정말 닫으시겠습니까?")) {
        onClose();
      }
    } else {
      onClose();
    }
  };
  // 🔥 수정 모드: 기존 데이터 로드 (무한 루프 방지 패턴)
  // ✅ 원칙: snapshot은 최초 1회만, 저장은 버튼에서만
  useEffect(() => {
    // Drawer가 닫히면 상태 초기화
    if (!isOpen) {
      setTitle("");
      setContent("");
      setIsOfficial(true);
      setVisibility("public");
      setIsPinned(false);
      setLabel("");
      setSaveType("draft");
      setPublishMode("immediate");
      setScheduledAt(null);
      setExposureStart(null);
      setExposureEnd(null);
      setHasExpiry(false);
      setExpiresAt(null);
      setSaveError(null);
      setOriginalData(null); // 원본 데이터도 초기화
      setLoaded(false); // 🔥 로드 플래그 초기화
      return;
    }
    
    // 새로 생성 모드면 원본 데이터 초기화
    if (!noticeId) {
      setOriginalData({ title: "", content: "" });
      setLoaded(true); // 🔥 로드 완료 (데이터 없음)
      return;
    }

    // 🔥 중복 로드 방지: 이미 로드했고 noticeId가 같으면 스킵
    // (isOpen이 true로 바뀌고 noticeId가 변경되지 않았으면 재로드 안 함)
    if (loaded && noticeId) {
      return;
    }

    // 수정 모드: 데이터 로드 (최초 1회만)
    const loadNotice = async () => {
      try {
        setLoading(true);
        setSaveError(null);
        // 서브컬렉션 사용 (기존 저장된 경로는 유지)
        const noticeRef = doc(db, `associations/${associationId}/notices/${noticeId}`);
        const noticeSnap = await getDoc(noticeRef);

        if (noticeSnap.exists()) {
          const data = noticeSnap.data();
          
          // 기본 필드 로드
          const loadedTitle = data.title || "";
          const loadedContent = data.content || "";
          setTitle(loadedTitle);
          setContent(loadedContent);
          // 변경 전 원본 데이터로 원본 데이터 설정
          setIsOfficial(data.isOfficial !== false);
          setVisibility(data.visibility || "public");
          setIsPinned(data.isPinned || false);
          setLabel(data.label || "");
          setSaveType(data.status === "published" || data.status === "scheduled" ? "publish" : "draft");
          
          // 예약 게시 모드 및 예약 시각 로드
          if (data.status === "scheduled" && data.scheduledAt) {
            setPublishMode("schedule");
            const scheduledDate = safeToDate(data.scheduledAt);
            setScheduledAt(scheduledDate);
          } else {
            setPublishMode("immediate");
            setScheduledAt(null);
          }
          
          // 만료 설정 로드
          if (data.expiresAt) {
            setHasExpiry(true);
            const expiryDate = safeToDate(data.expiresAt);
            setExpiresAt(expiryDate);
          } else {
            setHasExpiry(false);
            setExpiresAt(null);
          }
          
          // 노출 범위 로드 (visibleFrom/visibleUntil 또는 publishAt/endAt)
          if (data.visibleFrom || data.publishAt) {
            const startDate = data.visibleFrom?.toDate?.() || data.publishAt?.toDate?.();
            // FAR_PAST가 아니면 노출 시작 시각 설정
            if (startDate && startDate.getTime() > FAR_PAST.toDate().getTime() + 86400000) {
              setExposureStart(startDate);
            } else {
              setExposureStart(null);
            }
          } else {
            setExposureStart(null);
          }

          if (data.visibleUntil || data.endAt) {
            const endDate = data.visibleUntil?.toDate?.() || data.endAt?.toDate?.();
            // FAR_FUTURE가 아니면 노출 종료 시각 설정
            if (endDate && endDate.getTime() < FAR_FUTURE.toDate().getTime() - 86400000) {
              setExposureEnd(endDate);
            } else {
              setExposureEnd(null);
            }
          } else {
            setExposureEnd(null);
          }
          
          // 원본 데이터 저장
          setOriginalData({
            title: loadedTitle,
            content: loadedContent,
          });
        }
        setLoaded(true); // 🔥 로드 완료 플래그 설정
      } catch (error) {
        console.error("공지 로드 실패:", error);
        const toastEvent = new CustomEvent("showToast", {
          detail: { message: "공지를 불러오는 중 오류가 발생했습니다.", type: "error" },
        });
        window.dispatchEvent(toastEvent);
        setLoaded(true); // 🔥 에러 발생해도 로드 완료로 표시 (무한 재시도 방지)
      } finally {
        setLoading(false);
      }
    };

    loadNotice();
    // 🔥 의존성 고정: isOpen, noticeId, associationId만 (form state 제외)
  }, [isOpen, noticeId, associationId, loaded]);

  const handleSave = async () => {
    // 기본 함수 진입 확인
    console.log("기본 [handleSave] 함수 실행됨", {
      saveType,
      title: title.trim(),
      content: content.trim().substring(0, 50),
      canPublish,
      isButtonDisabled,
    });

    // 🔥 중복 실행 방지 (이중 방어)
    if (saving) {
      console.log("이미 [handleSave] 이미 저장 중입니다.");
      return;
    }

    // 🔥 debounce: 300ms 내 중복 호출 방지
    if (saveTimeoutId) {
      clearTimeout(saveTimeoutId);
      return; // 이미 대기 중인 저장 요청이 있으면 스킵
    }

    // Validation: 공지 검증 (기존 검증 유틸리티 사용)
    const validationResult = validateNotice(title, content);
    if (!validationResult.isValid) {
      const toastEvent = new CustomEvent("showToast", {
        detail: { message: validationResult.error || "입력값을 확인해주세요.", type: "error" },
      });
      window.dispatchEvent(toastEvent);
      return;
    }
    
    // trimmed 값 사용 (validation 이후)
    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();

    if (!user) {
      console.log("[handleSave] user 없음");
      const toastEvent = new CustomEvent("showToast", {
        detail: { message: "로그인이 필요합니다.", type: "error" },
      });
      window.dispatchEvent(toastEvent);
      return;
    }

    if (!associationId) {
      console.log("[handleSave] associationId 없음");
      const toastEvent = new CustomEvent("showToast", {
        detail: { message: "협회 정보를 찾을 수 없습니다.", type: "error" },
      });
      window.dispatchEvent(toastEvent);
      return;
    }

    // 기본 게시 권한 검사 (publish 경우만)
    if (saveType === "publish" && !canPublish) {
      const toastEvent = new CustomEvent("showToast", {
        detail: { message: "게시 권한이 없습니다.", type: "error" },
      });
      window.dispatchEvent(toastEvent);
      return;
    }

    // validation 이후 바로 setSaving(true) 실행
    setSaving(true);

    try {
      // 기본 게시 모드에 따른 status 설정
      let status: "draft" | "published" | "scheduled" = "draft";
      if (saveType === "publish") {
        status = publishMode === "schedule" ? "scheduled" : "published";
      }
      
      // 기본 예약 게시 시각 검증
      if (status === "scheduled" && !scheduledAt) {
        throw new Error("예약 게시 시각을 설정해주세요.");
      }
      
      if (status === "scheduled" && scheduledAt && scheduledAt <= new Date()) {
        throw new Error("예약 게시 시각은 현재 시각보다 이후여야 합니다.");
      }
      
      const now = Timestamp.now();

      // visibleFrom/visibleUntil 계산 (시스템 표준 사용)
      const { visibleFrom, visibleUntil } = calcVisibility(exposureStart, exposureEnd);

      // ===== STEP E3: 윤리 가드레일 로직 =====
      // 1) auditId 생성
      const auditId = window.crypto.randomUUID();

      // 2) before/after payload 구성
      let before: Record<string, any> | null = null;
      let after: Record<string, any> = {
        title: trimmedTitle,
        content: trimmedContent,
        status,
        isOfficial,
        visibility,
        isPinned,
      };

      // 수정 모드: 기존 데이터 로드 (가드레일 위해)
      if (isEditMode && noticeId) {
        // 수정 모드: 기존 데이터 로드 (가드레일 위해)
        const noticeRef = doc(db, `associations/${associationId}/notices/${noticeId}`);
        const beforeSnap = await getDoc(noticeRef);
        if (beforeSnap.exists()) {
          const beforeData = beforeSnap.data();
          before = {
            title: beforeData.title || "",
            content: beforeData.content || "",
            status: beforeData.status || "draft",
            isOfficial: beforeData.isOfficial ?? true,
            visibility: beforeData.visibility || "public",
            isPinned: beforeData.isPinned ?? false,
          };
        }
      }

      // 3) action 타입 설정
      const ethicsAction: "create" | "update" | "publish" = isEditMode ? "update" : "create";
      const finalAction = status === "published" ? "publish" : ethicsAction;

      // 4) role 설정
      const userRole: "admin" | "editor" | "viewer" = canPublish ? "admin" : "editor";

      // 5) 윤리 평가
      const { score, verdict: originalVerdict, reasons: originalReasons, signals } = evaluateEthics({
        tenantId: associationId,
        userId: user.uid,
        role: userRole,
        collection: "notices",
        docId: noticeId ?? "(new)",
        action: finalAction,
        before,
        after,
        // optional signals (현재는 없지만 향후 추가 예정)
        editCountLast10m: undefined,
        deleteRestoreLoopLast1h: undefined,
      });

      //  COMMIT 10: Auto-Guard 적용

      const guard = autoGuardFromSimulation({ riskScore: latestRiskScore });
      const { verdict, reasons } = applyAutoGuard(originalVerdict, originalReasons, guard);

      // 6) ethics 기록 (항상)
      await writeEthicsDecision({
        auditId,
        tenantId: associationId,
        collection: "notices",
        docId: noticeId ?? "(new)",
        action: finalAction,
        userId: user.uid,
        score,
        verdict,
        reasons,
        signals,
      });

      // 7) Sentry 컨텍스트 설정
      Sentry.setContext("audit", {
        auditId,
        collection: "notices",
        docId: noticeId ?? "(new)",
      });
      Sentry.setContext("ethics", {
        score,
        verdict,
        reasons: reasons.join(", "),
      });

      // 8) verdict 처리
      if (verdict === "block") {
        const toastEvent = new CustomEvent("showToast", {
          detail: {
            message: "윤리/가드레일 가드레일에 의해 차단되었습니다.",
            type: "error",
          },
        });
        window.dispatchEvent(toastEvent);
        setSaving(false);
        return;
      }

      if (verdict === "review_required") {
        await createApprovalRequest({
          tenantId: associationId,
          collection: "notices",
          docId: noticeId ?? undefined,
          action: finalAction,
          payload: after,
          before: before ?? undefined,
          auditId,
          ethicsScore: score,
          ethicsReasons: reasons,
          userId: user.uid,
        });

        const toastEvent = new CustomEvent("showToast", {
          detail: {
            message: "승인 요청으로 전송되었습니다. 관리자 승인이 필요합니다.",
            type: "info",
          },
        });
        window.dispatchEvent(toastEvent);
        setSaving(false);
        return;
      }

      // 9) allow면 기존 저장 로직 수행
      // ===== 윤리 가드레일 로직 끝=====

      let savedNoticeId: string;

      // 기본 단일 고정 정책: isPinned가 true면 기존 고정 공지 제거
      if (isPinned) {
        // 단일 고정 정책에 시스템으로 고정 공지 찾기
        const pinnedNoticesQuery = query(
          collection(db, `associations/${associationId}/notices`),
          where("isPinned", "==", true)
        );
        const pinnedSnap = await getDocs(pinnedNoticesQuery);
        
        // 현재 수정 중인 공지를 제외하고 모든 고정 공지 ID 추출
        const pinnedNoticeIds = pinnedSnap.docs
          .map((docSnap) => docSnap.id)
          .filter((id) => !isEditMode || id !== noticeId);
        
        // 단일 고정 정책으로 모든 고정 공지 제거 (SuperAdmin만 가능)
        if (pinnedNoticeIds.length > 0 && isSuperAdmin) {
          await runTransaction(db, async (transaction) => {
            for (const noticeIdToUnpin of pinnedNoticeIds) {
              const noticeRef = doc(db, `associations/${associationId}/notices/${noticeIdToUnpin}`);
              transaction.update(noticeRef, {
                isPinned: false,
                pinnedAt: null,
                pinnedBy: null,
                updatedAt: serverTimestamp(),
                updatedBy: user.uid,
              });
              
              // 히스토리 기록 (unpin)
              const historyRef = collection(db, `associations/${associationId}/notices/${noticeIdToUnpin}/history`);
              const historyDocRef = doc(historyRef);
              transaction.set(historyDocRef, {
                action: 'unpin',
                after: {
                  title: "", // 빈 값 (pinned 변경만 기록)
                  content: '',
                  status: '',
                },
                actorUid: user.uid,
                actorRole: 'superAdmin',
                createdAt: serverTimestamp(),
              });
            }
          });
        }
      }

      // 수정 모드: 기존 문서 업데이트, 새로 생성 모드: 새 문서 생성
      if (isEditMode && noticeId) {
        // 히스토리 타입 (업데이트 시 기존 데이터 참조)
        const noticeRef = doc(db, `associations/${associationId}/notices/${noticeId}`);
        const beforeSnap = await getDoc(noticeRef);
        
        if (beforeSnap.exists()) {
          const beforeData = beforeSnap.data() as Notice;
          // 상태 변경에 따른 action 설정
          // ?곹깭 蹂寃쎌뿉 ?곕Ⅸ action 寃곗젙
          let action: 'create' | 'update' | 'request' | 'approve' | 'reject' | 'schedule' | 'pin' | 'unpin' | 'rollback' = 'update';
          const beforeStatus = beforeData.status;
          const afterStatus = status as string;
          
          // 기본 pinned 변경 여부 (SuperAdmin만)
          if (beforeData.isPinned !== isPinned && isSuperAdmin) {
            action = isPinned ? 'pin' : 'unpin';
          } else if (beforeStatus === 'draft' && afterStatus === 'pending') {
            action = 'request';
          } else if (beforeStatus === 'pending' && afterStatus === 'published') {
            action = 'approve';
          } else if (beforeStatus === 'pending' && afterStatus === 'rejected') {
            action = 'reject';
          } else if (afterStatus === 'scheduled') {
            action = 'schedule';
          }
          
          // 히스토리 타입 (업데이트) - pinned 변경만 별도 기록
          const actorRole = isSuperAdmin ? 'superAdmin' : 'admin';
          if (beforeData.isPinned !== isPinned && isSuperAdmin) {
            // pinned 변경만 기록 (title/content/status는 빈 값)
            await saveNoticeHistory(
              noticeId,
              action,
              {
                title: '',
                content: '',
                status: '',
              },
              user.uid,
              'superAdmin'
            );
          } else {
            // 일반 업데이트 기록
            await saveNoticeHistory(
              noticeId,
              action,
              {
                title: title.trim(),
                content: content.trim(),
                status,
              },
              user.uid,
              actorRole,
              {
                title: beforeData.title,
                content: beforeData.content,
                status: beforeData.status,
              }
            );
          }
        }

        // 수정: updateDoc 사용
        const updateData: any = {
          title: title.trim(),
          content: content.trim(),
          summary: content.trim().substring(0, 150),
          isPinned,
          label: label || null,
          isOfficial,
          visibility,
          status,
          visibleFrom, // 시스템 표준 사용 필드
          visibleUntil, // 시스템 표준 사용 필드
          updatedAt: serverTimestamp(),
          updatedBy: user.uid,
        };
        
        // 기본 pinned 변경시 pinnedAt, pinnedBy 필드 설정 (SuperAdmin만)
        if (isSuperAdmin) {
          if (isPinned) {
            updateData.pinnedAt = serverTimestamp();
            updateData.pinnedBy = user.uid;
          } else {
            // 기존 데이터 확인
            const currentData = beforeSnap.data();
            if (currentData?.isPinned) {
              // unpin 시 null로 설정
              updateData.pinnedAt = null;
              updateData.pinnedBy = null;
            }
          }
        }
        
        // 기본 만료 설정 필드 추가
        if (hasExpiry && expiresAt) {
          updateData.expiresAt = Timestamp.fromDate(expiresAt);
        } else {
          updateData.expiresAt = null;
        }
        
        await updateDoc(noticeRef, updateData);
        savedNoticeId = noticeId;
      } else {
        // 새로 생성: addDoc 사용 (자동 ID 생성) - 서브컬렉션 사용
        const noticesRef = collection(db, `associations/${associationId}/notices`);
        const createData: any = {
          title: title.trim(),
          content: content.trim(),
          summary: content.trim().substring(0, 150),
          isPinned,
          label: label || null,
          isOfficial,
          visibility,
          status,
          visibleFrom, // 시스템 표준 사용 필드
          visibleUntil, // 시스템 표준 사용 필드
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          createdBy: user.uid,
          updatedBy: user.uid,
        };
        
        // 기본 pinned 필드 설정 (SuperAdmin만)
        if (isPinned && isSuperAdmin) {
          createData.pinnedAt = serverTimestamp();
          createData.pinnedBy = user.uid;
        }
        
        const docRef = await addDoc(noticesRef, createData);
        savedNoticeId = docRef.id;
        
        // 히스토리 타입 (생성)
        const actorRole = isSuperAdmin ? 'superAdmin' : 'admin';
        let historyAction: 'create' | 'pin' = 'create';
        if (isPinned && isSuperAdmin) {
          // pinned도 함께 생성한 경우
          historyAction = 'pin';
        }
        
        await saveNoticeHistory(
          savedNoticeId,
          historyAction === 'pin' ? 'pin' : 'create',
          {
            title: title.trim(),
            content: content.trim(),
            status,
          },
          user.uid,
          actorRole
        );
      }

      // 공식 로그 기록 (성공 또는 실패 상관없이 저장으로 처리)

      try {
        const logsRef = collection(db, `associations/${associationId}/audit_logs`);
        await addDoc(logsRef, {
          action: saveType === "publish" ? "NOTICE_PUBLISHED" : isEditMode ? "NOTICE_UPDATED" : "NOTICE_CREATED",
          noticeId: savedNoticeId,
          adminId: user.uid,
          adminEmail: user.email || "없음",
          title: title.trim(),
          status,
          isOfficial,
          visibility,
          timestamp: serverTimestamp(),
        });
      } catch (logError) {
        console.error("로그 기록 실패:", logError);
        // 로그 실패해도 저장으로 처리
      }

      // 성공 메시지 표시 (Toast 방식으로 표시하도록 대화상자 발생)
      const successMessage = saveType === "publish"
        ? "공지가 게시되었습니다."
        : isEditMode
        ? "공지가 수정되었습니다."
        : "공지가 생성되었습니다."

      // Toast 대화상자 발생 (외부 컴포넌트에서 처리)
      const toastEvent = new CustomEvent("showToast", {
        detail: { message: successMessage, type: "success" },
      });
      window.dispatchEvent(toastEvent);

      // 성공 처리
      setSaveError(null); // 에러 상태 초기화
      // Drawer 닫기 및 목록 갱신
      setOriginalData(null); // 저장 성공 후 원본 데이터 초기화
      setLoaded(false); // 🔥 로드 플래그 초기화 (다음 열 때 다시 로드)
      
      // 🔥 onSuccess 호출 (부모 컴포넌트에서 목록 새로고침)
      onSuccess?.();
      
      // 🔥 onClose는 약간의 지연 후 호출 (onSuccess 완료 대기)
      setTimeout(() => {
        onClose();
      }, 100);
    } catch (error) {
      // 기본 에러 처리 (모든 에러 경로에서 실행)
      console.error("[handleSave] 공지 저장 실패:", error);
      
      const errorMessage = error instanceof Error 
        ? error.message 
        : "저장 중 오류가 발생했습니다."
      
      // 기본 실패 상태 설정 (안전한 방식 사용)
      setSaveError(error instanceof Error ? error : new Error(errorMessage));
      
      // publish 실패 시 자동 복구 시도 (안전한 방식 사용)
      // 사용자가 "임시 저장으로 전환" 버튼을 눌러 복구하도록 변경하도록 함
      const toastEvent = new CustomEvent("showToast", {
        detail: { message: errorMessage, type: "error" },
      });
      window.dispatchEvent(toastEvent);
    } finally {
      // 항상 실행: 어떤 경우에도 saving 상태 변경 (성공/실패/에러 모두)
      setSaving(false);
      // 🔥 debounce timeout 정리
      if (saveTimeoutId) {
        clearTimeout(saveTimeoutId);
        setSaveTimeoutId(null);
      }
      console.log("[handleSave] 저장 상태 변경 종료 (finally)");
    }
  };

  // 🔥 cleanup: 컴포넌트 언마운트 시 timeout 정리
  useEffect(() => {
    return () => {
      if (saveTimeoutId) {
        clearTimeout(saveTimeoutId);
      }
    };
  }, [saveTimeoutId]);

  // 기본 canPublish 및 버튼 disabled 조건 확인 (디버그 이전)
  const isButtonDisabled = saving || loading || adminLoading || (saveType === "publish" && !canPublish) || !!saveError;
  const hasTitle = title.trim().length > 0;
  const hasContent = content.trim().length > 0;
  
  // 기본 로그 (개발용으로 사용 - title, content는 state로부터 가져와서 사용)
  if (process.env.NODE_ENV === 'development') {
    console.log("[NoticeEditDrawer] 버튼 상태 확인:", {
      title: title.trim(),
      content: content.trim().substring(0, 50) + '...',
      status: saveType,
      isAdmin: canPublish,
      isSuperAdmin,
      canPublish,
      adminLoading,
      superAdminLoading,
      associationId,
      userUid: user?.uid,
      saveType,
      saving,
      loading,
      hasTitle,
      hasContent,
      isButtonDisabled,
      disabledReason: {
        saving,
        loading,
        adminLoading,
        publishWithoutPermission: saveType === "publish" && !canPublish,
      },
    });
  }

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[10001] bg-black/40 flex justify-end"
      onClick={(e) => {
        // Overlay 클릭 시 Drawer 닫기 (변경사항 확인)
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      {/* Drawer Wrapper (Portal로 App 외부 포털에 렌더링) */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:w-[480px] h-[100dvh] bg-white flex flex-col shadow-xl relative"
        style={{ pointerEvents: 'auto' }}
      >
        {/* 헤더 (고정) */}
        <div className="shrink-0 px-4 py-3 border-b flex justify-between items-center bg-white">
          <h2 className="text-xl font-bold text-gray-900">
            {isEditMode ? "공지 수정" : "새 공지 생성"}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="닫기"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* 내용 (스크롤 가능) */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-gray-500">로딩 중...</p>
            </div>
          ) : (
            <>
              {/* 제목 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    제목 <span className="text-red-500">*</span>
                  </label>
                  <span className={`text-xs ${title.trim().length > NOTICE_VALIDATION.TITLE.MAX_LENGTH ? 'text-red-500' : 'text-gray-500'}`}>
                    {title.trim().length} / {NOTICE_VALIDATION.TITLE.MAX_LENGTH}??                  </span>
                </div>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={NOTICE_VALIDATION.TITLE.MAX_LENGTH}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="공지 제목을 입력해주세요"
                />
                {(() => {
                  const warning = getWarningMessage('title', title.trim().length);
                  return warning ? <p className="text-xs text-amber-600 mt-1">{warning}</p> : null;
                })()}
              </div>

              {/* 내용 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    내용 <span className="text-red-500">*</span>
                  </label>
                  <span className={`text-xs ${content.trim().length > NOTICE_VALIDATION.CONTENT.MAX_LENGTH ? 'text-red-500' : 'text-gray-500'}`}>
                    {content.trim().length.toLocaleString()} / {NOTICE_VALIDATION.CONTENT.MAX_LENGTH.toLocaleString()}??                  </span>
                </div>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={12}
                  maxLength={NOTICE_VALIDATION.CONTENT.MAX_LENGTH}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="공지 내용을 입력해주세요"
                />
                {(() => {
                  const warning = getWarningMessage('content', content.trim().length);
                  return warning ? <p className="text-xs text-amber-600 mt-1">{warning}</p> : null;
                })()}
              </div>

              {/* 설정 */}
              <div className="space-y-4 border-t pt-4">
                {/* 공식 여부 */}
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={isOfficial}
                      onChange={(e) => setIsOfficial(e.target.checked)}
                      className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-700">공식 기준 공지</span>
                      <p className="text-xs text-gray-500 mt-1">
                        검사 시 "공식 기준" 표시가 표시되며, 공식 기록으로 남습니다.
                      </p>
                    </div>
                  </label>
                </div>

                {/* 상단 고정 (SuperAdmin만) */}
                {isSuperAdmin && (
                  <div className="border-t pt-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={isPinned}
                        onChange={(e) => setIsPinned(e.target.checked)}
                        className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-700">상단에 고정 표시</span>
                        <p className="text-xs text-gray-500 mt-1">
                          상단 고정은 최종 관리자만 설정할 수 있습니다.
                        </p>
                      </div>
                    </label>
                  </div>
                )}

                {/* 라벨 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    라벨 (선택)
                  </label>
                  <select
                    value={label}
                    onChange={(e) => setLabel(e.target.value as "" | "필독" | "변경" | "대회")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">없음</option>
                    <option value="필독">필독</option>
                    <option value="변경">변경</option>
                    <option value="대회">대회</option>
                  </select>
                </div>

                {/* 노출 범위 */}
                <div className="border-t pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    노출 범위
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="public"
                        checked={visibility === "public"}
                        onChange={(e) => setVisibility(e.target.value as NoticeVisibility)}
                        className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-700">전체 공개</span>
                        <p className="text-xs text-gray-500 mt-1">
                          로그인 여부와 관계없이 모든 사용자에게 공개됩니다.
                        </p>
                      </div>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="member"
                        checked={visibility === "member"}
                        onChange={(e) => setVisibility(e.target.value as NoticeVisibility)}
                        className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-700">회원만</span>
                        <p className="text-xs text-gray-500 mt-1">
                          로그인한 회원에게만 공개됩니다.
                        </p>
                      </div>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="admin"
                        checked={visibility === "admin"}
                        onChange={(e) => setVisibility(e.target.value as NoticeVisibility)}
                        className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-700">관리자만</span>
                        <p className="text-xs text-gray-500 mt-1">
                          관리자만 접근할 수 있으며, 일반 사용자에게는 노출되지 않습니다.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* UX 경고 메시지 (관리자 참고용) */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  임시 저장 공지는 공식 기록으로 저장됩니다. 게시 시 수정 시각이 표시됩니다.
                </p>
              </div>

              {/* 저장 타입 상태 (관리자만 게시 가능) */}
              <fieldset className="border-t pt-4 space-y-3">
                <legend className="text-sm font-medium text-gray-700 mb-3">
                  저장 타입 상태
                </legend>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="draft"
                      checked={saveType === "draft"}
                      onChange={(e) => setSaveType(e.target.value as "draft" | "publish")}
                      className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-700">임시 저장</span>
                      <p className="text-xs text-gray-500 mt-1">
                        아직 공개되지 않습니다. 이후 관리자 페이지에서 게시할 수 있습니다.
                      </p>
                    </div>
                  </label>
                  <label className={`flex items-center ${!canPublish ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <input
                      type="radio"
                      value="publish"
                      checked={saveType === "publish"}
                      onChange={(e) => setSaveType(e.target.value as "draft" | "publish")}
                      disabled={!canPublish}
                      className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-700">게시</span>
                      <p className="text-xs text-gray-500 mt-1">
                        published 상태로 저장되며 즉시 공개됩니다.
                        {!canPublish && (
                          <span className="block text-red-500 mt-1">
                            이미 관리자 권한이 필요합니다.
                          </span>
                        )}
                      </p>
                    </div>
                  </label>
                </div>
                
                {/* 게시 불가 사유 표시 (상세) */}
                {saveType === "publish" && !canPublish && (
                  <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-600 mt-3">
                    <p className="font-medium mb-2">게시할 수 없습니다:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {!hasTitle && <li>제목 입력 필요</li>}
                      {!hasContent && <li>내용 입력 필요</li>}
                      {(!canPublish || adminLoading) && <li>관리자 권한 없음</li>}
                    </ul>
                  </div>
                )}
              </fieldset>
            </>
          )}
        </div>

        {/* Footer (하단 고정 - 상태별 버튼) */}
        <div
          className="shrink-0 border-t bg-white px-4 py-3"
          style={{
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          }}
        >
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 h-11 border border-gray-300 rounded-md bg-white text-gray-700 font-medium hover:bg-gray-50"
            >
              취소
            </button>
            
            {/* 상태별 버튼 (최적화된 UX) */}
            {saveType === "draft" && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!saving && !loading) {
                    handleSave();
                  }
                }}
                disabled={saving || loading}
                className="flex-1 h-11 rounded-md font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: saving || loading ? '#9ca3af' : '#374151',
                  color: 'white',
                }}
              >
                {saving ? (
                  <span className="flex items-center justify-center gap-2">
                    <LoadingSpinner size="sm" className="text-white" />
                    저장 중...
                  </span>
                ) : (
                  "임시 저장"
                )}
              </button>
            )}
            
            {saveType === "publish" && (
              <button
                type="button"
                onClick={(e) => {
                  console.log("기본 [게시하기 버튼] 클릭됨", {
                    isButtonDisabled,
                    canPublish,
                    saveType,
                  });
                  e.preventDefault();
                  e.stopPropagation();
                  if (!isButtonDisabled) {
                    handleSave();
                  } else {
                    console.log("[게시하기 버튼] disabled 상태로 실행 안됨");
                  }
                }}
                disabled={isButtonDisabled}
                className="flex-1 h-11 rounded-md font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: isButtonDisabled ? '#9ca3af' : '#2563eb',
                  color: 'white',
                  pointerEvents: 'auto',
                  zIndex: 10002,
                }}
              >
                {saving ? (
                  <span className="flex items-center justify-center gap-2">
                    <LoadingSpinner size="sm" className="text-white" />
                    저장 중...
                  </span>
                ) : (
                  "게시하기"
                )}
              </button>
            )}
          </div>
          
          {/* 버튼 비활성화 사유 표시 (상세) */}
          {isButtonDisabled && !saving && !loading && !saveError && (
            <div className="text-xs text-red-500 mt-2 px-1">
              {adminLoading && "권한 확인 중입니다..."}
              {!adminLoading && saveType === "publish" && !canPublish && (
                "이미 게시하려면 관리자 권한과 제목 입력이 필요합니다."
              )}
            </div>
          )}
          
          {/* 기본 저장 실패 에러 표시 (최적화된 방식) */}
          {saveError && (
            <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="text-sm font-medium text-red-800 mb-1">
                저장 실패
              </div>
              <div className="text-xs text-red-600">
                {saveError.message || "저장 중 오류가 발생했습니다."}
              </div>
              {saveError.message?.includes("permission") || saveError.message?.includes("권한") ? (
                <div className="text-xs text-red-500 mt-1">
                  다시 관리자 권한을 확인하거나 임시 저장을 시도해주세요.
                </div>
              ) : null}
              <button
                onClick={() => {
                  setSaveError(null);
                  setSaveType("draft"); // draft로 전환
                }}
                className="mt-2 text-xs text-blue-600 hover:text-blue-800 underline"
              >
                임시 저장으로 전환
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}






