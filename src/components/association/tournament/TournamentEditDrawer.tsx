/**
 * 대회 등록/수정 Drawer 컴포넌트 (공지 패턴 기반)
 * 
 * 원칙:
 * - 행정 모드에서 사용
 * - 제목, 본문, 일정, 장소 입력
 * - 저장 시 기본 상태: draft
 * - 공지 EditDrawer 패턴 그대로 복제
 */

import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { doc, getDoc, updateDoc, collection, addDoc, Timestamp, serverTimestamp, runTransaction, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthProvider";
import { validateTournament, TOURNAMENT_VALIDATION, getWarningMessage } from "@/utils/tournamentValidation";
import { validateAllPeriods, suggestNextDateField, type TournamentDateValidation } from "@/utils/tournamentDateValidation";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useIsAssociationAdmin } from "@/hooks/useIsAssociationAdmin";
import { useIsAssociationOwner } from "@/hooks/useIsAssociationOwner";
import { setAssociationAdminClaims, checkCurrentUserClaims } from "@/utils/setAdminClaims";
import { useIsAssociationSuperAdmin } from "@/hooks/useIsAssociationSuperAdmin";
import type { Tournament, TournamentVisibility } from "@/types/tournament";
import { safeToDate } from "@/utils/dateUtils";
import { TournamentAgeRuleForm, type AgeRule } from "./TournamentAgeRuleForm";

interface TournamentEditDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (tournamentId?: string) => void; // 🔥 자동화 코어: 생성된 대회 ID 전달
  associationId: string;
  tournamentId?: string; // 수정 모드일 때
  fromNoticeId?: string; // 🔥 공지에서 대회 생성 시 공지 ID
}

export function TournamentEditDrawer({
  isOpen,
  onClose,
  onSuccess,
  associationId,
  tournamentId,
  fromNoticeId,
}: TournamentEditDrawerProps) {
  const { user, loading: authLoading } = useAuth();
  const { isOwner, loading: ownerLoading } = useIsAssociationOwner(associationId);
  const { isAdmin: canPublish, loading: adminLoading } = useIsAssociationAdmin(associationId);
  const { isSuperAdmin, loading: superAdminLoading } = useIsAssociationSuperAdmin(associationId);
  
  // 🔥 관리자 판별: ownerUid 기준 (우선) 또는 members/{uid}.role === "admin" (하위 호환)
  const canPublishTournament = isOwner || canPublish;
  const adminLoadingState = ownerLoading || adminLoading || authLoading;

  // 🔥 디버깅 로그
  useEffect(() => {
    console.log("[TournamentEditDrawer] 권한 확인 상태:", {
      associationId,
      userUid: user?.uid,
      user: user,
      authLoading,
      isOwner,
      ownerLoading,
      canPublish,
      adminLoading,
      canPublishTournament,
      adminLoadingState,
    });
  }, [associationId, user, user?.uid, authLoading, isOwner, ownerLoading, canPublish, adminLoading, canPublishTournament, adminLoadingState]);
  const isEditMode = !!tournamentId;

  useEffect(() => {
    console.log("[TournamentEditDrawer] isOpen 상태:", isOpen, { associationId, tournamentId });
  }, [isOpen, associationId, tournamentId]);

  // 기본 필드 (공지와 동일)
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isOfficial, setIsOfficial] = useState(true);
  const [visibility, setVisibility] = useState<TournamentVisibility>("public");
  const [isPinned, setIsPinned] = useState(false);
  const [saveType, setSaveType] = useState<"draft" | "publish">("draft");
  const [settingClaims, setSettingClaims] = useState(false);
  const [claimsChecked, setClaimsChecked] = useState(false);
  const [showPublishConfirm, setShowPublishConfirm] = useState(false); // 🔥 게시 확인 모달 상태
  
  // 대회 전용 필드
  const [dateStart, setDateStart] = useState<Date | null>(null);
  const [dateEnd, setDateEnd] = useState<Date | null>(null);
  const [venue, setVenue] = useState("");
  const [feeAmount, setFeeAmount] = useState<number | null>(null);
  const [registrationOpen, setRegistrationOpen] = useState(true);
  const [ageRule, setAgeRule] = useState<AgeRule | undefined>(undefined);
  const [tournamentType, setTournamentType] = useState<"OPEN" | "U" | "OVER" | undefined>(undefined);
  
  // 🔥 신청·선수 수정·검수·확정 5단계 시간축 UI
  const [registrationStartDate, setRegistrationStartDate] = useState<string>("");
  const [registrationEndDate, setRegistrationEndDate] = useState<string>("");
  const [rosterEditStartDate, setRosterEditStartDate] = useState<string>("");
  const [rosterEditEndDate, setRosterEditEndDate] = useState<string>("");
  const [reviewStartDate, setReviewStartDate] = useState<string>("");
  const [reviewEndDate, setReviewEndDate] = useState<string>("");
  const [drawDate, setDrawDate] = useState<string>("");
  const [drawDatePublic, setDrawDatePublic] = useState<boolean>(true);
  
  // 🔥 테스트 모드 (조 추첨 테스트용)
  const [testMode, setTestMode] = useState<boolean>(false);
  
  // 상태 관리
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<Error | null>(null);
  const [originalData, setOriginalData] = useState<{ title: string; content: string; venue: string } | null>(null);
  
  // 🔥 날짜 검증 (useMemo로 무한 루프 방지)
  const dateValidation = useMemo(() => {
    return validateAllPeriods(
      dateStart,
      dateEnd,
      registrationStartDate,
      registrationEndDate,
      rosterEditStartDate,
      rosterEditEndDate,
      reviewStartDate,
      reviewEndDate,
      drawDate,
      testMode // 🔥 테스트 모드 전달
    );
  }, [dateStart, dateEnd, registrationStartDate, registrationEndDate, rosterEditStartDate, rosterEditEndDate, reviewStartDate, reviewEndDate, drawDate, testMode]);
  
  // 🔥 다음 입력 필드 제안 (5단계)
  const suggestedField = suggestNextDateField(
    dateStart,
    dateEnd,
    registrationStartDate,
    registrationEndDate,
    rosterEditStartDate,
    rosterEditEndDate,
    reviewStartDate,
    reviewEndDate,
    drawDate
  );

  // 변경사항 감지
  const hasUnsavedChanges = () => {
    if (!originalData) {
      return title.trim().length > 0 || content.trim().length > 0 || venue.trim().length > 0;
    }
    return (
      originalData.title.trim() !== title.trim() ||
      originalData.content.trim() !== content.trim() ||
      originalData.venue.trim() !== venue.trim()
    );
  };

  // Drawer 닫기 처리
  const handleClose = () => {
    if (hasUnsavedChanges() && !saving) {
      if (confirm("저장하지 않은 변경사항이 있습니다. 정말 닫으시겠습니까?")) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  // 수정 모드일 때 기존 데이터 로드
  useEffect(() => {
    if (!isOpen) {
      // 상태 초기화
      setTitle("");
      setContent("");
      setIsOfficial(true);
      setVisibility("public");
      setIsPinned(false);
      setSaveType("draft");
      setDateStart(null);
      setDateEnd(null);
      setVenue("");
      setFeeAmount(null);
      setRegistrationOpen(true);
      setAgeRule(undefined);
      setTournamentType(undefined);
      setRegistrationStartDate("");
      setRegistrationEndDate("");
      setRosterEditStartDate("");
      setRosterEditEndDate("");
      setReviewStartDate("");
      setReviewEndDate("");
      setDrawDate("");
      setDrawDatePublic(true);
      setSaveError(null);
      setOriginalData(null);
      return;
    }
    
    if (!tournamentId && !fromNoticeId) {
      setOriginalData({ title: "", content: "", venue: "" });
      return;
    }

    // 🔥 공지에서 대회 생성 시: 공지 데이터 로드
    if (fromNoticeId && !tournamentId) {
      const loadNotice = async () => {
        try {
          setLoading(true);
          const noticeRef = doc(db, `associations/${associationId}/notices/${fromNoticeId}`);
          const noticeSnap = await getDoc(noticeRef);

          if (noticeSnap.exists()) {
            const noticeData = noticeSnap.data();
            
            // 공지 내용을 폼에 자동 주입
            setTitle(noticeData.title || "");
            setContent(noticeData.content || "");
            
            // feePolicy가 있으면 참가비 필드에 반영
            if (noticeData.feePolicy) {
              const fee = noticeData.feePolicy as {
                baseFee: number;
                baseTeamCount: number;
                extraFeePerTeam: number;
              };
              // 기본 참가비는 baseFee로 설정 (추가 계산은 나중에)
              setFeeAmount(fee.baseFee);
            }
            
            // 공지의 공식 여부 반영
            setIsOfficial(noticeData.isOfficial !== false);
            
            // (선택) 장소 힌트 파생 (공지 본문에서 장소 추출 시도)
            // 예: "장소: 마들스타디움" 같은 패턴이 있으면 자동 추출
            const content = noticeData.content || "";
            const placeMatch = content.match(/장소[:\s]+([^\n]+)/i) || 
                              content.match(/경기장[:\s]+([^\n]+)/i) ||
                              content.match(/위치[:\s]+([^\n]+)/i);
            if (placeMatch && placeMatch[1]) {
              setVenue(placeMatch[1].trim());
            }
            
            // (선택) 기간 파생 (공지 본문에서 날짜 추출 시도)
            // 예: "2026년 3월 15일 ~ 3월 17일" 같은 패턴
            const dateMatch = content.match(/(\d{4})[년\s]*(\d{1,2})[월\s]*(\d{1,2})[일\s]*[~-]\s*(\d{1,2})[월\s]*(\d{1,2})[일]/);
            if (dateMatch) {
              const year = parseInt(dateMatch[1]);
              const startMonth = parseInt(dateMatch[2]);
              const startDay = parseInt(dateMatch[3]);
              const endMonth = parseInt(dateMatch[4]);
              const endDay = parseInt(dateMatch[5]);
              
              const startDate = new Date(year, startMonth - 1, startDay);
              const endDate = new Date(year, endMonth - 1, endDay);
              
              if (!isNaN(startDate.getTime())) setDateStart(startDate);
              if (!isNaN(endDate.getTime())) setDateEnd(endDate);
            }
            
            setOriginalData({
              title: noticeData.title || "",
              content: noticeData.content || "",
              venue: placeMatch?.[1]?.trim() || "",
            });
          }
        } catch (error) {
          console.error("공지 로드 오류:", error);
        } finally {
          setLoading(false);
        }
      };
      
      loadNotice();
      return;
    }

    const loadTournament = async () => {
      try {
        setLoading(true);
        setSaveError(null);
        const tournamentRef = doc(db, `associations/${associationId}/tournaments/${tournamentId}`);
        const tournamentSnap = await getDoc(tournamentRef);

        if (tournamentSnap.exists()) {
          const data = tournamentSnap.data();
          
          const loadedTitle = data.title || "";
          const loadedContent = data.content || "";
          const loadedVenue = data.venue || "";
          
          setTitle(loadedTitle);
          setContent(loadedContent);
          setVenue(loadedVenue);
          setOriginalData({ title: loadedTitle, content: loadedContent, venue: loadedVenue });
          
          setIsOfficial(data.isOfficial !== false);
          setVisibility(data.visibility || "public");
          setIsPinned(data.isPinned || false);
          
          // adminStatus 체크 (공지 패턴과 동일)
          const adminStatus = data.adminStatus || data.status;
          setSaveType(adminStatus === "published" ? "publish" : "draft");
          
          // 대회 전용 필드
          if (data.dateStart) {
            const startDate = safeToDate(data.dateStart);
            setDateStart(startDate);
          }
          if (data.dateEnd) {
            const endDate = safeToDate(data.dateEnd);
            setDateEnd(endDate);
          }
          
          setFeeAmount(data.feeAmount || null);
          setRegistrationOpen(data.registrationOpen !== false);
          
          // 🔥 연령 기준 로드
          if (data.ageRule) {
            setAgeRule(data.ageRule as AgeRule);
          } else {
            setAgeRule(undefined);
          }
          
          // 🔥 대회 유형 로드
          if (data.tournamentType) {
            setTournamentType(data.tournamentType);
          } else if (data.ageRule) {
            // ageRule로부터 자동 추론
            setTournamentType(data.ageRule.type === "OPEN" ? "OPEN" : data.ageRule.type === "U" ? "U" : "OVER");
          }
          
          // 🔥 신청·선수 수정·검수·확정 기간 로드
          if (data.registrationPeriod) {
            setRegistrationStartDate(data.registrationPeriod.startDate || "");
            setRegistrationEndDate(data.registrationPeriod.endDate || "");
          }
          if (data.rosterEditPeriod) {
            setRosterEditStartDate(data.rosterEditPeriod.startDate || "");
            setRosterEditEndDate(data.rosterEditPeriod.endDate || "");
          }
          if (data.reviewPeriod) {
            setReviewStartDate(data.reviewPeriod.startDate || "");
            setReviewEndDate(data.reviewPeriod.endDate || "");
          }
          if (data.drawDate) {
            setDrawDate(data.drawDate.date || "");
            setDrawDatePublic(data.drawDate.isPublic !== false);
          }
        }
      } catch (error) {
        console.error("대회 로드 오류:", error);
        const toastEvent = new CustomEvent("showToast", {
          detail: { message: "대회를 불러오는 중 오류가 발생했습니다.", type: "error" },
        });
        window.dispatchEvent(toastEvent);
      } finally {
        setLoading(false);
      }
    };

    loadTournament();
  }, [isOpen, tournamentId, associationId]);

  const handleSave = async () => {
    console.log('🔥 [handleSave] 함수 실행됨', {
      saveType,
      title: title.trim(),
      content: content.trim().substring(0, 50),
      canPublishTournament,
      showPublishConfirm,
    });

    // 🔥 게시 확인 모달 (UX 보호 장치)
    // showPublishConfirm이 false이면 모달을 띄우고, true이면 실제 저장 진행
    if (saveType === "publish") {
      if (!showPublishConfirm) {
        setShowPublishConfirm(true);
        return; // 모달을 띄우고 대기
      }
      // showPublishConfirm이 true이면 모달에서 확인 버튼을 눌렀다는 의미 → 실제 저장 진행
      setShowPublishConfirm(false); // 저장 시작 전 모달 닫기
    }

    if (saving) {
      console.log('⚠️ [handleSave] 이미 저장 중입니다.');
      return;
    }

    // ✅ Validation: 대회 검증
    const validationResult = validateTournament(title, content, venue);
    if (!validationResult.isValid) {
      const toastEvent = new CustomEvent("showToast", {
        detail: { message: validationResult.error || "입력값을 확인해주세요.", type: "error" },
      });
      window.dispatchEvent(toastEvent);
      return;
    }
    
    // 대회 전용 필드 검증
    if (!dateStart) {
      const toastEvent = new CustomEvent("showToast", {
        detail: { message: "대회 시작일을 선택해주세요.", type: "error" },
      });
      window.dispatchEvent(toastEvent);
      return;
    }
    
    if (!dateEnd) {
      const toastEvent = new CustomEvent("showToast", {
        detail: { message: "대회 종료일을 선택해주세요.", type: "error" },
      });
      window.dispatchEvent(toastEvent);
      return;
    }
    
    if (dateEnd < dateStart) {
      const toastEvent = new CustomEvent("showToast", {
        detail: { message: "종료일은 시작일 이후여야 합니다.", type: "error" },
      });
      window.dispatchEvent(toastEvent);
      return;
    }

    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();
    const trimmedVenue = venue.trim();

    if (!user) {
      const toastEvent = new CustomEvent("showToast", {
        detail: { message: "로그인이 필요합니다.", type: "error" },
      });
      window.dispatchEvent(toastEvent);
      return;
    }

    if (!associationId) {
      const toastEvent = new CustomEvent("showToast", {
        detail: { message: "협회 정보를 찾을 수 없습니다.", type: "error" },
      });
      window.dispatchEvent(toastEvent);
      return;
    }

    // 🔥 권한 체크는 setSaving(true) 전에 수행 (로딩 상태 방지)
    if (saveType === "publish" && !canPublishTournament) {
      const toastEvent = new CustomEvent("showToast", {
        detail: { message: "게시 권한이 없습니다. 임시 저장을 시도해주세요.", type: "error" },
      });
      window.dispatchEvent(toastEvent);
      // ✅ early return이므로 setSaving(false) 불필요 (아직 setSaving(true) 호출 전)
      return;
    }

    // 🔥 접수 진행 중 자동화 (4️⃣)
    // 신청 종료일 < 오늘 → 자동 OFF, 관리자는 수정 불가
    const now = new Date();
    let autoRegistrationOpen = registrationOpen;
    if (registrationEndDate) {
      const endDateObj = new Date(registrationEndDate);
      endDateObj.setHours(23, 59, 59, 999); // 하루 끝까지
      if (endDateObj < now) {
        autoRegistrationOpen = false; // 자동 OFF
      }
    }
    
    // 확인 후 실제 저장 진행 (showPublishConfirm이 true인 상태에서만 여기 도달)

    // 🔥 날짜 검증
    if (!dateValidation.isValid) {
      const toastEvent = new CustomEvent("showToast", {
        detail: { 
          message: `날짜 입력 오류: ${dateValidation.errors.join(", ")}`, 
          type: "error" 
        },
      });
      window.dispatchEvent(toastEvent);
      return;
    }

    // 🔥 대회 유형 ↔ 연령 기준 연동 (5️⃣)
    // 연령 기준 미설정 시 저장 불가
    if (tournamentType !== "OPEN" && !ageRule) {
      const toastEvent = new CustomEvent("showToast", {
        detail: { message: "U-대회 또는 OVER-대회는 연령 기준이 필수입니다.", type: "error" },
      });
      window.dispatchEvent(toastEvent);
      return;
    }

    setSaving(true);

    try {
      // adminStatus 결정
      const adminStatus: "draft" | "published" = saveType === "publish" ? "published" : "draft";
      
      // 대회 진행 상태 자동 계산 (dateStart, dateEnd 기준)
      let status: "upcoming" | "ongoing" | "ended" = "upcoming";
      if (dateEnd && dateEnd < now) {
        status = "ended";
      } else if (dateStart && dateStart <= now) {
        status = "ongoing";
      }

      let savedTournamentId: string;

      // 단일 고정 보장 (SuperAdmin만)
      if (isPinned && isSuperAdmin) {
        const pinnedTournamentsQuery = query(
          collection(db, `associations/${associationId}/tournaments`),
          where("isPinned", "==", true)
        );
        const pinnedSnap = await getDocs(pinnedTournamentsQuery);
        
        const pinnedTournamentIds = pinnedSnap.docs
          .map((docSnap) => docSnap.id)
          .filter((id) => !isEditMode || id !== tournamentId);
        
        if (pinnedTournamentIds.length > 0) {
          await runTransaction(db, async (transaction) => {
            for (const idToUnpin of pinnedTournamentIds) {
              const ref = doc(db, `associations/${associationId}/tournaments/${idToUnpin}`);
              transaction.update(ref, {
                isPinned: false,
                updatedAt: serverTimestamp(),
                updatedBy: user.uid,
              });
            }
          });
        }
      }

      if (isEditMode && tournamentId) {
        // 수정
        const tournamentRef = doc(db, `associations/${associationId}/tournaments/${tournamentId}`);
        const updateData: any = {
          title: trimmedTitle,
          content: trimmedContent,
          venue: trimmedVenue,
          dateStart: Timestamp.fromDate(dateStart),
          dateEnd: Timestamp.fromDate(dateEnd),
          status,
          adminStatus,
          registrationOpen: autoRegistrationOpen, // 🔥 자동 계산된 값
          feeAmount: feeAmount || null,
          isOfficial,
          visibility,
          isPinned,
          updatedAt: serverTimestamp(),
          updatedBy: user.uid,
        };
        
        // 🔥 신청·선수 수정·검수·확정 기간 저장 (1️⃣, 2️⃣, 3️⃣, 4️⃣, 5️⃣)
        if (registrationStartDate && registrationEndDate) {
          updateData.registrationPeriod = {
            startDate: registrationStartDate,
            endDate: registrationEndDate,
          };
        }
        if (rosterEditStartDate && rosterEditEndDate) {
          updateData.rosterEditPeriod = {
            startDate: rosterEditStartDate,
            endDate: rosterEditEndDate,
          };
        }
        if (reviewStartDate && reviewEndDate) {
          updateData.reviewPeriod = {
            startDate: reviewStartDate,
            endDate: reviewEndDate,
          };
        }
        if (drawDate) {
          updateData.drawDate = {
            date: drawDate,
            isPublic: drawDatePublic,
          };
        }
        
        // 🔥 대회 유형 저장 (5️⃣)
        if (tournamentType) {
          updateData.tournamentType = tournamentType;
        }
        
        // 🔥 연령 기준 저장
        if (ageRule) {
          updateData.ageRule = ageRule;
        } else {
          updateData.ageRule = null; // 연령 제한 없음으로 명시적 설정
        }
        
        if (isSuperAdmin && isPinned) {
          updateData.pinnedAt = serverTimestamp();
          updateData.pinnedBy = user.uid;
        }
        
        await updateDoc(tournamentRef, updateData);
        savedTournamentId = tournamentId;
      } else {
        // 신규 생성
        const tournamentsRef = collection(db, `associations/${associationId}/tournaments`);
        const createData: any = {
          title: trimmedTitle,
          content: trimmedContent,
          venue: trimmedVenue,
          dateStart: Timestamp.fromDate(dateStart),
          dateEnd: Timestamp.fromDate(dateEnd),
          status,
          adminStatus,
          registrationOpen: autoRegistrationOpen, // 🔥 자동 계산된 값
          feeAmount: feeAmount || null,
          bracketStatus: "preparing",
          isOfficial,
          visibility,
          isPinned: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          createdBy: user.uid,
          updatedBy: user.uid,
          // 🔥 공지에서 생성된 경우 sourceNoticeId 저장
          ...(fromNoticeId && { sourceNoticeId: fromNoticeId }),
          // 🔥 신청·선수 수정·검수·확정 기간 저장 (1️⃣, 2️⃣, 3️⃣, 4️⃣, 5️⃣)
          ...(registrationStartDate && registrationEndDate && {
            registrationPeriod: {
              startDate: registrationStartDate,
              endDate: registrationEndDate,
            },
          }),
          ...(rosterEditStartDate && rosterEditEndDate && {
            rosterEditPeriod: {
              startDate: rosterEditStartDate,
              endDate: rosterEditEndDate,
            },
          }),
          ...(reviewStartDate && reviewEndDate && {
            reviewPeriod: {
              startDate: reviewStartDate,
              endDate: reviewEndDate,
            },
          }),
          ...(drawDate && {
            drawDate: {
              date: drawDate,
              isPublic: drawDatePublic,
            },
          }),
          // 🔥 대회 유형 저장 (5️⃣)
          ...(tournamentType && { tournamentType }),
          // 🔥 연령 기준 저장
          ageRule: ageRule || null,
        };
        
        if (isPinned && isSuperAdmin) {
          createData.pinnedAt = serverTimestamp();
          createData.pinnedBy = user.uid;
        }
        
        console.log("🔥 [handleSave] 대회 생성 시도:", { associationId, createData: { ...createData, createdAt: "[serverTimestamp]", updatedAt: "[serverTimestamp]" } });
        const docRef = await addDoc(tournamentsRef, createData);
        savedTournamentId = docRef.id;
        console.log("✅ [handleSave] 대회 생성 성공:", { tournamentId: savedTournamentId, title: trimmedTitle });
      }

      // audit_logs 기록
      try {
        const logsRef = collection(db, `associations/${associationId}/audit_logs`);
        await addDoc(logsRef, {
          action: saveType === "publish" ? "TOURNAMENT_PUBLISHED" : isEditMode ? "TOURNAMENT_UPDATED" : "TOURNAMENT_CREATED",
          tournamentId: savedTournamentId,
          adminId: user.uid,
          adminEmail: user.email || "알 수 없음",
          title: trimmedTitle,
          adminStatus,
          isOfficial,
          visibility,
          timestamp: serverTimestamp(),
        });
      } catch (logError) {
        console.error("로그 기록 실패:", logError);
      }

      // 성공 메시지
      const successMessage = saveType === "publish"
        ? "✅ 대회가 게시되었습니다."
        : isEditMode
        ? "✅ 대회가 저장되었습니다."
        : "✅ 대회가 등록되었습니다.";

      console.log("✅ [handleSave] 저장 완료:", { 
        tournamentId: savedTournamentId, 
        saveType, 
        isEditMode,
        successMessage,
        title: trimmedTitle
      });

      const toastEvent = new CustomEvent("showToast", {
        detail: { message: successMessage, type: "success" },
      });
      window.dispatchEvent(toastEvent);

      setSaveError(null);
      setOriginalData(null);
      setShowPublishConfirm(false); // 저장 성공 시 모달 닫기
      
      // 🔥 자동화 코어: 생성된 대회 ID 전달 (새로 생성한 경우만)
      // 🔥 저장 성공 후 목록 새로고침 (인덱스 문제로 안 보일 수 있으므로)
      onSuccess(isEditMode ? undefined : savedTournamentId);
      onClose();
    } catch (error: any) {
      console.error("❌ [handleSave] 대회 저장 오류:", error);
      
      // 🔥 에러 타입별 메시지 분기
      let errorMessage = "저장 중 오류가 발생했습니다.";
      let errorType: "permission" | "network" | "validation" | "unknown" = "unknown";
      
      if (error?.code === "permission-denied" || error?.message?.includes("permission") || error?.message?.includes("권한")) {
        errorMessage = "관리자 권한이 필요합니다. Custom Claims를 설정하거나 임시 저장을 시도해주세요.";
        errorType = "permission";
      } else if (error?.code === "unavailable" || error?.code === "deadline-exceeded" || error?.message?.includes("network")) {
        errorMessage = "네트워크 오류가 발생했습니다. 연결을 확인하고 다시 시도해주세요.";
        errorType = "network";
      } else if (error?.code === "invalid-argument" || error?.message?.includes("validation")) {
        errorMessage = "입력한 정보가 올바르지 않습니다. 필수 항목을 확인해주세요.";
        errorType = "validation";
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      setSaveError(new Error(errorMessage));
      
      // 🔥 에러 타입별 토스트 메시지 (UI에서 상세 안내는 별도 표시)
      const toastEvent = new CustomEvent("showToast", {
        detail: { message: errorMessage, type: "error" },
      });
      window.dispatchEvent(toastEvent);
    } finally {
      // ✅ 무조건 실행 보장 (에러 발생 여부와 관계없이)
      setSaving(false);
      console.log('✅ [handleSave] 저장 상태 복구 완료 (finally)');
    }
  };

  const isButtonDisabled = saving || loading || adminLoading || (saveType === "publish" && !canPublish) || !!saveError;
  const hasTitle = title.trim().length > 0;
  const hasContent = content.trim().length > 0;
  const hasVenue = venue.trim().length > 0;
  const hasDates = dateStart && dateEnd;

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[10001] bg-black/40 flex justify-end"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:w-[480px] h-[100dvh] bg-white flex flex-col shadow-xl relative"
        style={{ pointerEvents: 'auto' }}
      >
        {/* 헤더 */}
        <div className="shrink-0 px-4 py-3 border-b flex justify-between items-center bg-white">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-gray-900">
              {isEditMode ? "대회 수정" : "새 대회 등록"}
            </h2>
            {/* 🔥 공지에서 생성된 대회 배지 */}
            {fromNoticeId && !isEditMode && (
              <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                공지에서 생성된 대회
              </span>
            )}
          </div>
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

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 min-h-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <LoadingSpinner size="lg" className="text-blue-600" />
              <p className="text-sm text-gray-500">
                {fromNoticeId ? "공지 내용을 불러오는 중..." : "대회 정보를 불러오는 중..."}
              </p>
            </div>
          ) : (
            <>
              {/* 🔥 공지에서 생성된 대회 안내 배지 */}
              {fromNoticeId && !isEditMode && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    💡 <strong>공지에서 생성된 대회</strong>
                    <br />
                    <span className="text-xs text-blue-600 mt-1 block">
                      본 대회는 선택한 공지 내용을 기준으로 생성되었습니다. 제목과 본문이 자동으로 채워져 있습니다.
                    </span>
                  </p>
                </div>
              )}
              
              {/* 🔥 fromNoticeId 없을 때 안내 메시지 */}
              {!fromNoticeId && !isEditMode && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-sm text-amber-800">
                    <strong>💡 팁:</strong> 공지에서 생성하면 제목, 본문, 참가비가 자동으로 입력됩니다.
                    <br />
                    <span className="text-xs text-amber-700 mt-2 block">
                      공지 상세 페이지에서 <strong>"[이 공지로 대회 생성]"</strong> 버튼을 사용하세요.
                    </span>
                  </p>
                </div>
              )}
              
              {/* 제목 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    제목 <span className="text-red-500">*</span>
                  </label>
                  <span className={`text-xs ${title.trim().length > TOURNAMENT_VALIDATION.TITLE.MAX_LENGTH ? 'text-red-500' : 'text-gray-500'}`}>
                    {title.trim().length} / {TOURNAMENT_VALIDATION.TITLE.MAX_LENGTH}자
                  </span>
                </div>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={TOURNAMENT_VALIDATION.TITLE.MAX_LENGTH}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="대회 제목을 입력하세요"
                />
                {(() => {
                  const warning = getWarningMessage('title', title.trim().length);
                  return warning ? <p className="text-xs text-amber-600 mt-1">{warning}</p> : null;
                })()}
              </div>

              {/* 본문 (선택) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    본문
                  </label>
                  <span className={`text-xs ${content.trim().length > TOURNAMENT_VALIDATION.CONTENT.MAX_LENGTH ? 'text-red-500' : 'text-gray-500'}`}>
                    {content.trim().length.toLocaleString()} / {TOURNAMENT_VALIDATION.CONTENT.MAX_LENGTH.toLocaleString()}자
                  </span>
                </div>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={8}
                  maxLength={TOURNAMENT_VALIDATION.CONTENT.MAX_LENGTH}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="대회 안내 내용을 입력하세요 (선택사항)"
                />
                {(() => {
                  const warning = getWarningMessage('content', content.trim().length);
                  return warning ? <p className="text-xs text-amber-600 mt-1">{warning}</p> : null;
                })()}
              </div>

              {/* 대회 전용 필드 */}
              <div className="space-y-4 border-t pt-4">

                {/* 🔥 다음 입력 필드 제안 (5단계) */}
                {suggestedField && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-800">
                      💡 다음으로 <strong>
                        {suggestedField === "tournament" && "대회 기간"}
                        {suggestedField === "registration" && "참가 신청 기간"}
                        {suggestedField === "rosterEdit" && "선수 명단 수정 기간"}
                        {suggestedField === "review" && "사무국 검수 기간"}
                        {suggestedField === "draw" && "조 추첨일"}
                      </strong>을 입력해주세요.
                    </p>
                  </div>
                )}
                
                {/* 🔥 날짜 검증 에러 표시 (저장 버튼 비활성화) */}
                {dateValidation.errors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm font-medium text-red-800 mb-1">❌ 날짜 입력 오류:</p>
                    <ul className="list-disc list-inside text-xs text-red-700 space-y-1">
                      {dateValidation.errors.map((error, idx) => (
                        <li key={idx}>{error}</li>
                      ))}
                    </ul>
                    <p className="text-xs text-red-600 mt-2">
                      날짜 순서를 확인하세요. 저장할 수 없습니다.
                    </p>
                  </div>
                )}

                {/* 일정 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      시작일 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={dateStart ? dateStart.toISOString().split('T')[0] : ''}
                      onChange={(e) => setDateStart(e.target.value ? new Date(e.target.value) : null)}
                      className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        dateValidation.errors.some(e => e.includes("시작일")) ? "border-red-500" : "border-gray-300"
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      종료일 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={dateEnd ? dateEnd.toISOString().split('T')[0] : ''}
                      onChange={(e) => setDateEnd(e.target.value ? new Date(e.target.value) : null)}
                      min={dateStart ? dateStart.toISOString().split('T')[0] : undefined}
                      className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        dateValidation.errors.some(e => e.includes("종료일")) ? "border-red-500" : "border-gray-300"
                      }`}
                    />
                  </div>
                </div>

                {/* 장소 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    장소 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                    maxLength={TOURNAMENT_VALIDATION.VENUE.MAX_LENGTH}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="대회 장소를 입력하세요"
                  />
                </div>

                {/* 참가비 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    참가비 (원)
                  </label>
                  <input
                    type="number"
                    value={feeAmount || ''}
                    onChange={(e) => setFeeAmount(e.target.value ? parseInt(e.target.value) : null)}
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0"
                  />
                </div>

                {/* 접수 여부 (자동화) */}
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={registrationOpen}
                      onChange={(e) => setRegistrationOpen(e.target.checked)}
                      disabled={registrationEndDate && new Date(registrationEndDate) < new Date()}
                      className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <div>
                      <span className={`text-sm font-medium ${registrationEndDate && new Date(registrationEndDate) < new Date() ? "text-gray-500" : "text-gray-700"}`}>
                        접수 진행 중
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        {registrationEndDate && new Date(registrationEndDate) < new Date() 
                          ? "신청 기간 종료로 자동 종료되었습니다"
                          : "신청 종료일이 지나면 자동으로 OFF됩니다."}
                      </p>
                      {registrationEndDate && new Date(registrationEndDate) < new Date() && (
                        <p className="text-xs text-gray-400 mt-1 italic">
                          (신청 기간 종료로 수정 불가)
                        </p>
                      )}
                    </div>
                  </label>
                </div>
              </div>

              {/* 🔥 신청·선수 수정·검수·확정 5단계 시간축 UI */}
              <div className="border-t pt-4 space-y-4">
                <h3 className="text-sm font-semibold text-gray-700">참가 신청 기간 (2️⃣) - 팀 접수</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      신청 시작일 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={registrationStartDate}
                      onChange={(e) => setRegistrationStartDate(e.target.value)}
                      max={registrationEndDate || undefined}
                      className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        dateValidation.errors.some(e => e.includes("신청 시작")) ? "border-red-500" : "border-gray-300"
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      신청 종료일 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={registrationEndDate}
                      onChange={(e) => {
                        setRegistrationEndDate(e.target.value);
                        // 종료일이 오늘보다 과거면 자동 OFF
                        if (e.target.value && new Date(e.target.value) < new Date()) {
                          setRegistrationOpen(false);
                        }
                      }}
                      min={registrationStartDate || undefined}
                      max={dateStart ? dateStart.toISOString().split('T')[0] : undefined}
                      className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        dateValidation.errors.some(e => e.includes("신청 종료")) || 
                        dateValidation.warnings.some(e => e.includes("신청 종료일은 대회 시작일"))
                          ? "border-red-500" : "border-gray-300"
                      }`}
                    />
                    {dateValidation.warnings.some(e => e.includes("신청 종료일은 대회 시작일")) && (
                      <p className="text-xs text-yellow-600 mt-1">
                        ⚠️ 신청 종료일은 대회 시작일보다 이전이어야 합니다.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* 🔥 선수 명단 수정 기간 (3️⃣) */}
              <div className="border-t pt-4 space-y-4">
                <h3 className="text-sm font-semibold text-gray-700">선수 명단 수정 기간 (3️⃣)</h3>
                <p className="text-xs text-muted-foreground mb-2">
                  신청 마감 후 팀은 선수 추가·삭제·정보 수정이 가능합니다.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      수정 시작일
                    </label>
                    <input
                      type="date"
                      value={rosterEditStartDate}
                      onChange={(e) => setRosterEditStartDate(e.target.value)}
                      min={registrationEndDate || undefined}
                      max={rosterEditEndDate || undefined}
                      disabled={!registrationStartDate || !registrationEndDate}
                      className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed ${
                        dateValidation.errors.some(e => e.includes("선수 명단 수정")) ? "border-red-500" : "border-gray-300"
                      }`}
                    />
                    {!registrationStartDate || !registrationEndDate ? (
                      <p className="text-xs text-muted-foreground mt-1">
                        먼저 참가 신청 기간을 입력해주세요.
                      </p>
                    ) : null}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      수정 종료일
                    </label>
                    <input
                      type="date"
                      value={rosterEditEndDate}
                      onChange={(e) => setRosterEditEndDate(e.target.value)}
                      min={rosterEditStartDate || registrationEndDate || undefined}
                      max={reviewStartDate || dateStart ? (dateStart!.toISOString().split('T')[0]) : undefined}
                      disabled={!registrationStartDate || !registrationEndDate || !rosterEditStartDate}
                      className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed ${
                        dateValidation.errors.some(e => e.includes("선수 명단 수정")) ? "border-red-500" : "border-gray-300"
                      }`}
                    />
                    {dateValidation.errors.some(e => e.includes("검수 시작일은 선수 명단 수정 종료일")) && (
                      <p className="text-xs text-red-600 mt-1">
                        ❌ 검수 시작일은 선수 명단 수정 종료일 이후여야 합니다.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* 🔥 사무국 검수 기간 (4️⃣) */}
              <div className="border-t pt-4 space-y-4">
                <h3 className="text-sm font-semibold text-gray-700">사무국 검수 기간 (4️⃣)</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      검수 시작일
                    </label>
                    <input
                      type="date"
                      value={reviewStartDate}
                      onChange={(e) => setReviewStartDate(e.target.value)}
                      min={rosterEditEndDate || registrationEndDate || undefined}
                      max={reviewEndDate || undefined}
                      disabled={!registrationStartDate || !registrationEndDate || (!rosterEditStartDate && !rosterEditEndDate)}
                      className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed ${
                        dateValidation.errors.some(e => e.includes("검수 시작일은 선수 명단 수정 종료일")) ? "border-red-500" : "border-gray-300"
                      }`}
                    />
                    {dateValidation.errors.some(e => e.includes("검수 시작일은 선수 명단 수정 종료일")) && (
                      <p className="text-xs text-red-600 mt-1">
                        ❌ 검수 시작일은 선수 명단 수정 종료일 이후여야 합니다.
                      </p>
                    )}
                    {(!registrationStartDate || !registrationEndDate) && (
                      <p className="text-xs text-muted-foreground mt-1">
                        먼저 참가 신청 기간을 입력해주세요.
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      검수 종료일
                    </label>
                    <input
                      type="date"
                      value={reviewEndDate}
                      onChange={(e) => setReviewEndDate(e.target.value)}
                      min={reviewStartDate || registrationEndDate || undefined}
                      max={drawDate || dateStart ? (drawDate || dateStart!.toISOString().split('T')[0]) : undefined}
                      className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        dateValidation.warnings.some(e => e.includes("검수 종료")) ? "border-yellow-500" : "border-gray-300"
                      }`}
                    />
                    {dateValidation.warnings.some(e => e.includes("추첨일은 검수 종료일")) && (
                      <p className="text-xs text-yellow-600 mt-1">
                        ⚠️ 추첨일은 검수 종료일 이후여야 합니다.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* 🔥 테스트 모드 토글 (조 추첨 테스트용) */}
              <div className="border-t pt-4 space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={testMode}
                      onChange={(e) => setTestMode(e.target.checked)}
                      className="mr-2 h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded"
                    />
                    <div>
                      <span className="text-sm font-medium text-amber-900">🧪 테스트 모드 (조 추첨 검증용)</span>
                      <p className="text-xs text-amber-700 mt-1">
                        활성화 시 날짜 검증이 완화되어 조 추첨을 바로 테스트할 수 있습니다.
                        <br />
                        운영 기록에는 반영되지 않으며, 테스트용 조 추첨 결과만 생성됩니다.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* 🔥 조 추첨일 (5️⃣) */}
              <div className="border-t pt-4 space-y-4">
                <h3 className="text-sm font-semibold text-gray-700">
                  조 추첨일 (5️⃣) - 민원 방지용
                  {testMode && <span className="ml-2 text-xs text-amber-600">(테스트 모드)</span>}
                </h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    추첨일
                  </label>
                    <input
                      type="date"
                      value={drawDate}
                      onChange={(e) => setDrawDate(e.target.value)}
                      min={reviewEndDate || rosterEditEndDate || registrationEndDate || undefined}
                      max={dateStart ? dateStart.toISOString().split('T')[0] : undefined}
                      disabled={!registrationStartDate || !registrationEndDate || (!reviewStartDate && !reviewEndDate)}
                      className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed ${
                        dateValidation.errors.some(e => e.includes("추첨일")) ? "border-red-500" : "border-gray-300"
                      }`}
                    />
                    {dateValidation.errors.some(e => e.includes("추첨일은 검수 종료일")) && (
                      <p className="text-xs text-red-600 mt-1">
                        ❌ 추첨일은 검수 종료일 이후여야 합니다.
                      </p>
                    )}
                    {dateValidation.errors.some(e => e.includes("추첨일은 대회 시작일")) && (
                      <p className="text-xs text-red-600 mt-1">
                        ❌ 추첨일은 대회 시작일보다 이전이어야 합니다.
                      </p>
                    )}
                    {(!registrationStartDate || !registrationEndDate || (!reviewStartDate && !reviewEndDate)) && (
                      <p className="text-xs text-muted-foreground mt-1">
                        먼저 참가 신청 기간과 검수 기간을 입력해주세요.
                      </p>
                    )}
                </div>
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={drawDatePublic}
                      onChange={(e) => setDrawDatePublic(e.target.checked)}
                      className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">공개</span>
                  </label>
                </div>
              </div>

              {/* 🔥 대회 유형 ↔ 연령 기준 연동 (5️⃣) */}
              <div className="border-t pt-4 space-y-4">
                <h3 className="text-sm font-semibold text-gray-700">대회 유형 (5️⃣)</h3>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="tournamentType"
                      value="OPEN"
                      checked={tournamentType === "OPEN"}
                      onChange={(e) => {
                        setTournamentType("OPEN");
                        setAgeRule(undefined); // 연령 기준 제거
                      }}
                      className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="text-sm font-medium text-gray-700">연령 제한 없음 (OPEN)</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="tournamentType"
                      value="U"
                      checked={tournamentType === "U"}
                      onChange={(e) => {
                        setTournamentType("U");
                        // 기존 ageRule이 있으면 type만 업데이트, 없으면 기본값 생성
                        if (ageRule) {
                          setAgeRule({ ...ageRule, type: "U" });
                        }
                      }}
                      className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="text-sm font-medium text-gray-700">U-대회 (상한 제한, 예: U-15 = 15세 이하)</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="tournamentType"
                      value="OVER"
                      checked={tournamentType === "OVER"}
                      onChange={(e) => {
                        setTournamentType("OVER");
                        // 기존 ageRule이 있으면 type만 업데이트, 없으면 기본값 생성
                        if (ageRule) {
                          setAgeRule({ ...ageRule, type: "OVER" });
                        }
                      }}
                      className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="text-sm font-medium text-gray-700">OVER-대회 (하한 제한, 예: OVER-40 = 40세 이상)</span>
                  </label>
                </div>
                
                {/* 연령 기준 (U/OVER 선택 시에만 표시) */}
                {(tournamentType === "U" || tournamentType === "OVER") && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <TournamentAgeRuleForm
                      value={ageRule}
                      onChange={(rule) => {
                        setAgeRule(rule);
                      }}
                      fixedType={tournamentType as "U" | "OVER"} // 상위에서 이미 선택된 type 전달
                    />
                    {tournamentType === "OVER" && (
                      <div className="mt-3 p-3 bg-white rounded border border-blue-200">
                        <p className="text-xs text-gray-700 mb-1">
                          <strong>OVER대회 설명:</strong>
                        </p>
                        <p className="text-xs text-gray-600">
                          OVER대회는 하한 연령 제한 대회입니다. 예: OVER-40 = 40세 이상만 참가 가능
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          설정 예: OVER-40 → 1986년 이전 출생자만 허용
                        </p>
                      </div>
                    )}
                    {!ageRule && (
                      <p className="text-xs text-red-600 mt-2">
                        ⚠️ {tournamentType === "U" ? "U-대회" : "OVER-대회"}는 연령 기준이 필수입니다.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* 설정 (공지 패턴과 동일) */}
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
                    <div className="relative group">
                      <span className="text-sm font-medium text-gray-700">공식 기준 대회</span>
                      <p className="text-xs text-gray-500 mt-1">
                        체크 시 "공식 기준" 배지가 표시됩니다.
                      </p>
                      {/* 🔥 UX 보호 장치: 툴팁 */}
                      <div className="absolute left-0 top-8 z-50 hidden group-hover:block w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg">
                        공식 기록으로 저장되며, 게시 후 수정 이력이 남습니다.
                      </div>
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
                        onChange={(e) => setVisibility(e.target.value as TournamentVisibility)}
                        className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <span className="text-sm font-medium text-gray-700">전체 공개</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="member"
                        checked={visibility === "member"}
                        onChange={(e) => setVisibility(e.target.value as TournamentVisibility)}
                        className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <span className="text-sm font-medium text-gray-700">회원만</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="admin"
                        checked={visibility === "admin"}
                        onChange={(e) => setVisibility(e.target.value as TournamentVisibility)}
                        className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <span className="text-sm font-medium text-gray-700">행정 내부</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* UX 안전장치 문구 */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  ⚠️ 본 대회는 공식 기록으로 저장됩니다. 게시 후 수정 시 이력이 남습니다.
                </p>
                {dateValidation.errors.length > 0 && (
                  <p className="text-sm text-red-600 mt-2 font-medium">
                    ❌ 날짜 검증 오류가 있어 저장할 수 없습니다.
                  </p>
                )}
              </div>

              {/* 저장 상태 */}
              <fieldset className="border-t pt-4 space-y-3">
                <legend className="text-sm font-medium text-gray-700 mb-3">
                  저장 상태
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
                        외부에 공개되지 않습니다.
                      </p>
                    </div>
                  </label>
                  <label className={`flex items-center ${!canPublishTournament ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <input
                      type="radio"
                      value="publish"
                      checked={saveType === "publish"}
                      onChange={(e) => setSaveType(e.target.value as "draft" | "publish")}
                      disabled={!canPublishTournament}
                      className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-700">게시</span>
                      <p className="text-xs text-gray-500 mt-1">
                        published 상태로 저장되어 즉시 공개됩니다.
                        {!canPublishTournament && (
                          <span className="block text-red-500 mt-1">
                            ⚠️ 관리자 권한이 필요합니다.
                          </span>
                        )}
                      </p>
                    </div>
                  </label>
                </div>
                
                {saveType === "publish" && !canPublishTournament && (
                  <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-600 mt-3">
                    <p className="font-medium mb-2">게시할 수 없습니다:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {!hasTitle && <li>제목 미입력</li>}
                      {!hasVenue && <li>장소 미입력</li>}
                      {!hasDates && <li>일정 미입력</li>}
                      {(!canPublishTournament || adminLoadingState) && <li>관리자 권한 없음</li>}
                    </ul>
                  </div>
                )}
              </fieldset>
            </>
          )}
        </div>

        {/* Footer */}
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
            
            {saveType === "draft" && (
              <button
                type="button"
                onClick={handleSave}
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
                onClick={handleSave}
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
          
          {isButtonDisabled && !saving && !loading && !saveError && (
            <div className="text-xs text-red-500 mt-2 px-1">
              {adminLoadingState && "권한 확인 중입니다..."}
              {!adminLoadingState && saveType === "publish" && !canPublishTournament && (
                "⚠️ 게시하려면 관리자 권한과 필수 항목 입력이 필요합니다."
              )}
            </div>
          )}
          
          {saveError && (
            <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="text-sm font-medium text-red-800 mb-1">
                ❌ 저장 실패
              </div>
              <div className="text-xs text-red-600">
                {saveError.message || "저장 중 오류가 발생했습니다."}
              </div>
              {saveError.message?.includes("permission") || saveError.message?.includes("권한") ? (
                <div className="space-y-2 mt-2">
                  <div className="text-xs text-red-500">
                    💡 관리자 권한을 확인하거나 임시 저장을 시도해주세요.
                  </div>
                  {user && (
                    <button
                      onClick={async () => {
                        setSettingClaims(true);
                        try {
                          console.log("🔥 [TournamentEditDrawer] 관리자 권한 설정 시작:", {
                            uid: user.uid,
                            associationId,
                          });
                          
                          // 🔥 Cloud Function으로 members 문서 + Custom Claims 동시 설정
                          // setAssociationAdminCallable이 Admin SDK로 실행되어 Rules를 우회하고
                          // members/{uid} 문서와 Custom Claims를 모두 설정합니다.
                          const success = await setAssociationAdminClaims(user.uid, associationId);
                          
                          if (success) {
                            // Claims 확인
                            const claims = await checkCurrentUserClaims();
                            setClaimsChecked(true);
                            console.log("✅ Custom Claims 확인:", claims);
                            
                            // 페이지 새로고침 (권한 재확인)
                            alert("✅ 관리자 권한이 부여되었습니다.\n\n페이지를 새로고침합니다.");
                            window.location.reload();
                            
                            // 에러 상태 초기화 (성공 시)
                            setSaveError(null);
                          } else {
                            console.error("❌ [TournamentEditDrawer] Custom Claims 설정 실패 (success: false)");
                          }
                        } catch (error: any) {
                          console.error("❌ [TournamentEditDrawer] Claims 설정 예외 발생:", {
                            error,
                            code: error?.code,
                            message: error?.message,
                            details: error?.details,
                          });
                        } finally {
                          setSettingClaims(false);
                        }
                      }}
                      disabled={settingClaims}
                      className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {settingClaims ? "권한 부여 중..." : "🔑 관리자 권한 부여 (members 문서 + Claims)"}
                    </button>
                  )}
                </div>
              ) : saveError.message?.includes("네트워크") ? (
                <div className="text-xs text-orange-500 mt-1">
                  🔄 네트워크 연결을 확인하고 다시 시도해주세요.
                </div>
              ) : saveError.message?.includes("올바르지 않") || saveError.message?.includes("validation") ? (
                <div className="text-xs text-yellow-600 mt-1">
                  ⚠️ 입력한 정보를 확인해주세요.
                </div>
              ) : null}
              {saveType === "publish" && (
                <button
                  onClick={() => {
                    setSaveError(null);
                    setSaveType("draft");
                    // 🔥 자동 DRAFT 전환 (사용자가 수동으로 저장 버튼을 눌러야 함)
                  }}
                  className="mt-2 text-xs px-3 py-1.5 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  📝 임시 저장(DRAFT)으로 전환
                </button>
              )}
            </div>
          )}
        </div>

        {/* 🔥 게시 확인 모달 (UX 보호 장치) */}
        {showPublishConfirm && (
          <div className="fixed inset-0 z-[10002] bg-black/50 flex items-center justify-center" onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowPublishConfirm(false);
              setSaveType("draft");
            }
          }}>
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold mb-2">게시 확인</h3>
              <p className="text-sm text-gray-700 mb-4">
                게시 후 일정·기준 변경 시 이력이 기록됩니다.
              </p>
              <p className="text-xs text-gray-500 mb-6">
                공식 기록으로 저장되며, 수정 시마다 감사 로그가 남습니다.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowPublishConfirm(false);
                    setSaveType("draft");
                  }}
                  className="flex-1 h-10 border border-gray-300 rounded-md bg-white text-gray-700 font-medium hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    // 확인 버튼: 모달 닫고 저장 진행
                    setShowPublishConfirm(false);
                    // showPublishConfirm을 임시로 true로 설정하여 handleSave가 모달을 다시 띄우지 않도록 함
                    // 실제 저장 로직은 handleSave가 처리
                    setShowPublishConfirm(true);
                    // 다음 이벤트 루프에서 handleSave 호출 (상태 업데이트 후)
                    setTimeout(() => {
                      handleSave();
                    }, 0);
                  }}
                  className="flex-1 h-10 rounded-md font-semibold bg-blue-600 text-white hover:bg-blue-700"
                >
                  게시 확인
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

