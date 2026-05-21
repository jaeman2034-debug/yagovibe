// src/context/TeamContext.tsx
// 🔥 관리자 처리 완전 리팩터링: team_members 단일 조회 + role 통일

import { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo, type ReactNode } from "react";
import { useAuth } from "./AuthProvider";
import { doc, getDoc, collection, query, where, getDocs, limit } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";

// 🔥 타입: roleConstants.TeamRole와 동기화 (owner | admin | member)
import type { TeamRole } from "@/lib/team/roleConstants";
import type { HubTeamBillingStatus, HubTeamPlanId } from "@/types/teamBilling";
import { normalizeHubBillingStatus, normalizeHubTeamPlan } from "@/lib/billing/hubTeamPlanGates";
export type { TeamRole };

export type TeamMemberDoc = {
  uid: string;
  teamId: string;
  role: TeamRole;
};

interface Team {
  id: string;
  name: string;
  sportType: string;
  ownerUid: string;
  plan: HubTeamPlanId;
  billingStatus?: HubTeamBillingStatus;
  allowManualFee?: boolean; // FREE에서도 관리자 수동 완납 허용 여부
}

interface TeamContextType {
  myTeam: Team | null;
  role: TeamRole | null;
  isAdmin: boolean;
  isManager: boolean;
  plan: HubTeamPlanId | null;
  loading: boolean;
  refreshTeam: (sportType: string) => Promise<void>;
  seniorMode: boolean; // 🔥 어르신 모드
  setSeniorMode: (enabled: boolean) => void;
  // 🔥 확장 필드 (팀 시스템 확장)
  currentTeam: Team | null; // myTeam과 동일 (호환성)
  myRole: TeamRole | null; // role과 동일 (호환성)
  isOwner: boolean; // owner 권한 여부
}

const TeamContext = createContext<TeamContextType | undefined>(undefined);

export function TeamProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [myTeam, setMyTeam] = useState<Team | null>(null);
  const [role, setRole] = useState<TeamRole | null>(null);
  const [plan, setPlan] = useState<HubTeamPlanId | null>(null);
  const [loading, setLoading] = useState(true);
  const [seniorMode, setSeniorMode] = useState<boolean>(() => {
    // 🔥 localStorage에서 어르신 모드 설정 불러오기
    const saved = localStorage.getItem("seniorMode");
    return saved === "true";
  });

  // 🔥 권한 계산: role 기반 (owner | admin | member)
  const isAdmin = useMemo(() => role === "admin" || role === "owner", [role]);
  const isManager = useMemo(() => role === "owner" || role === "admin", [role]);
  const isOwner = useMemo(() => {
    if (!myTeam || !user?.uid) return false;
    return myTeam.ownerUid === user.uid;
  }, [myTeam, user?.uid]);

  // 🔥 무한 루프 방지: refreshTeam 실행 중 플래그
  const isRefreshingRef = useRef(false);
  const lastRefreshRef = useRef<{ sportType: string; timestamp: number } | null>(null);

  // 🔥 Step 14: 앱 시작 시 localStorage → TeamContext hydrate
  useEffect(() => {
    const savedTeam = localStorage.getItem("myTeam");
    if (savedTeam) {
      try {
        const parsed = JSON.parse(savedTeam);
        setMyTeam({
          ...parsed,
          plan: normalizeHubTeamPlan(parsed?.plan),
          billingStatus: normalizeHubBillingStatus(parsed?.billingStatus),
        });
        setPlan(normalizeHubTeamPlan(parsed?.plan));
      } catch (e) {
        console.error("저장된 팀 정보 복원 실패:", e);
      }
    }
    setLoading(false);
  }, []);

  // 🔥 팀 정보 새로고침 (sportType 필터링 적용)
  // 1순위: ownerUid 기준 (내가 만든 팀)
  // 2순위: team_members 루트 컬렉션 기준 (내가 속한 팀)
  const refreshTeam = useCallback(async (sportType: string) => {
    if (!user?.uid) return;

    // 🔥 중복 실행 방지: 이미 실행 중이면 스킵
    if (isRefreshingRef.current) {
      console.log("⏭️ [TeamContext.refreshTeam] 이미 실행 중, 스킵:", { sportType });
      return;
    }

    // 🔥 짧은 시간 내 동일한 sportType으로 재호출 방지 (500ms)
    const now = Date.now();
    if (
      lastRefreshRef.current &&
      lastRefreshRef.current.sportType === sportType &&
      now - lastRefreshRef.current.timestamp < 500
    ) {
      console.log("⏭️ [TeamContext.refreshTeam] 너무 빈번한 호출, 스킵:", { sportType });
      return;
    }

    isRefreshingRef.current = true;
    lastRefreshRef.current = { sportType, timestamp: now };

    try {
      // 🔥 Firebase 프로젝트 확인 (DB 불일치 체크)
      const projectId = db.app.options.projectId;
      
      // 🔥 Auth uid 재확인 (세션 불일치 체크)
      const authUid = auth.currentUser?.uid;
      const contextUid = user.uid;
      const uidMatch = authUid === contextUid;
      
      console.log("🔄 [TeamContext.refreshTeam] start", { 
        sportType, 
        userId: contextUid,
        authCurrentUserUid: authUid,
        uidMatch: uidMatch,
        firebaseProjectId: projectId,
        firebaseConfig: {
          projectId: projectId,
          authDomain: db.app.options.authDomain
        }
      });
      
      console.log("💡 [TeamContext.refreshTeam] Firebase 프로젝트 확인:");
      console.log("   - 현재 앱이 사용하는 프로젝트:", projectId);
      console.log("   - Firestore 콘솔에서 이 프로젝트를 확인하세요:", `https://console.firebase.google.com/project/${projectId}/firestore`);
      
      console.log("💡 [TeamContext.refreshTeam] Auth 세션 확인:");
      console.log("   - auth.currentUser.uid:", authUid);
      console.log("   - TeamContext user.uid:", contextUid);
      console.log("   - uid 일치:", uidMatch ? "✅" : "❌ 불일치 (다른 계정으로 로그인됨)");
      
      if (!uidMatch) {
        console.warn("⚠️ [TeamContext.refreshTeam] Auth 세션 불일치 감지!");
        console.warn("   - auth.currentUser와 TeamContext의 user가 다른 계정입니다.");
        console.warn("   - 해결: 로그아웃 후 다시 로그인하세요.");
      }

      // 1) ownerUid + sportType으로 내 팀 찾기
      const ownerTeamsQuery = query(
        collection(db, "teams"),
        where("ownerUid", "==", user.uid),
        where("sportType", "==", sportType)
      );
      const ownerTeamsSnapshot = await getDocs(ownerTeamsQuery);
      console.log("🔍 [TeamContext.refreshTeam] ownerTeams count:", ownerTeamsSnapshot.size);
      
      // 🔥 디버그: ownerTeams 쿼리 결과 상세 로그
      if (ownerTeamsSnapshot.size > 0) {
        ownerTeamsSnapshot.docs.forEach((doc, idx) => {
          const data = doc.data();
          console.log(`🔍 [TeamContext.refreshTeam] ownerTeams[${idx}]:`, {
            teamId: doc.id,
            name: data.name,
            sportType: data.sportType,
            sportKey: data.sportKey,
            ownerUid: data.ownerUid,
            targetSportType: sportType,
            match: data.sportType === sportType || data.sportKey === sportType
          });
        });
      } else {
        console.warn("⚠️ [TeamContext.refreshTeam] ownerUid + sportType 쿼리 결과 없음:", {
          uid: user.uid,
          sportType,
          query: `where("ownerUid", "==", "${user.uid}") && where("sportType", "==", "${sportType}")`
        });
      }

      let selectedTeamId: string | null = ownerTeamsSnapshot.docs[0]?.id ?? null;
      let selectedTeamData: any | null = ownerTeamsSnapshot.docs[0]?.data() ?? null;
      let foundRole: TeamRole | null = null;

      // owner 팀이 있으면 권한 확인
      if (selectedTeamId && selectedTeamData) {
        // 🔥 TEAM DOC PATH & PLAN 로그 (owner 팀)
        console.log("🔥 TEAM DOC PATH (owner):", `teams/${selectedTeamId}`);
        console.log("🔥 TEAM PLAN FROM FIRESTORE (owner):", selectedTeamData?.plan);
        console.log("🔥 TEAM DATA RAW (owner):", selectedTeamData);
        
        // owner는 항상 admin
        foundRole = "admin";
        console.log("✅ [TeamContext.refreshTeam] owner 팀 발견, admin role 설정:", {
          teamId: selectedTeamId,
          foundRole: foundRole,
          plan: selectedTeamData?.plan
        });
      }

      // 2) owner 팀이 없으면: teams/{teamId}/members/{uid} 서브컬렉션에서 내가 속한 팀 찾기
      if (!selectedTeamId) {
        try {
          // 🔥 모든 팀을 조회하고, 각 팀의 members 서브컬렉션에서 uid 확인
          // ✅ 정답 구조: teams/{teamId}/members/{uid}
          console.log("🔍 [TeamContext.refreshTeam] teams/{teamId}/members/{uid} 조회 시작:", {
            uid: user.uid,
            query: "모든 teams 조회 → 각 팀의 members/{uid} 확인"
          });
          
          // 모든 팀 조회 (sportType 필터링은 나중에)
          const allTeamsQuery = query(collection(db, "teams"));
          const allTeamsSnapshot = await getDocs(allTeamsQuery);
          
          console.log("🔍 [TeamContext.refreshTeam] 전체 팀 수:", allTeamsSnapshot.size);

          // 각 팀의 members 서브컬렉션에서 내 uid 확인
          for (const teamDoc of allTeamsSnapshot.docs) {
            const teamId = teamDoc.id;
            const teamData = teamDoc.data();
            
            // 🔥 teams/{teamId}/members/{uid} 문서 확인
            const memberDocRef = doc(db, "teams", teamId, "members", user.uid);
            const memberDocSnap = await getDoc(memberDocRef);
            
            if (!memberDocSnap.exists()) {
              // 이 팀의 members에 내가 없으면 다음 팀 확인
              continue;
            }
            
            const memberData = memberDocSnap.data();
            // 🔥 호환성: sportType, sportKey, sport 모두 확인
            const teamSportType = teamData.sportType || teamData.sportKey || teamData.sport;
            
            console.log("🔍 [TeamContext.refreshTeam] 멤버십 발견:", { 
              teamId, 
              teamName: teamData.name, 
              teamSportType, 
              targetSportType: sportType,
              role: memberData.role,
              // 🔥 디버그: 전체 teamData 구조 확인
              teamDataKeys: Object.keys(teamData),
              hasSportType: "sportType" in teamData,
              hasSportKey: "sportKey" in teamData,
              sportTypeValue: teamData.sportType,
              sportKeyValue: teamData.sportKey
            });

            // sportType 일치 확인
            if (teamSportType === sportType) {
              selectedTeamId = teamId;
              selectedTeamData = teamData;
              
              // 🔥 권한 확인: teams/{teamId}/members/{uid}에서 role 직접 읽기 (단일 진실)
              const roleFromDB = memberData.role as TeamRole | undefined;
              
              // role 판별: DB에서 읽은 값 그대로 사용 (없으면 "member")
              let role: TeamRole = roleFromDB || "member";
              
              // role 값 정규화: "관리자" → "admin", 소문자 변환
              const normalizedRole = String(role).toLowerCase().trim();
              if (normalizedRole === "관리자" || normalizedRole === "admin") {
                role = "admin";
              } else if (normalizedRole === "manager" || normalizedRole === "총무") {
                role = "manager";
              } else {
                role = "member";
              }
              
              // ownerId fallback (팀 생성자는 항상 admin)
              const ownerId = teamData.ownerId || teamData.ownerUid;
              if (ownerId === user.uid) {
                role = "admin";
              }
              
              foundRole = role;
              
              console.log("✅ [TeamContext.refreshTeam] 팀 찾음:", { 
                teamId, 
                teamName: teamData.name,
                sportType: teamSportType,
                roleFromDB: memberData.role,
                finalRole: foundRole,
                memberPath: `teams/${teamId}/members/${user.uid}`
              });
              break;
            } else {
              console.log("⏭️ [TeamContext.refreshTeam] sportType 불일치, 다음 팀 확인:", { 
                teamId,
                teamName: teamData.name,
                teamSportType, 
                targetSportType: sportType 
              });
            }
          }
          
          // 모든 팀을 확인했는데도 팀을 찾지 못한 경우
          if (!selectedTeamId) {
            console.warn("⚠️ [TeamContext.refreshTeam] teams/{teamId}/members/{uid}에서 sportType 일치하는 팀을 찾지 못했습니다:", {
              checkedTeamsCount: allTeamsSnapshot.size,
              targetSportType: sportType,
              uid: user.uid
            });
            // sportType 불일치 시 여기서는 로그만 남기고, 아래 최종 체크에서 처리
          }
        } catch (error: any) {
          console.error("❌ [TeamContext.refreshTeam] teams/{teamId}/members/{uid} 조회 실패:", {
            error: error.message,
            code: error.code,
            uid: user.uid,
            errorName: error.name
          });
          
          // 에러 발생 시에도 상태 초기화
          setMyTeam(null);
          setRole(null);
          setPlan(null);
          localStorage.removeItem("myTeam");
        }
      }

      // 3) 최종 선택된 팀이 없으면: 이 종목에서 내가 속한 팀이 없음
      if (!selectedTeamId || !selectedTeamData) {
        console.warn("⚠️ [TeamContext.refreshTeam] no team found for sportType", sportType);
        console.warn("   → 팀 컨텍스트 초기화, Policy Engine 호출 차단됨");
        setMyTeam(null);
        setRole(null);
        setPlan(null);
        localStorage.removeItem("myTeam");
        isRefreshingRef.current = false; // 플래그 해제
        return; // ⬅️ 여기서 반드시 종료 (Policy Engine 호출 방지)
      }

      // 4) 내 role 설정 (이미 위에서 team_members 조회 완료)
      if (foundRole) {
        // 위에서 이미 role을 찾았으면 바로 설정
        setRole(foundRole);
        console.log("✅ [TeamContext.refreshTeam] role 설정 완료:", foundRole);
      } else {
        // foundRole이 null이면 최종 fallback: ownerUid로 owner 판단
        const finalRole: TeamRole = selectedTeamData.ownerUid === user.uid ? "owner" : "member";
        console.log("✅ [TeamContext.refreshTeam] ownerUid로 role 판단 (최종 fallback):", { 
          ownerUid: selectedTeamData.ownerUid,
          userUid: user.uid,
          finalRole: finalRole 
        });
        setRole(finalRole);
      }

      // 5) team 상태 세팅
      const planFromFirestore = selectedTeamData.plan;
      const normalizedPlan = normalizeHubTeamPlan(planFromFirestore);
      const billingStatus = normalizeHubBillingStatus(selectedTeamData.billingStatus);

      console.log("🔥 [TeamContext] plan 정규화 전:", {
        planFromFirestore,
        normalizedPlan,
        billingStatus,
        selectedTeamId,
      });

      const fetchedTeam: Team = {
        id: selectedTeamId,
        name: selectedTeamData.name || "",
        sportType: selectedTeamData.sportType || sportType,
        ownerUid: selectedTeamData.ownerUid || "",
        plan: normalizedPlan,
        billingStatus,
        allowManualFee: selectedTeamData.allowManualFee === true,
      };

      setMyTeam(fetchedTeam);
      setPlan(fetchedTeam.plan);
      
      // 🔥 TEAM PLAN 로그 (디버깅용)
      console.log("🔥 TEAM PLAN:", fetchedTeam.plan);
      console.log("🔥 TEAM RAW:", fetchedTeam);
      console.log("🔥 selectedTeamData.plan:", selectedTeamData.plan);
      
      localStorage.setItem("myTeam", JSON.stringify(fetchedTeam));
    } catch (error) {
      console.error("팀 정보 조회 실패:", error);
      setMyTeam(null);
      setRole(null);
      setPlan(null);
      localStorage.removeItem("myTeam");
    } finally {
      // 🔥 실행 완료 후 플래그 해제
      isRefreshingRef.current = false;
    }
  }, [user?.uid]);

  // 🔥 어르신 모드 저장
  const handleSetSeniorMode = (enabled: boolean) => {
    setSeniorMode(enabled);
    localStorage.setItem("seniorMode", enabled ? "true" : "false");
  };

  return (
    <TeamContext.Provider value={{ 
      myTeam, 
      role, 
      isAdmin, 
      isManager, 
      plan, 
      loading, 
      refreshTeam, 
      seniorMode, 
      setSeniorMode: handleSetSeniorMode,
      // 🔥 확장 필드
      currentTeam: myTeam, // 호환성
      myRole: role, // 호환성
      isOwner,
    }}>
      {children}
    </TeamContext.Provider>
  );
}

export function useTeam() {
  const context = useContext(TeamContext);
  if (context === undefined) {
    throw new Error("useTeam must be used within a TeamProvider");
  }
  return context;
}

