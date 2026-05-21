// src/pages/team/TeamMembersPage.tsx
// 🔥 소흘 60대 FC 실전: 회원 등록 UX
// 🔥 운영 자동화 레벨 1: 임원 면제, 필터, 연회비, 상벌 구조

import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { useTeam } from "@/context/TeamContext";
import { useAuth } from "@/context/AuthProvider";
import TeamJoinRequestsSection from "@/components/team/TeamJoinRequestsSection";
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, getDoc, writeBatch, Timestamp, deleteDoc, updateDoc, orderBy, setDoc } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import { db } from "@/lib/firebase";
import { hasPower, type Role } from "@/lib/permissions"; // 🔥 F-5: 권한 가드
import { resolveFeePlan, calculateMonthlyFee, simulateMonthlyBatch, isAnnualValid, EXEMPT_ROLES, type TeamMember as TeamMemberType } from "@/utils/teamRules";
import * as XLSX from "xlsx";
import {
  extractSpreadsheetId,
  fetchGoogleSheetsAsCSV,
  parseCSVToObjects,
  createGoogleSheetsCopyLink,
  MEMBER_TEMPLATE_COLUMNS,
  generateTemplateExampleData,
} from "@/utils/googleSheetsTemplate";
import {
  validateAndNormalizeRow,
  determineSyncAction,
  syncGoogleSheetToFirestore,
  type SyncResult,
} from "@/utils/googleSheetsSync";
import {
  buildTeamMemberImportKey,
  findActiveMemberDuplicateNameGroups,
  indexExistingMembersForImport,
  resolveExistingMemberIdForBulkRow,
} from "@/lib/team/memberImportDedupe";
// 🔥 모든 규칙 엔진 함수는 teamRules.ts에서 import (중복 선언 제거)

interface TeamMember {
  id: string;
  name: string;
  phone?: string; // 🔥 전화번호 (010-xxxx-xxxx)
  jerseyNumber?: number; // 🔥 배번
  squad?: "청룡" | "백호";
  role: "일반" | "회장" | "부회장" | "총무" | "감독" | "코치" | "감사" | "상벌위원장";
  status: "active" | "paused" | "expelled"; // 🔥 4. 상벌/징계 연동
  feePlan: "monthly" | "annual" | "exempt"; // 결과값
  exemptReason?: "role" | "special";
  manualFeeOverride?: boolean; // ★ 천재 포인트: 수동 override 여부
  discountMonths?: number;
  discountAmount?: number;
  phoneLast4?: string; // 하위 호환성 유지
  memo?: string;
  joinedAt: Date;
  unpaidMonths?: number; // 계산 필드
  annualPaidYear?: number; // 🔥 3. 연회비 연도
  annualPaidAt?: Date; // 🔥 3. 연회비 납부일
  penaltyPoints?: number; // 🔥 4. 상벌/징계 연동
  // 🔥 권한 관리 필드 (새로 추가)
  accessLevel?: "OWNER" | "ADMIN" | "STAFF"; // 🔑 운영 권한 레벨
  userId?: string; // 🔑 Firebase Auth UID (로그인 계정과 연결)
  isDeleted?: boolean; // 🔥 Soft Delete 플래그
  deletedAt?: Date;
  deletedBy?: string;
}

export default function TeamMembersPage() {
  const { type } = useParams<{ type: string }>();
  const navigate = useNavigate();
  const { myTeam, role: teamRole } = useTeam();
  const { user } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null); // 🔥 수정 중인 회원 ID
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null); // 🔥 메뉴 열린 회원 ID
  const [currentUserAccessLevel, setCurrentUserAccessLevel] = useState<"OWNER" | "ADMIN" | "STAFF" | null>(null); // 🔑 현재 사용자 권한
  const [showAccessLogsModal, setShowAccessLogsModal] = useState(false); // 🔑 권한 변경 이력 모달
  const [accessLogs, setAccessLogs] = useState<any[]>([]); // 🔑 권한 변경 이력
  const [viewMode, setViewMode] = useState<"all" | "admin">("all"); // 🔑 전체 회원 / 운영진 관리 모드
  const [showDeletedMembers, setShowDeletedMembers] = useState(false); // 🔥 삭제된 회원 보기 토글
  const [showAuditTimelineModal, setShowAuditTimelineModal] = useState(false); // 🔥 감사 타임라인 모달
  const [showMonthlyReportModal, setShowMonthlyReportModal] = useState(false); // 📊 월간 리포트 모달
  const [showQRModal, setShowQRModal] = useState(false); // 🔥 QR 생성 모달
  const [qrUrl, setQrUrl] = useState<string>(""); // 🔥 QR URL
  const [qrLoading, setQrLoading] = useState(false); // 🔥 QR 생성 로딩
  const [showInviteManagement, setShowInviteManagement] = useState(false); // 🔥 E-4: 초대 관리 화면
  const [invites, setInvites] = useState<any[]>([]); // 🔥 초대 목록
  const [invitesLoading, setInvitesLoading] = useState(false); // 🔥 초대 목록 로딩
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [showBulkSoftDeleteModal, setShowBulkSoftDeleteModal] = useState(false);
  const [showCorruptBulkModal, setShowCorruptBulkModal] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // 🔑 현재 사용자의 권한 레벨 확인
  useEffect(() => {
    if (!user?.uid || !myTeam?.id) {
      setCurrentUserAccessLevel(null);
      return;
    }

    const checkUserAccess = async () => {
      try {
        // 🔑 team_members 컬렉션에서 현재 사용자의 권한 확인
        const teamMembersQuery = query(
          collection(db, "team_members"),
          where("uid", "==", user.uid),
          where("teamId", "==", myTeam.id)
        );
        const snapshot = await getDocs(teamMembersQuery);
        
        if (!snapshot.empty) {
          const memberData = snapshot.docs[0].data();
          const role = memberData.role as "admin" | "member" | undefined;
          // role을 accessLevel로 변환
          if (role === "admin") {
            setCurrentUserAccessLevel("OWNER");
          } else {
            setCurrentUserAccessLevel("STAFF");
          }
        } else {
          // 🔑 team_members에 없으면 teams.owners 확인 (하위 호환성)
          const teamDoc = await getDoc(doc(db, "teams", myTeam.id));
          if (teamDoc.exists()) {
            const teamData = teamDoc.data();
            const owners = teamData.owners || [];
            if (owners.includes(user.uid)) {
              setCurrentUserAccessLevel("OWNER");
            } else {
              setCurrentUserAccessLevel("STAFF"); // 기본값
            }
          } else {
            setCurrentUserAccessLevel("STAFF");
          }
        }
      } catch (error) {
        console.error("권한 확인 실패:", error);
        setCurrentUserAccessLevel("STAFF"); // 기본값
      }
    };

    checkUserAccess();
  }, [user?.uid, myTeam?.id]);
  
  // 🔥 2. 필터 상태
  const [roleFilter, setRoleFilter] = useState<"all" | "executive" | "general">("all");
  const [feeFilter, setFeeFilter] = useState<"all" | "exempt" | "monthly" | "annual">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "paused" | "expelled">("all");

  const fetchMembersList = async () => {
    if (!myTeam?.id) return;
    try {
      const membersQuery = query(
        collection(db, "teams", myTeam.id, "members")
      );
      const snapshot = await getDocs(membersQuery);
      const membersList: TeamMember[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        
        // 🔥 Soft Delete 필터링: showDeletedMembers 토글로 제어
        // (삭제된 회원 보기 토글이 꺼져있으면 삭제된 회원 제외)
        if (!showDeletedMembers && data.isDeleted === true) {
          return; // 삭제된 회원은 스킵
        }
        
        // 🔥 안전한 Timestamp → Date 변환 헬퍼
        const safeToDate = (ts: any): Date => {
          if (!ts) return new Date();
          if (ts instanceof Date) return ts;
          if (ts instanceof Timestamp) return ts.toDate();
          if (typeof ts?.toDate === "function") return ts.toDate();
          if (ts?.seconds) return new Date(ts.seconds * 1000);
          return new Date();
        };
        
        membersList.push({
          id: doc.id,
          name: data.name || "",
          squad: data.squad,
          role: (data.role as TeamMember["role"]) || "일반",
          status: (data.status as "active" | "paused" | "expelled") || "active",
          feePlan: (data.feePlan as "monthly" | "annual" | "exempt") || "monthly",
          exemptReason: data.exemptReason,
          discountMonths: data.discountMonths,
          discountAmount: data.discountAmount,
          phoneLast4: data.phoneLast4,
          memo: data.memo,
          joinedAt: safeToDate(data.joinedAt),
            unpaidMonths: data.unpaidMonths || 0,
            annualPaidYear: data.annualPaidYear || undefined,
            annualPaidAt: data.annualPaidAt ? safeToDate(data.annualPaidAt) : undefined,
            penaltyPoints: data.penaltyPoints || 0,
            manualFeeOverride: data.manualFeeOverride || false,
            // 🔑 권한 필드 로드: accessLevel이 없으면 role 기반으로 자동 설정
            accessLevel: (() => {
              // 1순위: accessLevel 필드가 있으면 그대로 사용
              if (data.accessLevel) {
                return data.accessLevel as "OWNER" | "ADMIN" | "STAFF";
              }
              // 2순위: role 필드를 기반으로 변환
              const role = String(data.role || "").toLowerCase().trim();
              if (role === "admin" || role === "관리자" || role === "owner") {
                return "OWNER" as const;
              } else if (role === "manager" || role === "총무") {
                return "ADMIN" as const;
              } else {
                return "STAFF" as const; // 기본값
              }
            })(),
            userId: data.userId,
            isDeleted: data.isDeleted || false,
            deletedAt: data.deletedAt ? safeToDate(data.deletedAt) : undefined,
            deletedBy: data.deletedBy,
        });
      });
      setMembers(membersList);
    } catch (error) {
      console.error("회원 목록 조회 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  // 🔥 회원 목록 조회
  useEffect(() => {
    if (!myTeam?.id) {
      setLoading(false);
      return;
    }
    fetchMembersList();
  }, [myTeam?.id]);

  // 🔥 중복 회원 정리 함수
  const handleRemoveDuplicates = async () => {
    if (!myTeam?.id) return;
    
    const confirmed = confirm(
      "중복 회원을 정리하시겠습니까?\n\n" +
      "• 같은 이름 + 전화번호 조합으로 중복 체크\n" +
      "• 가장 오래된 회원만 남기고 나머지 삭제\n" +
      "• 이 작업은 되돌릴 수 없습니다."
    );
    
    if (!confirmed) return;
    
    setLoading(true);
    try {
      const membersCollection = collection(db, "teams", myTeam.id, "members");
      const snapshot = await getDocs(membersCollection);
      
      // 🔥 중복 그룹 찾기 (이름 + 전화번호 조합)
      const memberGroups = new Map<string, Array<{ id: string; data: any; joinedAt: Date }>>();
      
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const name = (data.name || "").trim();
        const phone = (data.phone || "").trim();
        
        if (!name) return;
        
        // 🔥 키 생성: 이름 + 전화번호 (전화번호 없으면 이름만)
        const key = phone ? `${name}|${phone}` : name;
        
        if (!memberGroups.has(key)) {
          memberGroups.set(key, []);
        }
        
        const safeToDate = (ts: any): Date => {
          if (!ts) return new Date();
          if (ts instanceof Date) return ts;
          if (ts instanceof Timestamp) return ts.toDate();
          if (typeof ts?.toDate === "function") return ts.toDate();
          if (ts?.seconds) return new Date(ts.seconds * 1000);
          return new Date();
        };
        
        memberGroups.get(key)!.push({
          id: docSnap.id,
          data,
          joinedAt: safeToDate(data.joinedAt),
        });
      });
      
      // 🔥 중복 그룹에서 가장 오래된 것만 남기고 나머지 삭제
      const batch = writeBatch(db);
      let deletedCount = 0;
      const deletedNames: string[] = [];
      
      for (const [key, group] of memberGroups.entries()) {
        if (group.length <= 1) continue; // 중복 없음
        
        // 🔥 joinedAt 기준으로 정렬 (오래된 것부터)
        group.sort((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime());
        
        // 🔥 첫 번째(가장 오래된 것)만 남기고 나머지 삭제
        for (let i = 1; i < group.length; i++) {
          const memberRef = doc(membersCollection, group[i].id);
          batch.delete(memberRef);
          deletedCount++;
          deletedNames.push(group[i].data.name);
        }
      }
      
      if (deletedCount === 0) {
        alert("✅ 중복 회원이 없습니다.");
        setLoading(false);
        return;
      }
      
      // 🔥 batch commit
      await batch.commit();
      
      // 🔥 목록 새로고침
      await fetchMembersList();
      
      alert(
        `✅ 중복 회원 ${deletedCount}명 삭제 완료\n\n` +
        `삭제된 회원: ${deletedNames.slice(0, 5).join(", ")}${deletedNames.length > 5 ? ` 외 ${deletedNames.length - 5}명` : ""}`
      );
    } catch (error: any) {
      console.error("중복 회원 정리 실패:", error);
      alert(`❌ 중복 회원 정리에 실패했습니다.\n\n에러: ${error.message || "알 수 없는 오류"}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSuccess = () => {
    setShowAddModal(false);
    setShowBulkModal(false);
    setEditingMemberId(null);
    setMenuOpenId(null);
    setToastMessage("회원이 추가되었습니다");
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
    // 목록 refetch
    fetchMembersList();
  };

  // 🔥 QR 초대 생성
  const handleCreateInvite = async () => {
    if (!myTeam?.id) return;

    setQrLoading(true);
    try {
      const createInviteFn = httpsCallable(functions, "createInvite");
      const res: any = await createInviteFn({
        teamId: myTeam.id,
        role: "member",
        maxUses: 1,
      });

      if (res.data.ok) {
        const inviteId = res.data.inviteId;
        const url = `${window.location.origin}/qr?invite=${inviteId}`;
        setQrUrl(url);
        setShowQRModal(true);
        // 초대 목록 새로고침
        if (showInviteManagement) {
          fetchInvites();
        }
      } else {
        throw new Error("QR 생성에 실패했습니다.");
      }
    } catch (error: any) {
      console.error("QR 생성 오류:", error);
      setToastMessage(error.message || "QR 생성에 실패했습니다.");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } finally {
      setQrLoading(false);
    }
  };

  // 🔥 E-4: 초대 목록 조회
  const fetchInvites = async () => {
    if (!myTeam?.id || !user?.uid) return;

    setInvitesLoading(true);
    try {
      const invitesQuery = query(
        collection(db, "invites"),
        where("teamId", "==", myTeam.id),
        orderBy("createdAt", "desc"),
        limit(50)
      );
      const snapshot = await getDocs(invitesQuery);
      const invitesList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setInvites(invitesList);
    } catch (error: any) {
      console.error("초대 목록 조회 실패:", error);
      setToastMessage("초대 목록을 불러올 수 없습니다.");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } finally {
      setInvitesLoading(false);
    }
  };

  // 🔥 E-4: 초대 취소
  const handleRevokeInvite = async (inviteId: string) => {
    if (!confirm("이 초대를 취소하시겠습니까?")) return;

    try {
      const revokeInviteFn = httpsCallable(functions, "revokeInvite");
      await revokeInviteFn({ inviteId });
      setToastMessage("초대가 취소되었습니다.");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
      fetchInvites();
    } catch (error: any) {
      console.error("초대 취소 오류:", error);
      setToastMessage(error.message || "초대 취소에 실패했습니다.");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }
  };

  // 초대 관리 화면 열릴 때 목록 조회
  useEffect(() => {
    if (showInviteManagement && myTeam?.id) {
      fetchInvites();
    }
  }, [showInviteManagement, myTeam?.id]);

  // 🔥 빠른 상태 변경
  const handleQuickStatusChange = async (memberId: string, newStatus: "active" | "paused" | "expelled") => {
    if (!myTeam?.id) return;
    
    try {
      const memberRef = doc(db, "teams", myTeam.id, "members", memberId);
      const memberSnap = await getDoc(memberRef);
      const beforeData = memberSnap.exists() ? memberSnap.data() : {};
      const beforeStatus = beforeData.status || "active";
      
      // 🔥 상태 변경
      await updateDoc(memberRef, { status: newStatus });
      
      // 🔥 상태 변경 시 미납 계산 연동
      // 휴원/제명 상태로 변경되면 미납 계산에서 제외됨 (teamRules.ts의 calculateUnpaidMonths에서 처리)
      // 상태가 재원으로 복귀하면 다음 배치 실행 시 미납 계산이 다시 시작됨
      
      // 🔥 감사 로그
      if (user?.uid) {
        await addDoc(collection(db, "teams", myTeam.id, "auditLogs"), {
          actorId: user.uid,
          actorName: user.email || "시스템",
          action: "STATUS_CHANGE",
          targetMemberId: memberId,
          targetMemberName: beforeData.name || "",
          before: { status: beforeStatus },
          after: { status: newStatus },
          reason: newStatus === "paused" ? "휴원 처리 (미납 계산 제외)" : 
                  newStatus === "expelled" ? "제명 처리 (미납 계산 제외)" :
                  "재원 복귀 (미납 계산 재개)",
          createdAt: serverTimestamp(),
        });
      }
      
      setToastMessage(
        newStatus === "paused" ? "휴원 처리되었습니다 (미납 계산 제외)" :
        newStatus === "expelled" ? "제명 처리되었습니다 (미납 계산 제외)" :
        "재원 상태로 변경되었습니다 (미납 계산 재개)"
      );
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
      fetchMembersList();
    } catch (error: any) {
      console.error("상태 변경 실패:", error);
      alert(`상태 변경에 실패했습니다.\n\n에러: ${error.message || "알 수 없는 오류"}`);
    }
  };

  // 🔑 권한 변경 (OWNER 전용)
  const handleAccessLevelChange = async (memberId: string, memberName: string, newAccessLevel: "OWNER" | "ADMIN" | "STAFF") => {
    if (!myTeam?.id || currentUserAccessLevel !== "OWNER") return;
    
    // 🔑 자기 자신의 권한 변경 불가
    const targetMember = members.find(m => m.id === memberId);
    if (targetMember?.userId === user?.uid) {
      alert("자기 자신의 권한은 변경할 수 없습니다.");
      return;
    }
    
    // 🔑 OWNER 최소 1명 유지 체크
    if (newAccessLevel !== "OWNER" && targetMember?.accessLevel === "OWNER") {
      // 현재 OWNER 수 확인
      const ownerCount = members.filter(m => m.accessLevel === "OWNER" && m.id !== memberId).length;
      if (ownerCount === 0) {
        alert("⚠️ OWNER는 최소 1명 이상 유지되어야 합니다.\n\n다른 회원을 OWNER로 지정한 후 변경해주세요.");
        return;
      }
    }
    
    // 🔑 STAFF → OWNER 변경 시 2단계 확인
    let confirmed = false;
    if (targetMember?.accessLevel === "STAFF" && newAccessLevel === "OWNER") {
      const firstConfirm = confirm(
        `⚠️ 중요: "${memberName}" 회원을 OWNER로 승격하시겠습니까?\n\n` +
        `OWNER 권한:\n` +
        `• 모든 회원 삭제 가능\n` +
        `• 중복 제거 실행 가능\n` +
        `• 권한 변경 가능\n` +
        `• 모든 데이터 수정 가능\n\n` +
        `정말로 OWNER로 승격하시겠습니까?`
      );
      if (!firstConfirm) return;
      
      confirmed = confirm(
        `최종 확인: "${memberName}" 회원을 OWNER로 승격합니다.\n\n` +
        `이 작업은 되돌릴 수 없으며, 모든 권한이 부여됩니다.`
      );
    } else {
      confirmed = confirm(
        `"${memberName}" 회원의 권한을 "${newAccessLevel}"로 변경하시겠습니까?\n\n` +
        `• OWNER: 모든 권한 (삭제, 중복 제거 포함)\n` +
        `• ADMIN: 회원 수정, 일괄 등록 가능\n` +
        `• STAFF: 조회만 가능`
      );
    }
    if (!confirmed) return;
    
    try {
      const memberRef = doc(db, "teams", myTeam.id, "members", memberId);
      const memberSnap = await getDoc(memberRef);
      const beforeData = memberSnap.exists() ? memberSnap.data() : {};
      
      await updateDoc(memberRef, { accessLevel: newAccessLevel });
      
      // 🔑 권한 변경 이력 로그 (accessLogs 컬렉션)
      if (user?.uid && targetMember?.userId) {
        await addDoc(collection(db, "teams", myTeam.id, "accessLogs"), {
          targetUserId: targetMember.userId,
          targetMemberId: memberId,
          targetMemberName: memberName,
          before: beforeData.accessLevel || "STAFF",
          after: newAccessLevel,
          changedBy: user.uid,
          changedByName: user.email || "시스템",
          changedAt: serverTimestamp(),
        });
      }
      
      // 🔑 감사 로그 (auditLogs - 기존 로그와 통합)
      if (user?.uid) {
        await addDoc(collection(db, "teams", myTeam.id, "auditLogs"), {
          actorId: user.uid,
          actorName: user.email || "시스템",
          action: "ACCESS_LEVEL_CHANGE",
          targetMemberId: memberId,
          targetMemberName: memberName,
          before: { accessLevel: beforeData.accessLevel || "STAFF" },
          after: { accessLevel: newAccessLevel },
          createdAt: serverTimestamp(),
        });
      }
      
      setToastMessage(`권한이 "${newAccessLevel}"로 변경되었습니다`);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
      fetchMembersList();
    } catch (error: any) {
      console.error("권한 변경 실패:", error);
      alert(`권한 변경에 실패했습니다.\n\n에러: ${error.message || "알 수 없는 오류"}`);
    }
  };

  // 🔥 회원 복구 (Soft Delete 복구 - OWNER 전용)
  const handleRestoreMember = async (memberId: string, memberName: string) => {
    if (!myTeam?.id || currentUserAccessLevel !== "OWNER") return;
    
    const confirmed = confirm(
      `"${memberName}" 회원을 복구하시겠습니까?\n\n` +
      `• 삭제된 회원이 목록에 다시 표시됩니다\n` +
      `• 모든 데이터가 그대로 유지됩니다\n` +
      `• 복구 이력이 기록됩니다`
    );
    if (!confirmed) return;
    
    try {
      const memberRef = doc(db, "teams", myTeam.id, "members", memberId);
      const memberSnap = await getDoc(memberRef);
      const beforeData = memberSnap.exists() ? memberSnap.data() : {};
      
      // 🔥 복구: isDeleted를 false로 변경 (deletedAt/deletedBy는 유지)
      await updateDoc(memberRef, {
        isDeleted: false,
      });
      
      // 🔑 복구 이력 로그 (accessLogs에 기록)
      if (user?.uid) {
        const targetMember = members.find(m => m.id === memberId);
        if (targetMember?.userId) {
          await addDoc(collection(db, "teams", myTeam.id, "accessLogs"), {
            targetUserId: targetMember.userId,
            targetMemberId: memberId,
            targetMemberName: memberName,
            action: "RESTORE",
            before: "DELETED",
            after: "RESTORED",
            changedBy: user.uid,
            changedByName: user.email || "시스템",
            changedAt: serverTimestamp(),
          });
        }
      }
      
      // 🔑 감사 로그 (auditLogs - 기존 로그와 통합)
      if (user?.uid) {
        await addDoc(collection(db, "teams", myTeam.id, "auditLogs"), {
          actorId: user.uid,
          actorName: user.email || "시스템",
          action: "MEMBER_RESTORE",
          targetMemberId: memberId,
          targetMemberName: memberName,
          before: { isDeleted: true },
          after: { isDeleted: false },
          createdAt: serverTimestamp(),
        });
      }
      
      setToastMessage(`"${memberName}" 회원이 복구되었습니다`);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
      fetchMembersList();
    } catch (error: any) {
      console.error("회원 복구 실패:", error);
      alert(`회원 복구에 실패했습니다.\n\n에러: ${error.message || "알 수 없는 오류"}`);
    }
  };

  // 🔥 회원 삭제 (Soft Delete - 논리 삭제)
  const handleDeleteMember = async (memberId: string, memberName: string) => {
    if (!myTeam?.id) return;
    
    const confirmed = confirm(
      `정말로 "${memberName}" 회원을 삭제하시겠습니까?\n\n` +
      `• 삭제된 회원은 목록에서 숨겨집니다\n` +
      `• 데이터는 보존되어 이력 추적이 가능합니다\n` +
      `• 필요시 복구할 수 있습니다`
    );
    if (!confirmed) return;
    
    try {
      const memberRef = doc(db, "teams", myTeam.id, "members", memberId);
      const memberSnap = await getDoc(memberRef);
      const beforeData = memberSnap.exists() ? memberSnap.data() : {};
      
      // 🔥 Soft Delete: isDeleted 플래그 설정
      await updateDoc(memberRef, {
        isDeleted: true,
        deletedAt: serverTimestamp(),
        deletedBy: user?.uid || null,
      });
      
      // 감사 로그
      if (user?.uid) {
        await addDoc(collection(db, "teams", myTeam.id, "auditLogs"), {
          actorId: user.uid,
          actorName: user.email || "시스템",
          action: "MEMBER_DELETE",
          targetMemberId: memberId,
          targetMemberName: memberName,
          before: beforeData,
          after: { isDeleted: true },
          createdAt: serverTimestamp(),
        });
      }
      
      setToastMessage("회원이 삭제되었습니다 (데이터는 보존됨)");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
      fetchMembersList();
    } catch (error: any) {
      console.error("회원 삭제 실패:", error);
      alert(`회원 삭제에 실패했습니다.\n\n에러: ${error.message || "알 수 없는 오류"}`);
    }
  };

  // 🔥 5. 월별 배치 시뮬레이터 실행 (회비 자동 계산) — 로딩 분기보다 위에서 계산 (일괄 선택 훅용)
  const processedMembers = simulateMonthlyBatch(members as TeamMemberType[], new Date());

  // 🔥 2. 필터 적용
  const filteredMembers = processedMembers.filter((member) => {
    // 역할 필터
    const isExecutive = member.role !== "일반";
    if (roleFilter === "executive" && !isExecutive) return false;
    if (roleFilter === "general" && isExecutive) return false;

    // 회비 필터
    if (feeFilter !== "all") {
      if (feeFilter === "exempt" && member.feePlan !== "exempt") return false;
      if (feeFilter === "monthly" && member.feePlan !== "monthly") return false;
      if (feeFilter === "annual" && member.feePlan !== "annual") return false;
    }

    // 상태 필터
    if (statusFilter !== "all" && member.status !== statusFilter) return false;

    return true;
  });

  const corruptMemberCandidates = useMemo(
    () =>
      members.filter(
        (m) =>
          !m.isDeleted &&
          !m.userId &&
          isCorruptedMemberDisplayName(m.name)
      ),
    [members]
  );

  const duplicateNameWarnings = useMemo(
    () =>
      findActiveMemberDuplicateNameGroups(
        members.map((m) => ({
          id: m.id,
          name: m.name,
          status: m.status,
          isDeleted: m.isDeleted,
        }))
      ),
    [members]
  );

  const selectableFilteredMembers = useMemo(
    () =>
      filteredMembers.filter(
        (m) => !m.isDeleted && !m.userId && m.accessLevel !== "OWNER"
      ),
    [filteredMembers]
  );

  useEffect(() => {
    setSelectedMemberIds((prev) =>
      prev.filter((id) => filteredMembers.some((m) => m.id === id))
    );
  }, [filteredMembers]);

  const handleToggleSelectAllFiltered = () => {
    const ids = selectableFilteredMembers.map((m) => m.id);
    const allOn =
      ids.length > 0 && ids.every((id) => selectedMemberIds.includes(id));
    setSelectedMemberIds(allOn ? [] : [...ids]);
  };

  const runBulkSoftDelete = async (ids: string[]) => {
    if (!myTeam?.id || ids.length === 0) return;
    setBulkDeleting(true);
    try {
      const chunkSize = 400;
      for (let i = 0; i < ids.length; i += chunkSize) {
        const chunk = ids.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        for (const id of chunk) {
          const ref = doc(db, "teams", myTeam.id, "members", id);
          batch.update(ref, {
            isDeleted: true,
            deletedAt: serverTimestamp(),
            deletedBy: user?.uid || null,
          });
        }
        await batch.commit();
      }
      if (user?.uid) {
        await addDoc(collection(db, "teams", myTeam.id, "auditLogs"), {
          actorId: user.uid,
          actorName: user.email || "시스템",
          action: "MEMBER_BULK_SOFT_DELETE",
          targetMemberIds: ids,
          count: ids.length,
          createdAt: serverTimestamp(),
        });
      }
      setToastMessage(`${ids.length}명을 삭제 처리했습니다 (데이터 보존·복구 가능)`);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2500);
      setSelectedMemberIds([]);
      setShowBulkSoftDeleteModal(false);
      setShowCorruptBulkModal(false);
      await fetchMembersList();
    } catch (e: any) {
      console.error(e);
      alert(`일괄 삭제에 실패했습니다.\n\n${e?.message || "알 수 없는 오류"}`);
    } finally {
      setBulkDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">로딩 중...</p>
        </div>
      </div>
    );
  }

  // 🔥 역할별 그룹화
  const roleGroups: { [key: string]: TeamMember[] } = {};
  filteredMembers.forEach((member) => {
    const role = member.role;
    if (!roleGroups[role]) {
      roleGroups[role] = [];
    }
    roleGroups[role].push(member);
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full max-w-none md:mx-auto md:max-w-4xl py-6">
        {duplicateNameWarnings.length > 0 && viewMode === "all" && (
          <div
            className="mb-4 rounded-lg border border-amber-400 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-sm"
            role="status"
          >
            <p className="font-semibold">
              같은 이름의 활성 회원이 {duplicateNameWarnings.length}건 있습니다. (중복 문서 가능성)
            </p>
            <ul className="mt-2 max-h-40 list-disc space-y-1 overflow-y-auto pl-5">
              {duplicateNameWarnings.map((g) => (
                <li key={g.normalizedName}>
                  <span className="font-medium">{g.displayName}</span> — {g.memberIds.length}명 · 문서 ID:{" "}
                  <span className="break-all font-mono text-xs">{g.memberIds.join(", ")}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs leading-snug text-amber-900/95">
              멤버 직접 추가(전화 없음) 후 PDF·CSV로 같은 사람을 넣으면 키가 달라 별도 문서가 생길 수 있습니다. 불필요한
              줄은 삭제하거나 한쪽 문서로 정보를 합쳐 주세요.
            </p>
          </div>
        )}
        <div className="mb-6">
          <button
            onClick={() => navigate(`/sports/${type}/team`)}
            className="text-blue-600 hover:text-blue-700 mb-4"
          >
            ← 뒤로
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {viewMode === "admin" ? "🔑 운영진 관리" : "회원 관리"}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {viewMode === "admin" ? (
                  <>
                    운영진 <span className="font-semibold text-gray-900">{filteredMembers.length}명</span>
                  </>
                ) : (
                  <>
                    총 <span className="font-semibold text-gray-900">{members.length}명</span>
                    {filteredMembers.length !== members.length && (
                      <span className="ml-2">(필터: <span className="font-semibold">{filteredMembers.length}명</span>)</span>
                    )}
                  </>
                )}
              </p>
            </div>
            {/* 🔑 뷰 모드 전환 (OWNER만) */}
            {currentUserAccessLevel === "OWNER" && (
              <div className="flex gap-2 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode("all")}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === "all"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  전체 회원
                </button>
                <button
                  onClick={() => setViewMode("admin")}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === "admin"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  🔑 운영진 관리
                </button>
              </div>
            )}
            <div className="flex gap-2">
              {/* 🔥 운영자 버튼 정리 - 권한별 표시 */}
              {/* 일괄 등록: OWNER, ADMIN만 */}
              {(currentUserAccessLevel === "OWNER" || currentUserAccessLevel === "ADMIN") && (
                <button
                  onClick={() => setShowBulkModal(true)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm font-medium"
                  title="엑셀/구글 시트로 일괄 등록"
                >
                  📋 일괄 등록
                </button>
              )}
              
              {/* 회원 추가: 모든 권한 */}
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                title="개별 회원 추가"
              >
                + 회원 추가
              </button>
              
              {/* 🔥 QR 초대 생성: coach/staff 이상만 (F-5: 권한 가드) */}
              {teamRole && hasPower(teamRole as Role, "coach") && (
                <>
                  <button
                    onClick={handleCreateInvite}
                    disabled={qrLoading}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
                    title="QR 초대 코드 생성 (24시간 유효, 1회 사용)"
                  >
                    {qrLoading ? "생성 중..." : "📱 QR 초대 생성"}
                  </button>
                  <button
                    onClick={() => setShowInviteManagement(!showInviteManagement)}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium"
                    title="초대 관리"
                  >
                    📋 초대 관리
                  </button>
                </>
              )}
              
              {/* 🔥 OWNER 전용: 중복 제거 */}
              {currentUserAccessLevel === "OWNER" && (
                <>
                  <button
                    onClick={handleRemoveDuplicates}
                    disabled={loading}
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
                    title="중복 회원 정리 (같은 이름+전화번호 조합) - OWNER 전용"
                  >
                    🔄 중복 제거
                  </button>
                  <button
                    onClick={() => setShowAccessLogsModal(true)}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium"
                    title="권한 변경 이력 조회 - OWNER 전용"
                  >
                    📋 권한 이력
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 🔥 참여 요청 승인 섹션 (팀장만) */}
        {myTeam?.id && (currentUserAccessLevel === "OWNER" || teamRole === "admin") && (
          <TeamJoinRequestsSection
            teamId={myTeam.id}
            onApproved={fetchMembersList}
          />
        )}

        {/* 🔥 2. 필터 UI */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            {/* 역할 필터 */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">역할</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setRoleFilter("all")}
                  className={`px-3 py-1 rounded text-sm ${
                    roleFilter === "all"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  전체
                </button>
                <button
                  onClick={() => setRoleFilter("executive")}
                  className={`px-3 py-1 rounded text-sm ${
                    roleFilter === "executive"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  임원
                </button>
                <button
                  onClick={() => setRoleFilter("general")}
                  className={`px-3 py-1 rounded text-sm ${
                    roleFilter === "general"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  일반
                </button>
              </div>
            </div>

            {/* 회비 필터 */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">회비</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setFeeFilter("all")}
                  className={`px-3 py-1 rounded text-sm ${
                    feeFilter === "all"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  전체
                </button>
                <button
                  onClick={() => setFeeFilter("exempt")}
                  className={`px-3 py-1 rounded text-sm ${
                    feeFilter === "exempt"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  면제
                </button>
                <button
                  onClick={() => setFeeFilter("monthly")}
                  className={`px-3 py-1 rounded text-sm ${
                    feeFilter === "monthly"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  월회비
                </button>
                <button
                  onClick={() => setFeeFilter("annual")}
                  className={`px-3 py-1 rounded text-sm ${
                    feeFilter === "annual"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  연회비
                </button>
              </div>
            </div>

            {/* 상태 필터 */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">상태</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setStatusFilter("all")}
                  className={`px-3 py-1 rounded text-sm ${
                    statusFilter === "all"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  전체
                </button>
                <button
                  onClick={() => setStatusFilter("active")}
                  className={`px-3 py-1 rounded text-sm ${
                    statusFilter === "active"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  재원
                </button>
                <button
                  onClick={() => setStatusFilter("paused")}
                  className={`px-3 py-1 rounded text-sm ${
                    statusFilter === "paused"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  휴원
                </button>
                <button
                  onClick={() => setStatusFilter("expelled")}
                  className={`px-3 py-1 rounded text-sm ${
                    statusFilter === "expelled"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  제명
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 🔥 삭제된 회원 보기 토글 (OWNER 전용) */}
        {currentUserAccessLevel === "OWNER" && (
          <div className="mb-4 flex items-center justify-between bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="showDeletedMembers"
                checked={showDeletedMembers}
                onChange={(e) => setShowDeletedMembers(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="showDeletedMembers" className="text-sm font-medium text-gray-700 cursor-pointer">
                삭제된 회원 보기
              </label>
            </div>
            {showDeletedMembers && (
              <span className="text-xs text-yellow-700">
                {members.filter(m => m.isDeleted).length}명의 삭제된 회원이 표시됩니다
              </span>
            )}
          </div>
        )}

        {/* OWNER: 일괄 선택 / 조건 삭제 */}
        {currentUserAccessLevel === "OWNER" && members.length > 0 && (
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm">
            <button
              type="button"
              onClick={handleToggleSelectAllFiltered}
              disabled={selectableFilteredMembers.length === 0}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              전체 선택
            </button>
            <button
              type="button"
              onClick={() => setSelectedMemberIds([])}
              disabled={selectedMemberIds.length === 0}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              선택 해제
            </button>
            <button
              type="button"
              onClick={() => {
                if (selectedMemberIds.length === 0) {
                  alert("삭제할 회원을 선택해주세요.");
                  return;
                }
                setShowBulkSoftDeleteModal(true);
              }}
              disabled={selectedMemberIds.length === 0}
              className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              선택 삭제 ({selectedMemberIds.length})
            </button>
            <button
              type="button"
              onClick={() => {
                if (corruptMemberCandidates.length === 0) {
                  alert("CSV/PDF 오류로 의심되는 이름 패턴이 없습니다.");
                  return;
                }
                setShowCorruptBulkModal(true);
              }}
              className="rounded-md border border-amber-400 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-900 hover:bg-amber-100"
            >
              CSV 오류 데이터 일괄 삭제
            </button>
            <span className="text-xs text-gray-500">
              계정 연결·OWNER는 선택에서 제외됩니다. 삭제는 목록 숨김(복구 가능)입니다.
            </span>
          </div>
        )}

        {/* 🔥 실전 회원 테이블 */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {currentUserAccessLevel === "OWNER" && (
                    <th className="w-10 px-2 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">
                      <span className="sr-only">선택</span>
                    </th>
                  )}
                  {viewMode === "admin" ? (
                    <>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">이름</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">권한</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">변경</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">상태</th>
                    </>
                  ) : (
                    <>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">이름</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">역할</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">회비플랜</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">상태</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">미납</th>
                      {currentUserAccessLevel === "OWNER" && (
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">권한</th>
                      )}
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">비고</th>
                      <th className="w-12 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700"></th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredMembers.length === 0 ? (
                  <tr>
                    <td colSpan={viewMode === "admin" ? 4 + (currentUserAccessLevel === "OWNER" ? 1 : 0) : 7 + (currentUserAccessLevel === "OWNER" ? 2 : 0)} className="px-4 py-8 text-center text-gray-500">
                      {viewMode === "admin" 
                        ? "운영진이 없습니다. (accessLevel이 OWNER/ADMIN/STAFF인 회원만 표시됩니다)"
                        : members.length === 0 ? "등록된 회원이 없습니다." : "필터 조건에 맞는 회원이 없습니다."}
                    </td>
                  </tr>
                ) : (
                  filteredMembers.map((member) => {
                    const isExecutive = member.role !== "일반";
                    const unpaidMonths = member.unpaidMonths || 0;
                    
                    // 🔥 색상 코딩
                    let rowBgColor = "";
                    let statusColor = "";
                    
                    // 🟦 임원 배경 강조 (우선순위 높음)
                    if (isExecutive) {
                      rowBgColor = "bg-blue-50";
                    }
                    
                    // 🔥 삭제된 회원 배경 강조
                    if (member.isDeleted) {
                      rowBgColor = "bg-gray-200 opacity-60";
                      statusColor = "text-gray-500 line-through";
                    }
                    // 상태별 색상
                    else if (member.status === "paused" || member.status === "expelled") {
                      rowBgColor = "bg-red-50";
                      statusColor = "text-red-700 font-semibold";
                    } else if (unpaidMonths >= 1 && unpaidMonths <= 2) {
                      if (!isExecutive) rowBgColor = "bg-yellow-50";
                      statusColor = "text-yellow-700";
                    } else if (member.status === "active") {
                      if (!isExecutive) rowBgColor = "bg-green-50";
                      statusColor = "text-green-700 font-semibold";
                    }
                    
                    // 회비플랜 표시
                    const feePlanText = 
                      member.feePlan === "exempt" ? "면제" :
                      member.feePlan === "annual" ? "연회비" :
                      "월회비";
                    
                    // 상태 표시
                    const statusText = 
                      member.status === "active" ? "재원" :
                      member.status === "paused" ? "휴원" :
                      member.status === "expelled" ? "제명" :
                      "재원";
                    
                    return (
                      <tr 
                        key={member.id} 
                        className={`${rowBgColor} ${(currentUserAccessLevel === "OWNER" || currentUserAccessLevel === "ADMIN") ? "cursor-pointer hover:bg-blue-100" : ""} transition-colors`}
                        onClick={(e) => {
                          // 🔥 메뉴 클릭은 무시
                          if ((e.target as HTMLElement).closest('.member-menu')) return;
                          // 🔑 OWNER, ADMIN만 수정 가능
                          if (currentUserAccessLevel === "OWNER" || currentUserAccessLevel === "ADMIN") {
                            setEditingMemberId(member.id);
                          }
                        }}
                        onDoubleClick={() => {
                          // 🔑 OWNER, ADMIN만 수정 가능
                          if (currentUserAccessLevel === "OWNER" || currentUserAccessLevel === "ADMIN") {
                            setEditingMemberId(member.id);
                          }
                        }} // 🔥 더블클릭 = 수정
                      >
                        {/* 🔑 운영진 관리 모드 */}
                        {viewMode === "admin" ? (
                          <>
                            {currentUserAccessLevel === "OWNER" && (
                              <td className="px-2 py-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                {!member.isDeleted && !member.userId && member.accessLevel !== "OWNER" ? (
                                  <input
                                    type="checkbox"
                                    checked={selectedMemberIds.includes(member.id)}
                                    onChange={() =>
                                      setSelectedMemberIds((prev) =>
                                        prev.includes(member.id)
                                          ? prev.filter((id) => id !== member.id)
                                          : [...prev, member.id]
                                      )
                                    }
                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                  />
                                ) : (
                                  <span className="text-xs text-gray-300">—</span>
                                )}
                              </td>
                            )}
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="font-medium text-gray-900">{member.name}</div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`text-sm font-semibold ${
                                member.accessLevel === "OWNER" ? "text-purple-700" :
                                member.accessLevel === "ADMIN" ? "text-blue-700" :
                                "text-gray-700"
                              }`}>
                                {member.accessLevel || "STAFF"}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              {/* 🔑 자기 자신은 변경 불가 */}
                              {member.userId === user?.uid ? (
                                <span className="text-sm font-semibold text-purple-700">
                                  🔒 변경 불가
                                </span>
                              ) : (
                                <select
                                  value={member.accessLevel || "STAFF"}
                                  onChange={(e) => handleAccessLevelChange(member.id, member.name, e.target.value as "OWNER" | "ADMIN" | "STAFF")}
                                  onClick={(e) => e.stopPropagation()} // 🔥 행 클릭 이벤트 방지
                                  className="text-sm font-medium border border-gray-300 bg-white cursor-pointer focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
                                >
                                  <option value="STAFF">STAFF</option>
                                  <option value="ADMIN">ADMIN</option>
                                  <option value="OWNER">OWNER</option>
                                </select>
                              )}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`text-sm font-medium ${statusColor}`}>
                                {statusText}
                              </span>
                            </td>
                          </>
                        ) : (
                          // 전체 회원 모드: 기존 구조
                          <>
                            {currentUserAccessLevel === "OWNER" && (
                              <td className="px-2 py-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                {!member.isDeleted && !member.userId && member.accessLevel !== "OWNER" ? (
                                  <input
                                    type="checkbox"
                                    checked={selectedMemberIds.includes(member.id)}
                                    onChange={() =>
                                      setSelectedMemberIds((prev) =>
                                        prev.includes(member.id)
                                          ? prev.filter((id) => id !== member.id)
                                          : [...prev, member.id]
                                      )
                                    }
                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                  />
                                ) : (
                                  <span className="text-xs text-gray-300">—</span>
                                )}
                              </td>
                            )}
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="font-medium text-gray-900">{member.name}</div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`text-sm ${isExecutive ? "font-semibold text-blue-700" : "text-gray-700"}`}>
                                {member.role}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="text-sm text-gray-700">{feePlanText}</span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              {/* 🔑 OWNER, ADMIN만 상태 변경 가능 */}
                              {(currentUserAccessLevel === "OWNER" || currentUserAccessLevel === "ADMIN") ? (
                                <select
                                  value={member.status}
                                  onChange={(e) => handleQuickStatusChange(member.id, e.target.value as "active" | "paused" | "expelled")}
                                  onClick={(e) => e.stopPropagation()} // 🔥 행 클릭 이벤트 방지
                                  className={`text-sm font-medium border-0 bg-transparent cursor-pointer focus:ring-2 focus:ring-blue-500 rounded px-2 py-1 ${statusColor}`}
                                >
                                  <option value="active">재원</option>
                                  <option value="paused">휴원</option>
                                  <option value="expelled">제명</option>
                                </select>
                              ) : (
                                <span className={`text-sm font-medium ${statusColor}`}>
                                  {statusText}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`text-sm font-medium ${
                                unpaidMonths === 0 ? "text-gray-500" :
                                unpaidMonths >= 1 && unpaidMonths <= 2 ? "text-yellow-700" :
                                "text-red-700"
                              }`}>
                                {unpaidMonths}
                              </span>
                            </td>
                            
                            {/* 🔑 권한 컬럼 (OWNER만 표시) */}
                            {currentUserAccessLevel === "OWNER" && (
                              <td className="px-4 py-3 whitespace-nowrap">
                                {/* 🔑 자기 자신은 변경 불가 */}
                                {member.userId === user?.uid ? (
                                  <span className="text-sm font-semibold text-purple-700">
                                    {member.accessLevel || "STAFF"} (본인)
                                  </span>
                                ) : (
                                  <select
                                    value={member.accessLevel || "STAFF"}
                                    onChange={(e) => handleAccessLevelChange(member.id, member.name, e.target.value as "OWNER" | "ADMIN" | "STAFF")}
                                    onClick={(e) => e.stopPropagation()} // 🔥 행 클릭 이벤트 방지
                                    className="text-sm font-medium border border-gray-300 bg-white cursor-pointer focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
                                  >
                                    <option value="STAFF">STAFF</option>
                                    <option value="ADMIN">ADMIN</option>
                                    <option value="OWNER">OWNER</option>
                                  </select>
                                )}
                              </td>
                            )}
                            
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="text-sm text-gray-600">{member.memo || "-"}</span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap relative">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setMenuOpenId(menuOpenId === member.id ? null : member.id);
                                }}
                                className="member-menu text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100"
                                title="메뉴"
                              >
                                ⋮
                              </button>
                              {menuOpenId === member.id && (
                                <div 
                                  className="member-menu absolute right-0 mt-1 w-32 bg-white rounded-lg shadow-lg border border-gray-200 z-10"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {/* 수정: OWNER, ADMIN만 */}
                                  {(currentUserAccessLevel === "OWNER" || currentUserAccessLevel === "ADMIN") && (
                                    <button
                                      onClick={() => {
                                        setEditingMemberId(member.id);
                                        setMenuOpenId(null);
                                      }}
                                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-t-lg"
                                    >
                                      ✏️ 수정
                                    </button>
                                  )}
                                  
                                  {/* 상태 변경: OWNER, ADMIN만 */}
                                  {(currentUserAccessLevel === "OWNER" || currentUserAccessLevel === "ADMIN") && (
                                    <button
                                      onClick={() => {
                                        handleQuickStatusChange(member.id, member.status === "active" ? "paused" : "active");
                                        setMenuOpenId(null);
                                      }}
                                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                    >
                                      🔄 상태 변경
                                    </button>
                                  )}
                                  
                              {/* 🔑 OWNER 전용: 회원 삭제/복구 */}
                              {currentUserAccessLevel === "OWNER" && (
                                <>
                                  {member.isDeleted ? (
                                    <button
                                      onClick={() => {
                                        handleRestoreMember(member.id, member.name);
                                        setMenuOpenId(null);
                                      }}
                                      className="w-full text-left px-4 py-2 text-sm text-green-600 hover:bg-green-50 rounded-b-lg"
                                      title="Soft Delete 복구: 삭제된 회원을 다시 활성화합니다 - OWNER 전용"
                                    >
                                      ♻️ 복구
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        handleDeleteMember(member.id, member.name);
                                        setMenuOpenId(null);
                                      }}
                                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-b-lg"
                                      title="Soft Delete: 데이터는 보존되고 목록에서만 숨겨집니다 - OWNER 전용"
                                    >
                                      🗑️ 삭제
                                    </button>
                                  )}
                                </>
                              )}
                                </div>
                              )}
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {members.length === 0 && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <p className="text-gray-500 mb-4">등록된 회원이 없습니다.</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              첫 회원 추가하기
            </button>
          </div>
        )}
      </div>

      {/* 회원 추가/수정 모달 */}
      {(showAddModal || editingMemberId) && (
        <MemberAddModal
          teamId={myTeam?.id || ""}
          memberId={editingMemberId || undefined} // 🔥 수정 모드: memberId 전달
          onClose={() => {
            setShowAddModal(false);
            setEditingMemberId(null); // 🔥 모달 닫을 때 초기화
            setMenuOpenId(null);
          }}
          onSuccess={handleAddSuccess}
        />
      )}

      {/* 메뉴 외부 클릭 시 닫기 */}
      {menuOpenId && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setMenuOpenId(null)}
        />
      )}

      {showBulkSoftDeleteModal && currentUserAccessLevel === "OWNER" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bulk-delete-title"
        >
          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
            <h3 id="bulk-delete-title" className="text-lg font-semibold text-gray-900">
              선택한 회원 삭제
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              총 <strong>{filteredMembers.length}</strong>명(현재 필터) 중{" "}
              <strong>{selectedMemberIds.length}</strong>명을 삭제 처리합니다. 목록에서만 숨겨지고 데이터는
              보존됩니다.
            </p>
            <ul className="mt-3 max-h-40 list-inside list-disc overflow-y-auto rounded border border-gray-100 bg-gray-50 p-2 text-xs text-gray-700">
              {selectedMemberIds.slice(0, 15).map((id) => {
                const m = members.find((x) => x.id === id);
                return (
                  <li key={id} className="truncate">
                    {m?.name ?? id}
                  </li>
                );
              })}
              {selectedMemberIds.length > 15 && (
                <li className="text-gray-500">외 {selectedMemberIds.length - 15}명…</li>
              )}
            </ul>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                disabled={bulkDeleting}
                onClick={() => setShowBulkSoftDeleteModal(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                취소
              </button>
              <button
                type="button"
                disabled={bulkDeleting}
                onClick={() => runBulkSoftDelete(selectedMemberIds)}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {bulkDeleting ? "처리 중…" : "삭제 실행"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCorruptBulkModal && currentUserAccessLevel === "OWNER" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="corrupt-bulk-title"
        >
          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
            <h3 id="corrupt-bulk-title" className="text-lg font-semibold text-gray-900">
              CSV 오류 데이터 일괄 삭제
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              이름에 PDF/깨진 CSV 패턴이 보이는 회원만 골랐습니다. 계정이 연결된 회원은 안전을 위해
              제외했습니다.
            </p>
            <p className="mt-2 text-sm font-medium text-amber-800">
              총 {members.filter((m) => !m.isDeleted).length}명 중{" "}
              <strong>{corruptMemberCandidates.length}</strong>명이 삭제 대상입니다.
            </p>
            <ul className="mt-3 max-h-48 list-inside list-disc overflow-y-auto rounded border border-amber-100 bg-amber-50 p-2 text-xs text-gray-800">
              {corruptMemberCandidates.slice(0, 25).map((m) => (
                <li key={m.id} className="truncate">
                  {m.name}
                </li>
              ))}
              {corruptMemberCandidates.length > 25 && (
                <li className="text-amber-900">외 {corruptMemberCandidates.length - 25}명…</li>
              )}
            </ul>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                disabled={bulkDeleting}
                onClick={() => setShowCorruptBulkModal(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                취소
              </button>
              <button
                type="button"
                disabled={bulkDeleting || corruptMemberCandidates.length === 0}
                onClick={() =>
                  runBulkSoftDelete(corruptMemberCandidates.map((m) => m.id))
                }
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {bulkDeleting ? "처리 중…" : `${corruptMemberCandidates.length}명 삭제 실행`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 일괄 등록 모달 */}
      {showBulkModal && (
        <BulkImportModal
          teamId={myTeam?.id || ""}
          onClose={() => setShowBulkModal(false)}
          onSuccess={handleAddSuccess}
        />
      )}

      {/* 🔑 권한 변경 이력 모달 (OWNER 전용) */}
      {showAccessLogsModal && currentUserAccessLevel === "OWNER" && (
        <AccessLogsModal
          teamId={myTeam?.id || ""}
          onClose={() => setShowAccessLogsModal(false)}
        />
      )}

      {/* 🔥 감사 타임라인 모달 (OWNER 전용) */}
      {showAuditTimelineModal && currentUserAccessLevel === "OWNER" && (
        <AuditTimelineModal
          teamId={myTeam?.id || ""}
          onClose={() => setShowAuditTimelineModal(false)}
        />
      )}

      {/* 📊 월간 운영 리포트 모달 (OWNER 전용) */}
      {showMonthlyReportModal && currentUserAccessLevel === "OWNER" && (
        <MonthlyReportModal
          teamId={myTeam?.id || ""}
          members={members}
          onClose={() => setShowMonthlyReportModal(false)}
        />
      )}

      {/* 토스트 */}
      {showToast && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50">
          {toastMessage}
        </div>
      )}
    </div>
  );
}

// 🔥 회원 추가/수정 모달
function MemberAddModal({
  teamId,
  memberId, // 🔥 수정 모드: memberId 전달 (없으면 신규 추가)
  onClose,
  onSuccess,
}: {
  teamId: string;
  memberId?: string; // 🔥 선택적: 있으면 수정, 없으면 신규
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { user } = useAuth(); // 🔥 user 추가
  const [name, setName] = useState("");
  const [phone, setPhone] = useState(""); // 🔥 전화번호
  const [jerseyNumber, setJerseyNumber] = useState(""); // 🔥 배번
  const [squad, setSquad] = useState<"청룡" | "백호" | "">("");
  const [role, setRole] = useState<TeamMember["role"]>("일반");
  const [feePlan, setFeePlan] = useState<"monthly" | "annual" | "exempt">("monthly");
  const [status, setStatus] = useState<"active" | "paused" | "expelled">("active"); // 🔥 상태 필드 추가
  const [phoneLast4, setPhoneLast4] = useState(""); // 하위 호환성
  const [memo, setMemo] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMember, setLoadingMember] = useState(false); // 🔥 기존 회원 데이터 로딩 상태

  // ✅ body 스크롤 락 관리
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // 🔥 수정 모드일 때 기존 회원 데이터 로드
  useEffect(() => {
    if (memberId && teamId) {
      const loadMemberData = async () => {
        setLoadingMember(true);
        try {
          const memberRef = doc(db, "teams", teamId, "members", memberId);
          const memberSnap = await getDoc(memberRef);
          
          if (memberSnap.exists()) {
            const data = memberSnap.data();
            setName(data.name || "");
            setPhone(data.phone || "");
            setPhoneLast4(data.phoneLast4 || "");
            setJerseyNumber(data.jerseyNumber ? String(data.jerseyNumber) : "");
            setSquad(data.squad || "");
            const loadedRole = (data.role as TeamMember["role"]) || "일반";
            const loadedFeePlan = (data.feePlan as "monthly" | "annual" | "exempt") || "monthly";
            
            setRole(loadedRole);
            setFeePlan(loadedFeePlan);
            setStatus((data.status as "active" | "paused" | "expelled") || "active"); // 🔥 상태 로드
            
            // 🔥 임원 면제 로직 UI/DB 분리: 임원이지만 feePlan이 없으면 기본값 면제 (UI만)
            // DB에는 명시적으로 저장된 값만 사용
            if (EXEMPT_ROLES.includes(loadedRole) && !data.feePlan) {
              // UI 기본값만 설정 (DB 저장 시에는 사용자가 선택한 값 사용)
              setFeePlan("exempt");
            }
            setMemo(data.memo || "");
          }
        } catch (error) {
          console.error("회원 데이터 로드 실패:", error);
          alert("회원 정보를 불러올 수 없습니다.");
        } finally {
          setLoadingMember(false);
        }
      };
      
      loadMemberData();
    }
  }, [memberId, teamId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !teamId) return;

    setLoading(true);
    try {
      // 🔥 수정 모드가 아닐 때만 중복 체크 (신규 추가 시)
      if (!memberId) {
        const membersCollection = collection(db, "teams", teamId, "members");
        const snapshot = await getDocs(membersCollection);

        const inputKey = buildTeamMemberImportKey(
          teamId,
          name.trim(),
          phone.trim() || phoneLast4.trim()
        );

        let duplicateFound = false;
        let duplicateMemberName = "";

        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const existingKey = buildTeamMemberImportKey(
            teamId,
            String(data.name || ""),
            String(data.phone || ""),
            String(data.birth || "")
          );
          if (existingKey === inputKey && docSnap.id !== memberId) {
            duplicateFound = true;
            duplicateMemberName = String(data.name || "");
          }
        });

        if (duplicateFound) {
          const confirmed = confirm(
            `⚠️ 동일한 매칭 키(전화·이름 등)로 등록된 회원이 이미 있습니다.\n\n` +
            `이름: ${duplicateMemberName}\n` +
            `입력 전화/끝4자리: ${phone.trim() || phoneLast4.trim() || "없음"}\n\n` +
            `그래도 새 문서로 추가할까요?\n\n` +
            `(기존 회원을 수정하려면 목록에서 해당 회원을 열어 주세요. PDF 일괄 등록과 겹치면 이름만 같은 줄이 둘 생길 수 있습니다.)`
          );
          if (!confirmed) {
            setLoading(false);
            return;
          }
        }
      }
      // 🔥 역할과 회비 정책 분리: feePlan을 직접 사용 (기본값 처리)
      const finalFeePlan = feePlan || "monthly";
      const resolved = resolveFeePlan({
        name: name.trim(),
        role,
        feePlan: finalFeePlan,
        exemptReason: finalFeePlan === "exempt" ? undefined : undefined, // 면제 사유는 별도로 설정 가능
        manualFeeOverride: false,
      } as TeamMemberType);

      // 🔥 전화번호 처리
      const phoneValue = phone.trim();
      const phoneLast4Value = phoneValue ? phoneValue.slice(-4) : (phoneLast4.trim() || "");

      // 🔥 배번 처리
      let jerseyNum: number | undefined = undefined;
      if (jerseyNumber.trim()) {
        const parsed = parseInt(jerseyNumber.trim());
        if (!isNaN(parsed)) {
          jerseyNum = parsed;
        }
      }

      // 🔥 수정 모드 vs 신규 추가 모드 분기
      if (memberId) {
        // 🔥 수정 모드: updateDoc 사용
        const memberRef = doc(db, "teams", teamId, "members", memberId);
        
        // 🔥 기존 데이터 가져오기 (감사 로그용)
        const memberSnap = await getDoc(memberRef);
        const beforeData = memberSnap.exists() ? memberSnap.data() : {};
        
        // 🔥 업데이트할 데이터 (joinedAt은 유지)
        const updateData: any = {
          name: name.trim(),
          role,
          status, // 🔥 상태 필드 추가
          feePlan: resolved.feePlan || finalFeePlan,
          exemptReason: resolved.exemptReason || null,
          memo: memo.trim() || null,
        };
        
        // 🔥 전화번호 처리
        if (phoneValue) {
          updateData.phone = phoneValue;
          updateData.phoneLast4 = phoneLast4Value;
        } else if (phoneLast4Value) {
          updateData.phoneLast4 = phoneLast4Value;
        }
        
        // 🔥 배번 처리
        if (jerseyNum !== undefined) {
          updateData.jerseyNumber = jerseyNum;
        }
        
        // 🔥 squad 처리
        if (squad && (squad === "청룡" || squad === "백호")) {
          updateData.squad = squad;
        } else {
          // 빈 값일 경우 삭제 (선택적 필드)
          updateData.squad = null;
        }

        // 🔥 undefined 필드 제거
        const cleanUndefined = (obj: any): any => {
          if (obj === null || obj === undefined) return obj;
          if (typeof obj === "object") {
            const cleaned: any = {};
            Object.entries(obj).forEach(([key, value]) => {
              if (value !== undefined) {
                cleaned[key] = value;
              }
            });
            return cleaned;
          }
          return obj;
        };

        await updateDoc(memberRef, cleanUndefined(updateData));

        // 🔥 감사 로그 - 회원 수정 (전체)
        if (user?.uid) {
          await addDoc(collection(db, "teams", teamId, "auditLogs"), {
            actorId: user.uid,
            actorName: user.email || "시스템",
            action: "MEMBER_UPDATE",
            targetMemberId: memberId,
            targetMemberName: name.trim(),
            before: beforeData,
            after: updateData,
            createdAt: serverTimestamp(),
          });
        }
        
        // 🔥 회비 플랜 변경 이력 (별도 기록)
        if (user?.uid && beforeData?.feePlan !== (resolved.feePlan || finalFeePlan)) {
          await addDoc(collection(db, "teams", teamId, "auditLogs"), {
            actorId: user.uid,
            actorName: user.email || "시스템",
            action: "FEE_PLAN_CHANGE",
            targetMemberId: memberId,
            targetMemberName: name.trim(),
            before: { feePlan: beforeData?.feePlan || "monthly" },
            after: { feePlan: resolved.feePlan || finalFeePlan },
            createdAt: serverTimestamp(),
          });
        }
        
        // 🔥 상태 변경 이력 (별도 기록 - 수정 모달에서 변경된 경우)
        if (user?.uid && beforeData?.status !== status) {
          await addDoc(collection(db, "teams", teamId, "auditLogs"), {
            actorId: user.uid,
            actorName: user.email || "시스템",
            action: "STATUS_CHANGE",
            targetMemberId: memberId,
            targetMemberName: name.trim(),
            before: { status: beforeData?.status || "active" },
            after: { status: status },
            createdAt: serverTimestamp(),
          });
        }

        alert("회원 정보가 수정되었습니다.");
      } else {
        // 🔥 신규 추가 모드: addDoc 사용
        const memberData: any = {
          name: name.trim(),
          role,
          status: status, // 🔥 상태 필드 추가
          feePlan: resolved.feePlan || finalFeePlan,
          exemptReason: resolved.exemptReason || null,
          manualFeeOverride: false,
          memo: memo.trim() || null,
          joinedAt: serverTimestamp(),
          unpaidMonths: 0,
          penaltyPoints: 0,
        };
        
        // 🔥 전화번호 처리
        if (phoneValue) {
          memberData.phone = phoneValue;
          memberData.phoneLast4 = phoneLast4Value;
        } else if (phoneLast4Value) {
          memberData.phoneLast4 = phoneLast4Value;
        }
        
        // 🔥 배번 처리
        if (jerseyNum !== undefined) {
          memberData.jerseyNumber = jerseyNum;
        }
        
        // 🔥 squad 처리
        if (squad && (squad === "청룡" || squad === "백호")) {
          memberData.squad = squad;
        }

        const memberRef = await addDoc(collection(db, "teams", teamId, "members"), memberData);

        // 🔥 감사 로그 기록
        if (user?.uid) {
          await addDoc(collection(db, "teams", teamId, "auditLogs"), {
            actorId: user.uid,
            actorName: user.email || "시스템",
            action: "MEMBER_ADD",
            targetMemberId: memberRef.id,
            targetMemberName: name.trim(),
            before: {},
            after: { role, feePlan: resolved.feePlan },
            createdAt: serverTimestamp(),
          });
        }
      }

      onSuccess();
    } catch (error: any) {
      console.error(memberId ? "회원 수정 실패:" : "회원 추가 실패:", error);
      console.error("에러 상세:", {
        code: error.code,
        message: error.message,
        stack: error.stack,
      });
      alert(`${memberId ? "회원 수정" : "회원 추가"}에 실패했습니다.\n\n에러: ${error.message || "알 수 없는 오류"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 py-4"
      onClick={onClose} // 🔥 배경 클릭 시 닫기
    >
      <div 
        className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] flex flex-col my-auto"
        onClick={(e) => e.stopPropagation()} // 🔥 모달 내부 클릭은 닫기 방지
      >
        {/* 🔥 헤더 (고정) */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-2xl font-bold">{memberId ? "회원 수정" : "회원 추가"}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
            disabled={loading}
          >
            ✕
          </button>
        </div>

        {/* 🔥 스크롤 가능한 콘텐츠 영역 */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
        {loadingMember ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-gray-500 text-sm">회원 정보를 불러오는 중...</p>
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 이름 (필수) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              이름 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="이름을 입력하세요"
              required
            />
          </div>

          {/* 소속 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              소속
            </label>
            <select
              value={squad}
              onChange={(e) => setSquad(e.target.value as "청룡" | "백호" | "")}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">선택 안 함</option>
              <option value="청룡">청룡</option>
              <option value="백호">백호</option>
            </select>
          </div>

          {/* 역할 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              역할
            </label>
            <select
              value={role}
              onChange={(e) => {
                const newRole = e.target.value as TeamMember["role"];
                setRole(newRole);
                // 🔥 역할과 회비 정책 분리: 역할 변경 시 회비 플랜은 그대로 유지
              }}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="일반">일반</option>
              <option value="회장">회장</option>
              <option value="부회장">부회장</option>
              <option value="총무">총무</option>
              <option value="감독">감독</option>
              <option value="코치">코치</option>
              <option value="감사">감사</option>
              <option value="상벌위원장">상벌위원장</option>
            </select>
          </div>

          {/* 회비 플랜 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              회비 플랜 {EXEMPT_ROLES.includes(role) && <span className="text-xs text-gray-500">(임원도 선택 가능)</span>}
            </label>
            <select
              value={feePlan}
              onChange={(e) => setFeePlan(e.target.value as "monthly" | "annual" | "exempt")}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="monthly">월회비 (20,000원)</option>
              <option value="annual">연회비 (200,000원)</option>
              <option value="exempt">면제</option>
            </select>
            {EXEMPT_ROLES.includes(role) && feePlan !== "exempt" && (
              <p className="text-xs text-orange-600 mt-1">
                ⚠️ 임원이지만 유료 플랜을 선택했습니다. 이 설정이 저장됩니다.
              </p>
            )}
          </div>

          {/* 상태 (수정 모드에서만 표시) */}
          {memberId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                상태
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as "active" | "paused" | "expelled")}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="active">재원</option>
                <option value="paused">휴원</option>
                <option value="expelled">제명</option>
              </select>
            </div>
          )}

          {/* 연락처 뒷자리 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              연락처 뒷자리 (선택)
            </label>
            <input
              type="text"
              value={phoneLast4}
              onChange={(e) => setPhoneLast4(e.target.value.replace(/\D/g, "").slice(-4))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="예: 1234"
              maxLength={4}
            />
          </div>

          {/* 메모 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              메모 (선택)
            </label>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={2}
              placeholder="메모를 입력하세요"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>저장 중...</span>
                </>
              ) : (
                <span>{memberId ? "수정 저장" : "저장"}</span>
              )}
            </button>
          </div>
        </form>
        )}
        </div>
      </div>
    </div>
  );
}

// 🔥 일괄 등록 모달
function BulkImportModal({
  teamId,
  onClose,
  onSuccess,
}: {
  teamId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { user } = useAuth(); // 🔥 Hook은 컴포넌트 최상위에서 호출
  const [mode, setMode] = useState<"file" | "text" | "sheets">("sheets"); // 🔥 기본값: 구글 시트 (추천)
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [columnMapping, setColumnMapping] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);
  const [updateMode, setUpdateMode] = useState<"import" | "update">("import");
  const [createNewIfNotFound, setCreateNewIfNotFound] = useState(true); // 🔥 없는 이름 신규 추가 옵션
  const [sheetsUrl, setSheetsUrl] = useState(""); // 🔥 구글 시트 URL
  const [sheetsLoading, setSheetsLoading] = useState(false); // 🔥 구글 시트 로딩 상태
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null); // 🔥 동기화 결과
  const [existingMembers, setExistingMembers] = useState<Array<{ id: string; name: string; [key: string]: any }>>([]); // 🔥 기존 회원 목록
  const [headerRowIndex, setHeaderRowIndex] = useState<number>(0); // 🔥 헤더 행 인덱스

  // ✅ body 스크롤 락 관리
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // 🔥 컬럼명 정규화 함수 (공백, 특수문자 제거, 유연한 매칭)
  const normalizeColumnName = (col: string): string => {
    return col
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "") // 공백 제거
      .replace(/[()（）]/g, "") // 괄호 제거
      .replace(/[^\w가-힣]/g, ""); // 특수문자 제거 (한글, 영문, 숫자만)
  };

  // 🔥 Firestore undefined 필드 제거 함수 (필수)
  const cleanUndefined = (obj: any): any => {
    if (obj === null || obj === undefined) return obj;
    if (Array.isArray(obj)) {
      return obj.map(cleanUndefined);
    }
    if (typeof obj === "object") {
      const cleaned: any = {};
      Object.entries(obj).forEach(([key, value]) => {
        if (value !== undefined) {
          cleaned[key] = cleanUndefined(value);
        }
      });
      return cleaned;
    }
    return obj;
  };

  // 🔥 헤더 행 자동 탐색 (1~5행 스캔)
  const findHeaderRow = (rows: any[][]): number => {
    const nameKeywords = ["이름", "name", "성명", "회원명"];
    
    for (let i = 0; i < Math.min(5, rows.length); i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;
      
      // 이 행에 "이름" 관련 키워드가 있는지 확인
      const hasNameColumn = row.some((cell: any) => {
        const cellStr = String(cell || "").trim();
        const normalized = normalizeColumnName(cellStr);
        return nameKeywords.some((keyword) => normalized.includes(keyword));
      });
      
      if (hasNameColumn) {
        return i; // 헤더 행 발견
      }
    }
    
    return 0; // 기본값: 첫 행
  };

  // 🔥 파일 파싱 함수 (개선: 헤더 자동 탐색 + 유연한 컬럼 매칭)
  const parseFile = async (file: File): Promise<{ data: any[]; headerRowIndex: number }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          if (!data) {
            reject(new Error("파일을 읽을 수 없습니다."));
            return;
          }
          
          if (file.name.toLowerCase().endsWith(".csv")) {
            // CSV 파싱
            const text = data as string;
            if (looksLikePdfText(text)) {
              reject(new Error("PDF 내용이 감지되었습니다. 실제 CSV 또는 Excel 파일을 업로드해주세요."));
              return;
            }
            const lines = text.split("\n").filter((line) => line.trim());
            if (lines.length === 0) {
              reject(new Error("파일이 비어있습니다."));
              return;
            }
            
            // 모든 행을 배열로 변환
            const allRows = lines.map((line) => line.split(",").map((v) => v.trim()));
            
            // 헤더 행 자동 탐색
            const headerRowIndex = findHeaderRow(allRows);
            const headers = allRows[headerRowIndex];
            
            const rows: any[] = [];
            for (let i = headerRowIndex + 1; i < allRows.length; i++) {
              const values = allRows[i];
              const row: any = {};
              headers.forEach((header, idx) => {
                row[header] = values[idx] || "";
              });
              // 빈 행 스킵
              if (Object.values(row).some((v) => v && String(v).trim())) {
                rows.push(row);
              }
            }
            
            resolve({ data: rows, headerRowIndex });
          } else {
            // Excel 파싱
            const arrayBuffer = data as ArrayBuffer;
            const bytes = new Uint8Array(arrayBuffer);
            const binary = bytes.reduce((acc, byte) => acc + String.fromCharCode(byte), "");
            const workbook = XLSX.read(binary, { type: "binary" });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            
            // 🔥 헤더 자동 탐색을 위해 raw 데이터 먼저 읽기
            const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" }) as any[][];
            
            if (rawData.length === 0) {
              reject(new Error("시트가 비어있습니다."));
              return;
            }
            
            // 헤더 행 자동 탐색
            const headerRowIndex = findHeaderRow(rawData);
            
            // 헤더 행부터 파싱
            const headerRow = rawData[headerRowIndex];
            const jsonData: any[] = [];
            
            for (let i = headerRowIndex + 1; i < rawData.length; i++) {
              const row = rawData[i];
              const rowObj: any = {};
              headerRow.forEach((header, idx) => {
                rowObj[header] = row[idx] || "";
              });
              // 빈 행 스킵
              if (Object.values(rowObj).some((v) => v && String(v).trim())) {
                jsonData.push(rowObj);
              }
            }
            
            resolve({ data: jsonData, headerRowIndex });
          }
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error("파일 읽기 실패"));
      
      if (file.name.toLowerCase().endsWith(".csv")) {
        reader.readAsText(file);
      } else {
        reader.readAsArrayBuffer(file);
      }
    });
  };

  // 🔥 기존 회원 목록 로드
  useEffect(() => {
    if (mode === "sheets" && teamId) {
      const loadExistingMembers = async () => {
        try {
          const membersCollection = collection(db, "teams", teamId, "members");
          const snapshot = await getDocs(membersCollection);
          const members = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as Array<{ id: string; name: string; [key: string]: any }>;
          setExistingMembers(members);
        } catch (error) {
          console.error("기존 회원 목록 로드 실패:", error);
        }
      };
      loadExistingMembers();
    }
  }, [mode, teamId]);

  // 🔥 구글 시트에서 데이터 가져오기 + 검증
  const handleFetchSheets = async () => {
    if (!sheetsUrl.trim()) {
      alert("구글 시트 URL을 입력해주세요.");
      return;
    }
    
    const spreadsheetId = extractSpreadsheetId(sheetsUrl);
    if (!spreadsheetId) {
      alert("구글 시트 URL 형식이 올바르지 않습니다.\n\n예: https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit");
      return;
    }
    
    setSheetsLoading(true);
    setSyncResult(null);
    try {
      // 🔥 구글 시트 데이터 가져오기
      const csvText = await fetchGoogleSheetsAsCSV(spreadsheetId);
      const rows = parseCSVToObjects(csvText);
      
      if (rows.length === 0) {
        alert("구글 시트에서 데이터를 찾을 수 없습니다.");
        return;
      }
      
      // 🔥 동기화 결과 생성 (검증 + 액션 결정)
      const result = await syncGoogleSheetToFirestore(spreadsheetId, teamId, existingMembers);
      setSyncResult(result);
      
      // 🔥 미리보기용 데이터 설정
      const previewRows = result.preview.map((p) => ({
        이름: p.name,
        액션: p.action === "create" ? "신규" : p.action === "update" ? "수정" : "스킵",
        역할: p.data.role,
        회비플랜: p.data.feePlan,
        전화번호: p.data.phone || "-",
        배번: p.data.jerseyNumber || "-",
        소속: p.data.squad || "-",
        메모: p.data.memo || "-",
      }));
      setPreviewData(previewRows);
      
      // 🔥 성공/오류 요약
      const successCount = result.preview.length;
      const errorCount = result.errors.length;
      
      if (errorCount > 0) {
        alert(
          `데이터를 불러왔습니다.\n\n✅ 성공: ${successCount}명\n❌ 오류: ${errorCount}건\n\n오류 상세는 미리보기에서 확인하세요.`
        );
      } else {
        alert(`${successCount}명의 데이터를 불러왔습니다. 미리보기를 확인한 후 동기화를 실행하세요.`);
      }
    } catch (error: any) {
      console.error("구글 시트 가져오기 실패:", error);
      alert(`구글 시트 데이터를 가져올 수 없습니다.\n\n에러: ${error.message || "알 수 없는 오류"}\n\n⚠️ 구글 시트가 "링크가 있는 모든 사용자"에게 공개되어 있는지 확인해주세요.`);
    } finally {
      setSheetsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamId) return;
    
    // 🔥 구글 시트 모드 처리 (단방향 동기화: 시트 → 앱)
    if (mode === "sheets") {
      if (!syncResult || syncResult.preview.length === 0) {
        alert("구글 시트에서 데이터를 먼저 불러와주세요.");
        return;
      }
      
      // 🔥 확인 다이얼로그
      const confirmMessage = `동기화를 실행하시겠습니까?\n\n신규: ${syncResult.preview.filter((p) => p.action === "create").length}명\n수정: ${syncResult.preview.filter((p) => p.action === "update").length}명\n오류: ${syncResult.errors.length}건`;
      if (!confirm(confirmMessage)) {
        return;
      }
      
      setLoading(true);
      try {
        const membersCollection = collection(db, "teams", teamId, "members");
        const batch = writeBatch(db);
        let newCount = 0;
        let updateCount = 0;
        
        // 🔥 기존 회원 맵 생성 (uniqueKey → docId) - 🔑 핵심 개선
        const existingMembersMap = new Map<string, { id: string; data: any }>();
        existingMembers.forEach((m) => {
          if (m.name) {
            const key = buildTeamMemberImportKey(teamId, m.name, m.phone, m.birth);
            existingMembersMap.set(key, { id: m.id, data: m });
          }
        });
        
        // 🔥 동기화 실행
        for (const preview of syncResult.preview) {
          if (preview.action === "skip") continue;
          
          const memberData = preview.data;
          
          // 🔥 규칙 엔진으로 자동 판정
          const resolved = resolveFeePlan({
            role: memberData.role,
            feePlan: memberData.feePlan,
            exemptReason: undefined,
            manualFeeOverride: false,
          } as TeamMember);
          
          const finalMemberData = {
            name: memberData.name,
            phone: memberData.phone,
            jerseyNumber: memberData.jerseyNumber,
            squad: memberData.squad,
            role: memberData.role,
            status: "active",
            feePlan: resolved.feePlan || "monthly", // 🔥 기본값 보장
            exemptReason: resolved.exemptReason ?? null,
            manualFeeOverride: false,
            teamId: teamId,
            joinedAt: serverTimestamp(),
            unpaidMonths: 0,
            penaltyPoints: 0,
            memo: memberData.memo,
          };
          
          if (preview.action === "create") {
            // 🔥 신규 생성
            const memberRef = doc(membersCollection);
            batch.set(memberRef, cleanUndefined(finalMemberData)); // 🔥 undefined 필드 제거
            newCount++;
          } else if (preview.action === "update") {
            const sheetKey = buildTeamMemberImportKey(
              teamId,
              memberData.name,
              memberData.phone,
              memberData.birth
            );
            const existingEntry = existingMembersMap.get(sheetKey);
            if (existingEntry) {
              const memberRef = doc(db, "teams", teamId, "members", existingEntry.id);
              batch.update(memberRef, cleanUndefined({
                phone: memberData.phone,
                jerseyNumber: memberData.jerseyNumber,
                squad: memberData.squad,
                role: memberData.role,
                feePlan: resolved.feePlan || "monthly", // 🔥 기본값 보장
                exemptReason: resolved.exemptReason ?? null,
                memo: memberData.memo,
              })); // 🔥 undefined 필드 제거
              updateCount++;
            }
          }
        }
        
        // 🔥 batch commit
        await batch.commit();
        
        // 🔥 동기화 로그 저장
        if (user?.uid) {
          await addDoc(collection(db, "teams", teamId, "auditLogs"), {
            actorId: user.uid,
            actorName: user.email || "시스템",
            action: "GOOGLE_SHEETS_SYNC",
            details: {
              spreadsheetId: extractSpreadsheetId(sheetsUrl),
              newMembers: newCount,
              updatedMembers: updateCount,
              errors: syncResult.errors.length,
            },
            createdAt: serverTimestamp(),
          });
        }
        
        alert(`동기화 완료!\n\n신규: ${newCount}명\n수정: ${updateCount}명\n오류: ${syncResult.errors.length}건`);
        onSuccess();
      } catch (error: any) {
        console.error("동기화 실패:", error);
        console.error("에러 상세:", {
          code: error.code,
          message: error.message,
          stack: error.stack,
        });
        alert(`동기화에 실패했습니다.\n\n에러: ${error.message || "알 수 없는 오류"}`);
      } finally {
        setLoading(false);
      }
      return;
    }
    
    // 🔥 파일 모드와 텍스트 모드 분기
    if (mode === "file") {
      if (!file || previewData.length === 0) {
        alert("파일을 업로드하고 미리보기를 확인해주세요.");
        return;
      }
      
      setLoading(true);
      try {
        // 🔥 1. 기존 회원 목록 조회 (중복 체크용)
        const membersCollection = collection(db, "teams", teamId, "members");
        const existingMembersQuery = query(membersCollection);
        const existingSnapshot = await getDocs(existingMembersQuery);

        const importIndex = indexExistingMembersForImport(
          teamId,
          existingSnapshot.docs.map((d) => ({ id: d.id, data: d.data() as Record<string, unknown> }))
        );
        
        // 🔥 2. 엑셀 데이터 파싱 + 내부 중복 제거
        const membersMap = new Map<string, any>(); // 엑셀 내부 중복 제거용
        const duplicateInFile: string[] = []; // 엑셀 파일 내부 중복 목록
        let skippedInvalidNames = 0;

        for (const row of previewData) {
          const name = (row[columnMapping.name] || row["이름"] || row["name"] || "").trim();
          if (!name) continue;
          if (shouldSkipBulkImportMemberName(name)) {
            skippedInvalidNames++;
            continue;
          }

          const phone = (row[columnMapping.phone] || row["전화번호"] || row["phone"] || "").trim();
          const jerseyNumberStr = row[columnMapping.jerseyNumber] || row["배번"] || row["jerseyNumber"] || "";
          const jerseyNumber = jerseyNumberStr ? parseInt(jerseyNumberStr) : undefined;
          const role = row[columnMapping.role] || row["역할"] || row["role"] || "일반";
          const feePlanRaw = row[columnMapping.feePlan] || row["회비플랜"] || row["feePlan"] || "";
          const feePlan = feePlanRaw === "월회비" || feePlanRaw === "monthly" ? "monthly" :
                         feePlanRaw === "연회비" || feePlanRaw === "annual" ? "annual" :
                         feePlanRaw === "면제" || feePlanRaw === "exempt" ? "exempt" : "monthly";
          const squad = row[columnMapping.squad] || row["소속"] || row["squad"] || null;
          const memo = row[columnMapping.memo] || row["메모"] || row["memo"] || "";
          const birthRaw =
            (columnMapping.birth && row[columnMapping.birth]) ||
            row["생년"] ||
            row["생년월일"] ||
            row["birth"] ||
            row["birthYear"] ||
            "";
          const birth = String(birthRaw || "").trim();

          const uniqueKey = buildTeamMemberImportKey(teamId, name, phone, birth);
          if (membersMap.has(uniqueKey)) {
            duplicateInFile.push(name);
            continue;
          }

          const resolved = resolveFeePlan({
            role,
            feePlan,
            exemptReason: undefined,
            manualFeeOverride: false,
          } as TeamMember);

          membersMap.set(uniqueKey, {
            name,
            phone: phone || null,
            birth: birth || null,
            jerseyNumber: jerseyNumber && !isNaN(jerseyNumber) ? jerseyNumber : null,
            squad: squad && (squad === "청룡" || squad === "백호") ? squad : null,
            role,
            status: "active",
            feePlan: resolved.feePlan || "monthly",
            exemptReason: resolved.exemptReason ?? null,
            manualFeeOverride: false,
            teamId: teamId,
            joinedAt: serverTimestamp(),
            unpaidMonths: 0,
            penaltyPoints: 0,
            memo: memo ? memo.trim() : null,
          });
        }

        const batch = writeBatch(db);
        let newCount = 0;
        let updateCount = 0;

        for (const [uniqueKey, member] of membersMap.entries()) {
          const resolvedExistingId =
            importIndex.byImportKey.get(uniqueKey)?.id ??
            resolveExistingMemberIdForBulkRow(
              teamId,
              { name: member.name, phone: member.phone, birth: member.birth ?? null },
              importIndex
            );

          if (resolvedExistingId) {
            const memberRef = doc(db, "teams", teamId, "members", resolvedExistingId);
            batch.update(
              memberRef,
              cleanUndefined({
                phone: member.phone,
                jerseyNumber: member.jerseyNumber,
                squad: member.squad,
                role: member.role,
                feePlan: member.feePlan,
                exemptReason: member.exemptReason,
                memo: member.memo,
                ...(member.birth ? { birth: member.birth } : {}),
              })
            );
            updateCount++;
          } else {
            const memberRef = doc(membersCollection);
            batch.set(memberRef, cleanUndefined(member));
            newCount++;
          }
        }
        
        // 🔥 4. 중복 정보 알림
        if (duplicateInFile.length > 0) {
          console.warn(`엑셀 파일 내부 중복: ${duplicateInFile.length}건`);
        }
        
        // 🔥 5. batch commit
        if (newCount === 0 && updateCount === 0) {
          alert(
            `⚠️ 처리할 회원이 없습니다.\n\n엑셀 내부 중복: ${duplicateInFile.length}건` +
              (skippedInvalidNames > 0 ? `\n비정상 이름 스킵: ${skippedInvalidNames}건` : "")
          );
          setLoading(false);
          return;
        }

        await batch.commit();

        const summary =
          `✅ 처리 완료\n\n신규: ${newCount}명\n수정: ${updateCount}명` +
          (duplicateInFile.length > 0 ? `\n엑셀 내부 중복: ${duplicateInFile.length}건 제외` : "") +
          (skippedInvalidNames > 0 ? `\n비정상 이름 스킵: ${skippedInvalidNames}건` : "");
        alert(summary);
        onSuccess();
      } catch (error: any) {
        console.error("일괄 등록 실패:", error);
        console.error("에러 상세:", {
          code: error.code,
          message: error.message,
          stack: error.stack,
        });
        
        // 🔥 에러 타입별 명확한 메시지
        let errorMsg = "알 수 없는 오류";
        if (error.code === "permission-denied" || error.message?.includes("permission")) {
          errorMsg = "권한 오류: Firestore 규칙을 확인해주세요.";
        } else if (error.message?.includes("undefined") || error.message?.includes("Unsupported field value")) {
          errorMsg = "데이터 오류: undefined 필드가 있습니다. (회비플랜, 면제사유 확인)";
        } else {
          errorMsg = error.message || "알 수 없는 오류";
        }
        
        alert(`❌ 일괄 등록에 실패했습니다.\n\n에러: ${errorMsg}`);
      } finally {
        setLoading(false);
      }
      return;
    }
    
    // 🔥 텍스트 모드 (기존 로직)
    if (!text.trim()) return;

    setLoading(true);
    try {
      // 🔥 CSV 형식 파싱 (이름,역할,feePlan,exemptReason 또는 공백 구분)
      const lines = text.trim().split("\n").filter((line) => line.trim());
      const members: any[] = [];

      for (const line of lines) {
        let name = "";
        let role = "일반";
        let feePlan: "monthly" | "annual" | "exempt" = "monthly";
        let exemptReason: "role" | "special" | undefined;
        let squad: "청룡" | "백호" | null = null;

        // 🔥 CSV 형식 체크 (쉼표로 구분)
        if (line.includes(",")) {
          const parts = line.split(",").map((p) => p.trim());
          name = parts[0] || "";
          role = parts[1] || "일반";
          feePlan = (parts[2] as "monthly" | "annual" | "exempt") || "monthly";
          exemptReason = parts[3] as "role" | "special" | undefined;
        } else {
          // 🔥 공백 구분 형식 (기존 방식)
          const parts = line.trim().split(/\s+/);
          name = parts[0] || "";
          
          // 🔥 이름만 있는 경우 기본값 적용
          if (parts.length === 1) {
            role = "일반";
            feePlan = "monthly";
            squad = null;
          } else {
            // 소속 체크 (청룡/백호)
            squad = parts[1] === "청룡" || parts[1] === "백호" ? parts[1] : null;
            // 역할은 소속 다음 또는 바로 다음
            role = squad ? (parts[2] || "일반") : (parts[1] || "일반");
          }
        }

        if (!name) continue;
        if (shouldSkipBulkImportMemberName(name)) continue;

        // 🔥 이름만 있고 role/feePlan이 없으면 기본값 적용
        if (!role || role === "") {
          role = "일반";
        }
        if (!feePlan || feePlan === "") {
          feePlan = "monthly";
        }

        // 🔥 1. 규칙 엔진으로 자동 판정 (CSV에서 지정하지 않은 경우)
        let finalFeePlan = feePlan;
        let finalExemptReason = exemptReason;

        if (!exemptReason) {
          const resolved = resolveFeePlan({
            role,
            feePlan,
            exemptReason: undefined,
            manualFeeOverride: false,
          } as TeamMember);
          finalFeePlan = resolved.feePlan;
          finalExemptReason = resolved.exemptReason;
        }

        // 🔥 teamId를 각 member에 반드시 포함 (Firestore Rules 통과용)
        members.push({
          name,
          squad,
          role,
          status: "active",
          feePlan: finalFeePlan || "monthly", // 🔥 기본값 보장
          exemptReason: finalExemptReason ?? null,
          manualFeeOverride: false, // ★ 천재 포인트
          teamId: teamId, // 🔥 필수: Firestore Rules 통과용
          joinedAt: serverTimestamp(),
          unpaidMonths: 0, // 🔥 전원 완납 상태
          penaltyPoints: 0, // 🔥 4. 상벌/징계 연동
        });
      }

      if (updateMode === "update") {
        // 🔥 기존 멤버 업데이트
        const { doc, getDoc, updateDoc, query, where, getDocs } = await import("firebase/firestore");
        const membersCollection = collection(db, "teams", teamId, "members");
        const existingMembersQuery = query(membersCollection);
        const existingSnapshot = await getDocs(existingMembersQuery);
        
        const existingMembersMap = new Map<string, string>(); // name -> docId
        existingSnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.name) {
            existingMembersMap.set(data.name, docSnap.id);
          }
        });
        
        let updatedCount = 0;
        let createdCount = 0;
        
        for (const member of members) {
          const existingDocId = existingMembersMap.get(member.name);
          if (existingDocId) {
            // 🔥 기존 멤버 업데이트
            const memberRef = docFn(db, "teams", teamId, "members", existingDocId);
            const memberSnap = await getDoc(memberRef);
            const beforeData = memberSnap.data();
            
            await updateDoc(memberRef, cleanUndefined({
              role: member.role,
              feePlan: member.feePlan || "monthly", // 🔥 기본값 보장
              exemptReason: member.exemptReason ?? null,
              unpaidMonths: 0, // 🔥 회비 상태 일괄 업데이트
            })); // 🔥 undefined 필드 제거
            
            // 🔥 5. 감사 로그 기록 (역할/회비 변경)
            if (user?.uid) {
              if (beforeData?.role !== member.role) {
                await addDoc(collection(db, "teams", teamId, "auditLogs"), {
                  actorId: user.uid,
                  actorName: user.email || "시스템",
                  action: "ROLE_CHANGE",
                  targetMemberId: existingDocId,
                  targetMemberName: member.name,
                  before: { role: beforeData?.role },
                  after: { role: member.role },
                  createdAt: serverTimestamp(),
                });
              }
              
              if (beforeData?.feePlan !== member.feePlan) {
                await addDoc(collection(db, "teams", teamId, "auditLogs"), {
                  actorId: user.uid,
                  actorName: user.email || "시스템",
                  action: "FEE_OVERRIDE",
                  targetMemberId: existingDocId,
                  targetMemberName: member.name,
                  before: { feePlan: beforeData?.feePlan },
                  after: { feePlan: member.feePlan },
                  createdAt: serverTimestamp(),
                });
              }
            }
            
            updatedCount++;
          } else if (createNewIfNotFound) {
            // 🔥 신규 추가
            await addDoc(membersCollection, cleanUndefined(member)); // 🔥 undefined 필드 제거
            createdCount++;
          }
        }

        alert(`${updatedCount}명 업데이트, ${createdCount}명 신규 추가 완료`);
      } else {
        // 🔥 신규 추가만 (batch write 사용) - 중복 체크 포함
        const membersCollection = collection(db, "teams", teamId, "members");
        
        // 🔥 기존 회원 목록 조회 (중복 체크용)
        const existingMembersQuery = query(membersCollection);
        const existingSnapshot = await getDocs(existingMembersQuery);
        
        // 🔥 이름 + 전화번호 조합으로 중복 체크
        const existingMembersMap = new Map<string, string>(); // "name|phone" -> docId
        existingSnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const name = (data.name || "").trim();
          const phone = (data.phone || "").trim();
          
          if (name) {
            if (phone) {
              existingMembersMap.set(`${name}|${phone}`, docSnap.id);
            }
            if (!existingMembersMap.has(name)) {
              existingMembersMap.set(name, docSnap.id);
            }
          }
        });
        
        // 🔥 텍스트 내부 중복 제거
        const uniqueMembersMap = new Map<string, any>();
        const duplicateInText: string[] = [];
        
        for (const member of members) {
          const key = member.phone ? `${member.name}|${member.phone}` : member.name;
          
          if (uniqueMembersMap.has(key)) {
            duplicateInText.push(member.name);
            continue;
          }
          
          uniqueMembersMap.set(key, member);
        }
        
        // 🔥 기존 회원과 중복 체크 + 신규 회원만 필터링
        const newMembers: any[] = [];
        const skippedDuplicates: string[] = [];
        
        for (const [key, member] of uniqueMembersMap.entries()) {
          const checkKey = member.phone ? `${member.name}|${member.phone}` : member.name;
          const existingDocId = existingMembersMap.get(checkKey) || existingMembersMap.get(member.name);
          
          if (existingDocId) {
            skippedDuplicates.push(member.name);
            continue;
          }
          
          newMembers.push({
            ...member,
            teamId: teamId, // 🔥 명시적으로 teamId 포함
          });
        }
        
        if (newMembers.length === 0) {
          alert(`⚠️ 추가할 신규 회원이 없습니다.\n\n중복: ${skippedDuplicates.length}명${duplicateInText.length > 0 ? `\n텍스트 내부 중복: ${duplicateInText.length}건` : ""}`);
          setLoading(false);
          return;
        }
        
        // 🔥 신규 회원만 batch write
        const batch = writeBatch(db);
        
        for (const member of newMembers) {
          const memberRef = doc(membersCollection);
          batch.set(memberRef, cleanUndefined(member)); // 🔥 undefined 필드 제거
        }
        
        // 🔥 batch commit - 성공 시에만 메시지 표시
        await batch.commit();
        
        const summary = `✅ ${newMembers.length}명 추가 완료${skippedDuplicates.length > 0 ? `\n\n기존 회원 중복: ${skippedDuplicates.length}명 제외` : ""}${duplicateInText.length > 0 ? `\n텍스트 내부 중복: ${duplicateInText.length}건 제외` : ""}`;
        alert(summary);
      }

      onSuccess();
    } catch (error: any) {
      // 🔥 실제 에러 메시지 콘솔 출력
      console.error("일괄 등록/수정 실패:", error);
      console.error("에러 상세:", {
        code: error.code,
        message: error.message,
        stack: error.stack,
      });
      
      // 🔥 에러 타입별 명확한 메시지
      let errorMsg = "알 수 없는 오류";
      if (error.code === "permission-denied" || error.message?.includes("permission")) {
        errorMsg = "권한 오류: Firestore 규칙을 확인해주세요.";
      } else if (error.message?.includes("undefined") || error.message?.includes("Unsupported field value")) {
        errorMsg = "데이터 오류: undefined 필드가 있습니다. (회비플랜, 면제사유 확인)";
      } else {
        errorMsg = error.message || "알 수 없는 오류";
      }
      
      alert(`❌ 일괄 등록/수정에 실패했습니다.\n\n에러: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  // 🔥 저장 가능 여부 체크 (파일 모드)
  const canSaveFile = mode === "file" && file && previewData.length > 0 && columnMapping.name;
  
  // 🔥 이름 컬럼 인식 여부 체크 (유연한 매칭)
  const hasNameColumn = previewData.length > 0 && (
    columnMapping.name || 
    Object.keys(previewData[0] || {}).some((col) => {
      const normalized = normalizeColumnName(col);
      return normalized.includes("이름") || normalized.includes("name") || normalized.includes("성명") || normalized.includes("회원명");
    })
  );

  // ✅ body 스크롤 락 관리
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto py-4"
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] flex flex-col my-auto">
        {/* 🔥 헤더 (고정) */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold">일괄 등록</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ✕
          </button>
        </div>

        {/* 🔥 탭 선택 (고정) */}
        <div className="flex gap-2 px-6 pt-4 border-b border-gray-200">
          <button
            type="button"
            onClick={() => setMode("file")}
            className={`flex-1 py-2 text-center font-medium text-sm ${
              mode === "file"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            📁 파일로 등록
          </button>
          <button
            type="button"
            onClick={() => setMode("sheets")}
            className={`flex-1 py-2 text-center font-medium text-sm ${
              mode === "sheets"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            🔗 구글 시트 (추천)
          </button>
          <button
            type="button"
            onClick={() => setMode("text")}
            className={`flex-1 py-2 text-center font-medium text-sm ${
              mode === "text"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            ✍ 텍스트로 입력
          </button>
        </div>

        {/* 🔥 스크롤 가능한 콘텐츠 영역 */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <form onSubmit={handleSubmit} className="space-y-4" id="bulk-import-form">
          {mode === "sheets" ? (
            <>
              {/* 🔥 구글 시트 연동 - 배포용 UX */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                <p className="text-sm font-medium text-green-900 mb-1">
                  🔗 구글 시트로 회원 등록 (추천)
                </p>
                <p className="text-xs text-green-700">
                  회원 명단을 관리 중인 구글 시트 URL을 입력하세요.
                  <br />
                  members 시트의 내용이 미리보기로 표시됩니다.
                  <br />
                  확인 후 동기화 실행을 누르면 회원이 등록됩니다.
                </p>
              </div>

              {/* 🔥 템플릿 링크 제공 */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <p className="text-sm font-medium text-blue-900 mb-2">
                  📋 회원 명단 관리용 구글 시트 템플릿
                </p>
                <p className="text-xs text-blue-700 mb-2">
                  아래 링크를 눌러 <strong>사본 만들기</strong>로 사용하세요.
                  <br />
                  이 시트는 회원 명단의 원본이며, 수정 내용은 앱으로 가져올 수 있습니다.
                </p>
                <a
                  href="https://docs.google.com/spreadsheets/d/1YOUR_TEMPLATE_ID_HERE/copy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:text-blue-800 underline font-medium"
                  onClick={(e) => {
                    e.preventDefault();
                    alert("템플릿 ID를 설정해주세요. 구글 시트에서 템플릿을 만들고 템플릿 ID를 코드에 추가하면 됩니다.");
                  }}
                >
                  👉 회원 명단 구글 시트 템플릿 – 사본 만들기 →
                </a>
                <p className="text-xs text-blue-600 mt-2">
                  ※ 링크 클릭 → 파일 &gt; 사본 만들기
                </p>
              </div>

              {/* 🔥 구글 시트 URL 입력 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  구글 시트 URL 입력
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={sheetsUrl}
                    onChange={(e) => setSheetsUrl(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit"
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={handleFetchSheets}
                    disabled={sheetsLoading || !sheetsUrl.trim()}
                    className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {sheetsLoading ? "불러오는 중..." : "미리보기"}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  ⚠️ 구글 시트가 <strong>"링크가 있는 모든 사용자"</strong>에게 공개되어 있어야 합니다.
                  <br />
                  시트 공유 설정 → "링크가 있는 모든 사용자" → "뷰어" 권한
                </p>
              </div>

              {/* 🔥 동기화 정책 안내 */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-xs font-medium text-yellow-900 mb-1">
                  ⚠️ 주의사항
                </p>
                <ul className="text-xs text-yellow-700 list-disc list-inside space-y-1">
                  <li>동기화는 <strong>시트 → 앱 단방향</strong>입니다.</li>
                  <li>앱에서 수정한 내용은 시트에 반영되지 않습니다.</li>
                  <li>시트 이름은 <strong>members</strong>로 설정해주세요.</li>
                </ul>
              </div>

              {/* 🔥 검증 결과 요약 */}
              {syncResult && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">검증 결과</span>
                    <span className="text-xs text-gray-500">
                      신규: {syncResult.preview.filter((p) => p.action === "create").length}명 | 
                      수정: {syncResult.preview.filter((p) => p.action === "update").length}명 | 
                      오류: {syncResult.errors.length}건
                    </span>
                  </div>
                  {syncResult.errors.length > 0 && (
                    <div className="mt-2 text-xs text-red-600">
                      <strong>오류:</strong>
                      <ul className="list-disc list-inside mt-1">
                        {syncResult.errors.slice(0, 3).map((err, idx) => (
                          <li key={idx}>
                            {err.row}행: {err.error}
                          </li>
                        ))}
                        {syncResult.errors.length > 3 && (
                          <li>외 {syncResult.errors.length - 3}건...</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* 🔥 미리보기 테이블 */}
              {previewData.length > 0 && (
                <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        {Object.keys(previewData[0] || {}).map((col) => (
                          <th key={col} className="px-2 py-1 text-left border-b">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.slice(0, 5).map((row, idx) => {
                        const action = row["액션"];
                        const bgColor = action === "신규" ? "bg-green-50" : action === "수정" ? "bg-yellow-50" : "bg-gray-50";
                        return (
                          <tr key={idx} className={`border-b ${bgColor}`}>
                            {Object.values(row).map((val: any, colIdx) => (
                              <td key={colIdx} className="px-2 py-1">
                                {val || "-"}
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {previewData.length > 5 && (
                    <p className="text-xs text-gray-500 p-2 text-center">
                      외 {previewData.length - 5}명...
                    </p>
                  )}
                </div>
              )}

              {/* 🔥 동기화 버튼 */}
              {syncResult && syncResult.preview.length > 0 && (
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    {loading ? "동기화 중..." : "✅ 동기화 실행"}
                  </button>
                </div>
              )}
            </>
          ) : mode === "file" ? (
            <>
              {/* 🔥 파일 업로드 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  파일 선택 (.xlsx, .csv)
                </label>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={async (e) => {
                    const selectedFile = e.target.files?.[0];
                    if (!selectedFile) return;
                    const lower = selectedFile.name.toLowerCase();
                    if (
                      !lower.endsWith(".csv") &&
                      !lower.endsWith(".xlsx") &&
                      !lower.endsWith(".xls")
                    ) {
                      alert("CSV(.csv) 또는 Excel(.xlsx, .xls) 파일만 업로드할 수 있습니다.");
                      e.target.value = "";
                      return;
                    }

                    // 🔥 파일 재선택 시 강제 리셋
                    setFile(selectedFile);
                    setPreviewData([]);
                    setColumnMapping({});
                    setHeaderRowIndex(0);
                    setLoading(true);
                    
                    try {
                      const result = await parseFile(selectedFile);
                      setPreviewData(result.data);
                      setHeaderRowIndex(result.headerRowIndex);
                      
                      // 🔥 컬럼 자동 매핑
                      if (result.data.length > 0) {
                        const firstRow = result.data[0];
                        const autoMapping: { [key: string]: string } = {};
                        
                        Object.keys(firstRow).forEach((col) => {
                          const normalized = normalizeColumnName(col);
                          
                          // 🔥 유연한 컬럼 매칭 (정규화된 이름으로 비교)
                          if (normalized.includes("이름") || normalized.includes("name") || normalized.includes("성명") || normalized.includes("회원명")) {
                            autoMapping[col] = "name";
                          } else if (normalized.includes("전화") || normalized.includes("phone") || normalized.includes("연락") || normalized.includes("tel")) {
                            autoMapping[col] = "phone";
                          } else if (normalized.includes("배번") || normalized.includes("jersey") || normalized.includes("등번호") || normalized.includes("번호")) {
                            autoMapping[col] = "jerseyNumber";
                          } else if (normalized.includes("역할") || normalized.includes("role") || normalized.includes("직책")) {
                            autoMapping[col] = "role";
                          } else if (normalized.includes("회비") || normalized.includes("fee") || normalized.includes("요금")) {
                            autoMapping[col] = "feePlan";
                          } else if (normalized.includes("소속") || normalized.includes("squad") || normalized.includes("팀")) {
                            autoMapping[col] = "squad";
                          } else if (normalized.includes("메모") || normalized.includes("memo") || normalized.includes("비고") || normalized.includes("note")) {
                            autoMapping[col] = "memo";
                          }
                        });
                        
                        setColumnMapping(autoMapping);
                      }
                    } catch (error) {
                      console.error("파일 파싱 실패:", error);
                      alert(
                        error instanceof Error
                          ? error.message
                          : "파일을 읽을 수 없습니다."
                      );
                    } finally {
                      setLoading(false);
                    }
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* 🔥 헤더 행 정보 표시 */}
              {previewData.length > 0 && headerRowIndex > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
                  <p className="text-xs text-blue-700">
                    ℹ️ 헤더 행 자동 탐색: {headerRowIndex + 1}번째 행을 컬럼으로 사용했습니다.
                  </p>
                </div>
              )}

              {/* 🔥 컬럼 인식 경고 */}
              {previewData.length > 0 && !hasNameColumn && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm font-medium text-red-900 mb-1">
                    ⚠️ 이름 컬럼을 찾을 수 없습니다
                  </p>
                  <p className="text-xs text-red-700">
                    엑셀 파일에 <strong>"이름"</strong> 또는 <strong>"name"</strong> 컬럼이 필요합니다.
                    <br />
                    현재 인식된 컬럼: {Object.keys(previewData[0] || {}).join(", ")}
                    <br />
                    <strong>💡 팁:</strong> 파일 상단에 제목이나 빈 행이 있으면 자동으로 건너뜁니다.
                  </p>
                </div>
              )}

              {/* 🔥 미리보기 테이블 */}
              {previewData.length > 0 && (
                <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        {Object.keys(previewData[0] || {}).map((col) => (
                          <th key={col} className="px-2 py-1 text-left border-b">
                            {col}
                            {columnMapping[col] && (
                              <span className="ml-1 text-blue-600 text-xs">
                                ({columnMapping[col]})
                              </span>
                            )}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.slice(0, 5).map((row, idx) => (
                        <tr key={idx} className="border-b">
                          {Object.values(row).map((val: any, colIdx) => (
                            <td key={colIdx} className="px-2 py-1">
                              {val || "-"}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {previewData.length > 5 && (
                    <p className="text-xs text-gray-500 p-2 text-center">
                      외 {previewData.length - 5}명...
                    </p>
                  )}
                </div>
              )}

              {/* 🔥 저장 버튼 (파일 모드 - 항상 표시) */}
              {previewData.length > 0 && (
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !hasNameColumn}
                    className="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    {loading ? "저장 중..." : hasNameColumn ? `저장 (${previewData.length}명)` : "이름 컬럼 필요"}
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              {/* 🔥 텍스트 입력 (기존 방식) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  작업 모드
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="updateMode"
                      value="import"
                      checked={updateMode === "import"}
                      onChange={() => setUpdateMode("import")}
                      className="mr-2"
                    />
                    <span>신규 추가</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="updateMode"
                      value="update"
                      checked={updateMode === "update"}
                      onChange={() => setUpdateMode("update")}
                      className="mr-2"
                    />
                    <span>기존 업데이트</span>
                  </label>
                </div>
              </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              회원 목록 (한 줄에 한 명)
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={10}
              placeholder={updateMode === "update" 
                ? "CSV 형식:\n이름,역할,feePlan,exemptReason\n손승호,회장,exempt,role\n박수복,부회장,exempt,role"
                : "공백 구분:\n홍길동 청룡 일반\n김철수 백호 회장\n또는 CSV:\n이름,역할,feePlan,exemptReason"}
            />
            <p className="text-xs text-gray-500 mt-2">
              {updateMode === "update" ? (
                <>
                  <strong>CSV 형식:</strong> 이름,역할,feePlan,exemptReason<br />
                  예: 손승호,회장,exempt,role<br />
                  또는 <strong>공백 구분:</strong> 이름 [소속] 역할
                </>
              ) : (
                <>
                  <strong>공백 구분:</strong> 이름 [소속] 역할<br />
                  또는 <strong>CSV:</strong> 이름,역할,feePlan,exemptReason
                </>
              )}
            </p>
          </div>

              {/* 🔥 업데이트 모드일 때만 표시 */}
              {updateMode === "update" && (
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={createNewIfNotFound}
                      onChange={(e) => setCreateNewIfNotFound(e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">없는 이름은 신규 추가로 처리</span>
                  </label>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "저장 중..." : "저장"}
                </button>
              </div>
            </>
          )}
          </form>
        </div>
      </div>
    </div>
  );
}

// 🔑 권한 변경 이력 모달 (OWNER 전용)
function AccessLogsModal({
  teamId,
  onClose,
}: {
  teamId: string;
  onClose: () => void;
}) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!teamId) return;

    const fetchLogs = async () => {
      try {
        const logsQuery = query(
          collection(db, "teams", teamId, "accessLogs"),
          orderBy("changedAt", "desc")
        );
        const snapshot = await getDocs(logsQuery);
        
        const logsList: any[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          logsList.push({
            id: docSnap.id,
            ...data,
            changedAt: data.changedAt?.toDate?.() || data.changedAt || new Date(),
          });
        });
        
        setLogs(logsList);
      } catch (error) {
        console.error("권한 변경 이력 조회 실패:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [teamId]);

  // ✅ body 스크롤 락 관리
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 py-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-2xl font-bold">📋 권한 변경 이력</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ✕
          </button>
        </div>

        {/* 스크롤 가능한 콘텐츠 */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-gray-500 text-sm">이력 조회 중...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">권한 변경 이력이 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900">{log.targetMemberName}</span>
                        <span className="text-sm text-gray-500">
                          {log.before} → {log.after}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(log.changedAt).toLocaleString("ko-KR")}
                      </div>
                    </div>
                    <div className="text-xs text-gray-400 text-right">
                      by {log.changedByName || "시스템"}
                    </div>
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

// 🔥 감사 타임라인 모달 (OWNER 전용) - 통합 감사 로그
function AuditTimelineModal({
  teamId,
  onClose,
}: {
  teamId: string;
  onClose: () => void;
}) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!teamId) return;

    const fetchAuditLogs = async () => {
      try {
        // 🔥 accessLogs (권한 변경, 복구)
        const accessLogsQuery = query(
          collection(db, "teams", teamId, "accessLogs"),
          orderBy("changedAt", "desc")
        );
        const accessSnapshot = await getDocs(accessLogsQuery);
        
        const accessLogsList: any[] = [];
        accessSnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          accessLogsList.push({
            id: docSnap.id,
            type: "ACCESS",
            ...data,
            changedAt: data.changedAt?.toDate?.() || data.changedAt || new Date(),
          });
        });

        // 🔥 auditLogs (회원 추가/수정/삭제/복구/상태 변경)
        const auditLogsQuery = query(
          collection(db, "teams", teamId, "auditLogs"),
          orderBy("createdAt", "desc")
        );
        const auditSnapshot = await getDocs(auditLogsQuery);
        
        const auditLogsList: any[] = [];
        auditSnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          auditLogsList.push({
            id: docSnap.id,
            type: "AUDIT",
            ...data,
            createdAt: data.createdAt?.toDate?.() || data.createdAt || new Date(),
          });
        });

        // 🔥 통합 및 시간순 정렬
        const allLogs = [...accessLogsList, ...auditLogsList].sort((a, b) => {
          const timeA = a.changedAt || a.createdAt || new Date(0);
          const timeB = b.changedAt || b.createdAt || new Date(0);
          return timeB.getTime() - timeA.getTime();
        });
        
        setLogs(allLogs);
      } catch (error) {
        console.error("감사 타임라인 조회 실패:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAuditLogs();
  }, [teamId]);

  // ✅ body 스크롤 락 관리
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const getActionLabel = (log: any) => {
    if (log.type === "ACCESS") {
      if (log.action === "RESTORE") {
        return `♻️ 복구: ${log.targetMemberName}`;
      }
      return `🔑 권한 변경: ${log.targetMemberName} (${log.before} → ${log.after})`;
    }
    
    // AUDIT 타입
    switch (log.action) {
      case "MEMBER_ADD":
        return `➕ 회원 추가: ${log.targetMemberName || "신규 회원"}`;
      case "MEMBER_UPDATE":
        return `✏️ 회원 수정: ${log.targetMemberName || "회원"}`;
      case "MEMBER_DELETE":
        return `🗑️ 회원 삭제: ${log.targetMemberName || "회원"}`;
      case "MEMBER_RESTORE":
        return `♻️ 회원 복구: ${log.targetMemberName || "회원"}`;
      case "STATUS_CHANGE":
        return `🔄 상태 변경: ${log.targetMemberName || "회원"} (${log.before?.status || "?"} → ${log.after?.status || "?"})${log.reason ? ` - ${log.reason}` : ""}`;
      case "FEE_PLAN_CHANGE":
        return `💰 회비 플랜 변경: ${log.targetMemberName || "회원"} (${log.before?.feePlan || "?"} → ${log.after?.feePlan || "?"})`;
      case "FEE_OVERRIDE":
        return `💰 회비 수동 변경: ${log.targetMemberName || "회원"} (${log.before?.feePlan || "?"} → ${log.after?.feePlan || "?"})`;
      case "ACCESS_LEVEL_CHANGE":
        return `🔑 권한 변경: ${log.targetMemberName || "회원"}`;
      default:
        return `${log.action}: ${log.targetMemberName || "회원"}`;
    }
  };

  const getActorName = (log: any) => {
    return log.changedByName || log.actorName || "시스템";
  };

  const getTimestamp = (log: any) => {
    const date = log.changedAt || log.createdAt || new Date();
    return new Date(date).toLocaleString("ko-KR");
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 py-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] flex flex-col my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-2xl font-bold">📊 감사 타임라인</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ✕
          </button>
        </div>

        {/* 스크롤 가능한 콘텐츠 */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-gray-500 text-sm">타임라인 조회 중...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">감사 로그가 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900">
                          {getActionLabel(log)}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {getTimestamp(log)}
                      </div>
                    </div>
                    <div className="text-xs text-gray-400 text-right">
                      by {getActorName(log)}
                    </div>
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

// 📊 월간 운영 리포트 모달 (OWNER 전용)
function MonthlyReportModal({
  teamId,
  members,
  onClose,
}: {
  teamId: string;
  members: TeamMember[];
  onClose: () => void;
}) {
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const { user } = useAuth();
  const { myTeam } = useTeam();

  // 📊 리포트 생성
  const handleGenerateReport = async () => {
    if (!teamId || !myTeam) return;
    
    setGenerating(true);
    try {
      // 🔥 feePolicy 가져오기 (팀 설정에서)
      const feePolicy: any = {
        monthly: myTeam.monthlyFee || 20000,
        annualAmount: myTeam.annualAmount || 200000,
        annualPayBy: myTeam.annualPayBy || "02-28",
        annualBenefitMonths: myTeam.annualBenefitMonths || 2,
        graceUnpaidMonths: myTeam.graceUnpaidMonths || 3,
      };
      
      // 🔥 ledger 항목 가져오기 (해당 월)
      const ledgerQuery = query(
        collection(db, "teams", teamId, "ledger"),
        where("month", "==", selectedMonth)
      );
      const ledgerSnapshot = await getDocs(ledgerQuery);
      const ledgerItemsByMonth: { [key: string]: any[] } = {};
      ledgerSnapshot.forEach((doc) => {
        const data = doc.data();
        const month = data.month || selectedMonth;
        if (!ledgerItemsByMonth[month]) {
          ledgerItemsByMonth[month] = [];
        }
        ledgerItemsByMonth[month].push({ id: doc.id, ...data });
      });
      
      // 📊 리포트 생성
      const { generateMonthlyReport } = await import("@/utils/monthlyReport");
      const reportData = await generateMonthlyReport(
        members as any,
        selectedMonth,
        feePolicy,
        ledgerItemsByMonth
      );
      
      // 🔥 Firestore에 저장
      const reportRef = doc(db, "teams", teamId, "monthlyReports", selectedMonth);
      await setDoc(reportRef, {
        ...reportData,
        generatedAt: serverTimestamp(),
        generatedBy: user?.uid || "system",
        generatedByName: user?.email || "시스템",
      });
      
      setReport(reportData);
    } catch (error) {
      console.error("리포트 생성 실패:", error);
      alert(`리포트 생성에 실패했습니다.\n\n에러: ${error}`);
    } finally {
      setGenerating(false);
    }
  };

  // 📊 리포트 로드
  useEffect(() => {
    if (!teamId || !selectedMonth) return;
    
    const loadReport = async () => {
      setLoading(true);
      try {
        const reportRef = doc(db, "teams", teamId, "monthlyReports", selectedMonth);
        const reportSnap = await getDoc(reportRef);
        
        if (reportSnap.exists()) {
          const data = reportSnap.data();
          setReport({
            ...data,
            generatedAt: data.generatedAt?.toDate?.() || data.generatedAt || new Date(),
          });
        } else {
          setReport(null);
        }
      } catch (error) {
        console.error("리포트 로드 실패:", error);
      } finally {
        setLoading(false);
      }
    };
    
    loadReport();
  }, [teamId, selectedMonth]);

  // ✅ body 스크롤 락 관리
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // 📅 월 선택 옵션 생성 (최근 12개월)
  const getMonthOptions = () => {
    const options: string[] = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      options.push(monthStr);
    }
    return options;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ko-KR").format(amount) + "원";
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 py-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold">📈 월간 운영 리포트</h2>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              {getMonthOptions().map(month => (
                <option key={month} value={month}>
                  {month.replace("-", "년 ").replace("-", "월")}
                </option>
              ))}
            </select>
            <button
              onClick={handleGenerateReport}
              disabled={generating}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? "생성 중..." : "리포트 생성"}
            </button>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ✕
          </button>
        </div>

        {/* 스크롤 가능한 콘텐츠 */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-gray-500 text-sm">리포트 로딩 중...</p>
            </div>
          ) : !report ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">해당 월의 리포트가 없습니다.</p>
              <button
                onClick={handleGenerateReport}
                disabled={generating}
                className="px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
              >
                {generating ? "생성 중..." : "리포트 생성하기"}
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* 📊 기본 요약 카드 */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  📅 {selectedMonth.replace("-", "년 ").replace("-", "월")} 운영 요약
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">총 회원 수</p>
                    <p className="text-2xl font-bold text-gray-900">{report.memberStats.total}명</p>
                    <div className="mt-2 space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">재원:</span>
                        <span className="font-semibold text-green-700">{report.memberStats.active}명</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">휴원:</span>
                        <span className="font-semibold text-yellow-700">{report.memberStats.paused}명</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">제명:</span>
                        <span className="font-semibold text-red-700">{report.memberStats.expelled}명</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">회비 대상자</p>
                    <p className="text-2xl font-bold text-gray-900">{report.feeStats.totalEligible}명</p>
                    <div className="mt-2 space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">월회비:</span>
                        <span className="font-semibold">{report.feeStats.monthly}명</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">연회비:</span>
                        <span className="font-semibold">{report.feeStats.annual}명</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">면제:</span>
                        <span className="font-semibold">{report.feeStats.exempt}명</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 💰 회비 현황 */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">💰 회비 현황</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-2">이번 달 회비 수입</p>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-green-50 rounded-lg p-4">
                        <p className="text-xs text-gray-600 mb-1">납부 완료</p>
                        <p className="text-xl font-bold text-green-700">{report.feeRevenue.paidCount}명</p>
                      </div>
                      <div className="bg-yellow-50 rounded-lg p-4">
                        <p className="text-xs text-gray-600 mb-1">미납</p>
                        <p className="text-xl font-bold text-yellow-700">{report.feeRevenue.unpaidCount}명</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-xs text-gray-600 mb-1">면제</p>
                        <p className="text-xl font-bold text-gray-700">{report.feeRevenue.exemptCount}명</p>
                      </div>
                    </div>
                  </div>
                  <div className="border-t border-gray-200 pt-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">예상 수입</p>
                        <p className="text-xl font-bold text-blue-700">{formatCurrency(report.feeRevenue.expectedAmount)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">실 수입</p>
                        <p className="text-xl font-bold text-green-700">{formatCurrency(report.feeRevenue.actualAmount)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">미수금</p>
                        <p className="text-xl font-bold text-red-700">{formatCurrency(report.feeRevenue.unpaidAmount)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ⚠️ 주의 항목 */}
              {report.alerts && report.alerts.length > 0 && (
                <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">⚠️ 주의 항목</h3>
                  <div className="space-y-3">
                    {report.alerts.map((alert: any, index: number) => (
                      <div key={index} className="bg-white rounded-lg p-4 border border-yellow-300">
                        <p className="font-semibold text-yellow-800 mb-2">{alert.message}</p>
                        {alert.memberNames && alert.memberNames.length > 0 && (
                          <p className="text-sm text-gray-600">
                            대상: {alert.memberNames.join(", ")}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 리포트 생성 정보 */}
              <div className="text-xs text-gray-400 text-center">
                생성일: {new Date(report.generatedAt).toLocaleString("ko-KR")}
                {report.generatedByName && ` | 생성자: ${report.generatedByName}`}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 🔥 E-4: 초대 관리 화면 */}
      {showInviteManagement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">초대 관리</h2>
              <button
                onClick={() => setShowInviteManagement(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            {invitesLoading ? (
              <div className="text-center py-8">
                <p className="text-gray-500">로딩 중...</p>
              </div>
            ) : invites.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">생성된 초대가 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {invites.map((invite: any) => {
                  const expiresAt = invite.expiresAt?.toDate?.() || new Date(invite.expiresAt);
                  const isExpired = expiresAt < new Date();
                  const isRevoked = invite.revoked === true;
                  const isUsedUp = invite.usedCount >= invite.maxUses;
                  const status = isRevoked
                    ? "취소됨"
                    : isExpired
                    ? "만료됨"
                    : isUsedUp
                    ? "사용 완료"
                    : "활성";

                  return (
                    <div
                      key={invite.id}
                      className="border border-gray-200 rounded-lg p-4 flex justify-between items-center"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-medium text-gray-900">
                            {invite.id}
                          </span>
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              status === "활성"
                                ? "bg-green-100 text-green-700"
                                : status === "취소됨"
                                ? "bg-red-100 text-red-700"
                                : status === "만료됨"
                                ? "bg-gray-100 text-gray-700"
                                : "bg-yellow-100 text-yellow-700"
                            }`}
                          >
                            {status}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 space-y-1">
                          <p>역할: {invite.role}</p>
                          <p>사용: {invite.usedCount || 0} / {invite.maxUses || 1}</p>
                          <p>만료: {expiresAt.toLocaleString("ko-KR")}</p>
                          {invite.lastUsedAt && (
                            <p>
                              마지막 사용:{" "}
                              {invite.lastUsedAt?.toDate?.()?.toLocaleString("ko-KR") ||
                                new Date(invite.lastUsedAt).toLocaleString("ko-KR")}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {!isRevoked && !isExpired && !isUsedUp && (
                          <button
                            onClick={() => handleRevokeInvite(invite.id)}
                            className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                          >
                            취소
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 🔥 QR 초대 생성 모달 */}
      {showQRModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold mb-4">QR 초대 코드</h2>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                아래 URL을 QR 코드로 변환하여 공유하세요.
              </p>
              <div className="bg-gray-50 rounded-lg p-3 mb-3">
                <p className="text-xs text-gray-500 break-all">{qrUrl}</p>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(qrUrl);
                  setToastMessage("URL이 복사되었습니다");
                  setShowToast(true);
                  setTimeout(() => setShowToast(false), 2000);
                }}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
              >
                📋 URL 복사
              </button>
            </div>
            <div className="text-xs text-gray-500 mb-4">
              <p>• 유효 기간: 24시간</p>
              <p>• 사용 횟수: 1회</p>
              <p>• 역할: 일반 멤버</p>
            </div>
            <button
              onClick={() => {
                setShowQRModal(false);
                setQrUrl("");
              }}
              className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

