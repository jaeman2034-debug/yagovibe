// src/pages/team/TeamCreateForm.tsx
// 🔥 팀 생성 입력 폼 (비회원팀/협회 회원팀 신청 분기)
// 
// mode 파라미터:
// - non-member: 비회원팀 즉시 생성
// - member-request: 협회 회원팀 신청 (협회 선택 필요)

import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import { httpsCallable } from "firebase/functions";
import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { auth, db, functions } from "@/lib/firebase";
import { initializeTeamAccountingCallable } from "@/lib/team/initializeTeamAccountingCallable";
import { useAssociations } from "@/hooks/useAssociations";
import { toast } from "sonner";
import { CreatePageContextBadges } from "@/components/create/CreatePageContextBadges";
import { CreateFormContainer } from "@/components/create/CreateFormContainer";
import {
  TeamAiOnboardingDialog,
  type TeamAiOnboardingAnswers,
} from "@/components/team/create/TeamAiOnboardingDialog";
import {
  TEAM_BRAND_STYLES,
  DEFAULT_TEAM_ONBOARDING,
  type TeamBrandStyleId,
} from "@/lib/team/teamBrandingConstants";
import { finalizeTeamBrandingCallable } from "@/lib/team/finalizeTeamBrandingClient";
import { cn } from "@/lib/utils";
import { getSportLabel, normalizeSportId } from "@/constants/sports";
import { track } from "@/lib/analytics";

function isValidTeamId(id: string | null | undefined): id is string {
  return !!id && id !== "null" && id !== "undefined";
}

/** httpsCallable 결과 — SDK·배포 버전에 따라 형태가 달라질 수 있어 방어적으로 파싱 */
function parseTeamIdFromCallableResult(result: unknown): string | null {
  if (!result || typeof result !== "object") return null;
  const r = result as Record<string, unknown>;
  const data = r.data;
  if (data && typeof data === "object") {
    const d = data as Record<string, unknown>;
    if (typeof d.teamId === "string" && isValidTeamId(d.teamId)) return d.teamId;
    const nested = d.data;
    if (nested && typeof nested === "object") {
      const tid = (nested as Record<string, unknown>).teamId;
      if (typeof tid === "string" && isValidTeamId(tid)) return tid;
    }
  }
  if (typeof r.teamId === "string" && isValidTeamId(r.teamId)) return r.teamId;
  return null;
}

function joinedAtMillis(v: unknown): number {
  if (v && typeof v === "object" && "toMillis" in v && typeof (v as { toMillis: () => number }).toMillis === "function") {
    return (v as { toMillis: () => number }).toMillis();
  }
  return 0;
}

/**
 * CF는 성공했는데 클라이언트만 internal/파싱 실패한 경우 등:
 * `users/{uid}/teamMemberships/{teamId}` 미러( createTeam 트랜잭션에 포함 )로 teamId 복구
 */
async function resolveTeamIdFromMembershipMirror(uid: string, expectedTeamName: string): Promise<string | null> {
  try {
    const snap = await getDocs(collection(db, "users", uid, "teamMemberships"));
    if (snap.empty) return null;
    const want = expectedTeamName.trim();
    const rows = snap.docs.map((d) => ({
      teamId: d.id,
      data: d.data() as Record<string, unknown>,
    }));
    if (want) {
      for (const row of rows) {
        const tn = String(row.data.teamName ?? "").trim();
        if (tn === want) return row.teamId;
      }
    }
    rows.sort((a, b) => joinedAtMillis(b.data.joinedAt) - joinedAtMillis(a.data.joinedAt));
    return rows[0]?.teamId ?? null;
  } catch (e) {
    console.warn("[TeamCreateForm] teamMemberships fallback 실패", e);
    return null;
  }
}

function createdAtMillis(v: unknown): number {
  if (v && typeof v === "object" && "toMillis" in v && typeof (v as { toMillis: () => number }).toMillis === "function") {
    return (v as { toMillis: () => number }).toMillis();
  }
  return 0;
}

/**
 * 미러가 아직 없거나 읽기 실패 시: 내가 소유한 팀 문서에서 방금 만든 팀 추정
 * (CF는 ownerUserId / 레거시 ownerUid 둘 다 쓸 수 있음)
 */
async function resolveTeamIdFromOwnedTeams(uid: string, expectedTeamName: string): Promise<string | null> {
  const want = expectedTeamName.trim();
  const merge = new Map<string, Record<string, unknown>>();

  const runQuery = async (field: "ownerUserId" | "ownerUid") => {
    try {
      const q = query(collection(db, "teams"), where(field, "==", uid), limit(30));
      const snap = await getDocs(q);
      snap.docs.forEach((d) => merge.set(d.id, d.data() as Record<string, unknown>));
    } catch (e) {
      console.warn(`[TeamCreateForm] teams.${field} 쿼리 실패`, e);
    }
  };

  try {
    await runQuery("ownerUserId");
    await runQuery("ownerUid");
    if (merge.size === 0) return null;

    const rows = [...merge.entries()].map(([id, data]) => ({ id, data }));
    if (want) {
      for (const row of rows) {
        if (String(row.data.name ?? "").trim() === want) return row.id;
      }
    }
    rows.sort((a, b) => createdAtMillis(b.data.createdAt) - createdAtMillis(a.data.createdAt));
    return rows[0]?.id ?? null;
  } catch (e) {
    console.warn("[TeamCreateForm] teams 소유자 fallback 실패", e);
    return null;
  }
}

/** 에러 객체·문자열에서 teamId 추출 */
function extractTeamIdFromError(error: any): string | null {
  try {
    const errorStr = JSON.stringify(error);
    const teamIdMatch = errorStr.match(/teamId["\s:]+([a-zA-Z0-9_-]+)/i);
    return teamIdMatch ? teamIdMatch[1] : null;
  } catch {
    return null;
  }
}

function buildTeamHomeAfterCreateQuery(isAnonymous: boolean): string {
  const q = new URLSearchParams();
  q.set("onboarding", "1");
  q.set("firstTeam", "1");
  if (isAnonymous) q.set("linkAccount", "1");
  return q.toString();
}

interface TeamCreateFormProps {
  mode: "non-member" | "member-request";
}

/** Cloud Function `createTeam` (teamLifecycleCallables) 과 동일 */
type CreateTeamCallableType = "normal" | "academy";

const AGE_GROUPS = ["U-10", "U-12", "U-15", "U-18"] as const;
const TRAINING_LEVELS = ["beginner", "intermediate", "elite"] as const;

type CreateTeamRequest = {
  name: string;
  region: string;
  sportType: string;
  type: CreateTeamCallableType;
  associationId: string | null;
  academyMeta?: {
    ageGroup: (typeof AGE_GROUPS)[number];
    trainingLevel: (typeof TRAINING_LEVELS)[number];
    recruitOpen: boolean;
    description: string;
    mainCoachUserId: string | null;
  };
};

export default function TeamCreateForm({ mode }: TeamCreateFormProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { sport, type } = useParams<{ sport?: string; type?: string }>();
  const sportType = (sport ?? type) as string | undefined; // 🔥 `/sports/:sport/team/create` · 레거시 `:type`
  const { user } = useAuth();
  const { associations, loading: associationsLoading, error: associationsError } = useAssociations();
  
  const [teamName, setTeamName] = useState("");
  const [region, setRegion] = useState("");
  const [selectedAssociationId, setSelectedAssociationId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const [brandStyle, setBrandStyle] = useState<TeamBrandStyleId>("social");
  const [onboardingOpen, setOnboardingOpen] = useState(false);

  const [teamKind, setTeamKind] = useState<CreateTeamCallableType>("normal");
  const [ageGroup, setAgeGroup] = useState<(typeof AGE_GROUPS)[number]>("U-12");
  const [trainingLevel, setTrainingLevel] = useState<(typeof TRAINING_LEVELS)[number]>("beginner");
  const [recruitOpen, setRecruitOpen] = useState(true);
  const [academyDescription, setAcademyDescription] = useState("");
  /** 아카데미: teams/academy/meta.mainCoachUserId — 생성 직후엔 본인 연결이 가장 흔한 케이스 */
  const [linkSelfAsMainCoach, setLinkSelfAsMainCoach] = useState(true);

  useEffect(() => {
    const k = searchParams.get("teamKind");
    if (k === "academy" || k === "normal") setTeamKind(k);
  }, [searchParams]);

  // 🔥 sportType: URL 파라미터에서 가져옴 (기본값 없음 - URL이 진실의 원천)
  if (!sportType) {
    console.error("❌ [TeamCreateForm] sportType이 URL에서 없습니다");
    return <div>잘못된 경로입니다.</div>;
  }
  const isMemberRequest = mode === "member-request";

  const buildCreateTeamPayload = (): CreateTeamRequest => {
    const associationId =
      mode === "member-request" && selectedAssociationId ? selectedAssociationId : null;
    const base: CreateTeamRequest = {
      name: teamName.trim(),
      region: region.trim(),
      sportType,
      type: teamKind,
      associationId,
    };
    if (teamKind === "academy") {
      base.academyMeta = {
        ageGroup,
        trainingLevel,
        recruitOpen,
        description: academyDescription.trim(),
        mainCoachUserId: linkSelfAsMainCoach && user?.uid ? user.uid : null,
      };
    }
    return base;
  };
  
  // 🔥 협회 조회 에러는 무시 (비회원팀 생성은 협회 불필요)
  if (associationsError && isMemberRequest) {
    console.warn("⚠️ [TeamCreateForm] 협회 목록 조회 실패 (비회원팀 모드로 전환 가능)", associationsError);
  }

  /** 제출 → 서버 생성 없음 · AI 온보딩 다이얼로그만 연 다음 → 확인/건너뛰기 시 executeTeamCreation(createTeam + finalizeTeamBranding + 이동). */
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.uid) {
      toast.error("로그인이 필요합니다.");
      navigate("/login");
      return;
    }

    if (!teamName.trim()) {
      toast.error("팀 이름을 입력해주세요.");
      return;
    }
    if (!region.trim()) {
      toast.error("활동 지역을 입력해주세요.");
      return;
    }

    if (isMemberRequest && !selectedAssociationId) {
      toast.error("협회를 선택해주세요.");
      return;
    }

    if (!functions) {
      toast.error("Firebase Functions가 초기화되지 않았습니다.");
      return;
    }

    setOnboardingOpen(true);
  };

  const executeTeamCreation = async (
    onboardingAnswers: TeamAiOnboardingAnswers,
    opts?: { aiSkipped?: boolean }
  ) => {
    setOnboardingOpen(false);
    setLoading(true);

    try {
    console.log("🔥🔥🔥 [TeamCreateForm] ========== 팀 생성 시작 ==========");
    console.log("[TeamCreateForm] functions 객체:", functions);
    console.log("[TeamCreateForm] functions.region:", functions?.region);
    console.log("[TeamCreateForm] functions.app:", functions?.app?.name);
    console.log("[TeamCreateForm] 호출할 함수 이름: createTeam");
    console.log("[TeamCreateForm] 호출할 payload:", buildCreateTeamPayload());
    
    // 🔥 Functions region 확인 (필수)
    if (!functions) {
      const errorMsg = "Firebase Functions가 초기화되지 않았습니다.";
      console.error("❌ [TeamCreateForm]", errorMsg);
      toast.error(errorMsg);
      setLoading(false);
      return;
    }
    
    if (functions.region !== "asia-northeast3") {
      console.warn("⚠️ [TeamCreateForm] Functions region 불일치:", {
        expected: "asia-northeast3",
        actual: functions.region || "undefined",
      });
      // 경고만 표시하고 계속 진행 (region이 없어도 동작할 수 있음)
    }
    
    try {
      // Auth 컨텍스트와 SDK currentUser 타이밍 불일치 방어:
      // callable 직전에 auth 상태/ID 토큰을 확정해 functions에 인증 헤더가 붙도록 보장한다.
      await auth.authStateReady();
      const sdkUser = auth.currentUser;
      if (!sdkUser?.uid) {
        setLoading(false);
        toast.error("로그인 세션이 만료되었습니다. 새로고침 후 다시 시도해주세요.");
        navigate("/login", { state: { from: window.location.pathname } });
        return;
      }
      if (sdkUser.uid !== user.uid) {
        console.warn("⚠️ [TeamCreateForm] AuthContext/SKD uid 불일치", {
          contextUid: user.uid,
          sdkUid: sdkUser.uid,
        });
      }
      const token = await sdkUser.getIdToken();
      console.log("✅ [TeamCreateForm] callable 직전 인증 상태", {
        uid: sdkUser.uid,
        tokenHead: token.slice(0, 16),
        authProjectId: auth.app.options.projectId,
        functionsProjectId: functions.app.options.projectId,
        functionsRegion: functions.region,
      });

      if (mode === "member-request") {
        alert("협회 회원팀 신청 기능은 준비 중입니다. 현재는 팀 생성 후 협회 연동은 별도로 안내드릴 예정입니다.");
      }

      console.log("[TeamCreateForm] httpsCallable(createTeam) 시작…");
      const createTeamCallable = httpsCallable<CreateTeamRequest, { teamId: string }>(
        functions,
        "createTeam"
      );

      const payload = buildCreateTeamPayload();
      const result = await createTeamCallable(payload);

      console.log("[TeamCreateForm] createTeam callable result", result);

      let teamId = parseTeamIdFromCallableResult(result);
      const message =
        result?.data && typeof result.data === "object" && "message" in result.data
          ? String((result.data as { message?: unknown }).message ?? "")
          : "";

      if (!isValidTeamId(teamId) && user?.uid) {
        console.warn("[TeamCreateForm] 응답에 teamId 없음 → teamMemberships 미러로 복구 시도");
        teamId = await resolveTeamIdFromMembershipMirror(user.uid, teamName.trim());
      }
      if (!isValidTeamId(teamId) && user?.uid) {
        console.warn("[TeamCreateForm] 미러 실패 → teams 소유자 쿼리로 복구 시도");
        teamId = await resolveTeamIdFromOwnedTeams(user.uid, teamName.trim());
      }

      if (!isValidTeamId(teamId)) {
        console.error("❌ [TeamCreateForm] teamId 복구 실패:", { result, parsed: parseTeamIdFromCallableResult(result) });
        const err = new Error(message || "팀 생성에 실패했습니다.") as Error & { code?: string };
        err.code = "CLIENT_NO_TEAM_ID_AFTER_CREATE";
        throw err;
      }

      console.log("✅ [TeamCreateForm] 팀 생성 성공:", teamId);

      let brandingOk = false;
      const brandingToast = toast.loading("AI가 팀 소개를 만들고 있어요…");
      try {
        await new Promise<void>((resolve) => {
          setTimeout(resolve, 800);
        });
        await finalizeTeamBrandingCallable({
          teamId,
          sportType,
          brandStyle,
          mainActivity: onboardingAnswers.mainActivity,
          vibe: onboardingAnswers.vibe,
          recruitStyle: onboardingAnswers.recruitStyle,
          aiSkipped: opts?.aiSkipped === true,
        });
        brandingOk = true;
        console.log("[AI BRANDING]", {
          teamId,
          aiSkipped: opts?.aiSkipped === true,
          brandStyle,
          hasDescription: true,
        });
        toast.dismiss(brandingToast);
      } catch (brandErr) {
        toast.dismiss(brandingToast);
        console.warn("[TeamCreateForm] finalizeTeamBranding", brandErr);
        console.log("[AI BRANDING]", {
          teamId,
          aiSkipped: opts?.aiSkipped === true,
          brandStyle,
          hasDescription: false,
          error: brandErr instanceof Error ? brandErr.message : String(brandErr),
        });
        toast.warning("팀 소개 자동 생성에 실패했어요. 나중에 팀 설정에서 수정할 수 있어요.");
      }

      void track("team_created", {
        team_id: teamId,
        sport_type: sportType,
        brand_style: brandStyle,
        ai_onboarding_skipped: opts?.aiSkipped === true,
        branding_ok: brandingOk,
      });
      if (brandingOk) {
        void track(opts?.aiSkipped ? "ai_skipped" : "ai_used", {
          team_id: teamId,
          sport_type: sportType,
          brand_style: brandStyle,
        });
      }

      try {
        await toast.promise(
          initializeTeamAccountingCallable({ teamId }),
          {
            loading: "회비 시스템 초기화 중…",
            success: (r) =>
              r.skipped === "fee_already_exists"
                ? "이번 달 회비가 이미 있어 건너뛰었습니다."
                : "회비·납부 초기 설정이 완료되었습니다.",
            error: "회비 자동 설정에 실패했습니다. 팀 관리 → 회비에서 회차를 만들어 주세요.",
          }
        );
      } catch (initErr) {
        console.error("[TeamCreateForm] initializeTeamAccountingCallable", initErr);
      }

      toast.success("팀이 생성되었습니다! 🎉");

      const afterQs = buildTeamHomeAfterCreateQuery(Boolean(user?.isAnonymous));
      navigate(`/team/${encodeURIComponent(teamId)}/public?${afterQs}`, { replace: true });
      setLoading(false);
    } catch (error: any) {
      // 🔥 진짜 생성 실패만 여기서 처리
      console.error("=".repeat(80));
      console.error("❌❌❌ [TeamCreateForm] 팀 생성 실패 ❌❌❌");
      console.error("=".repeat(80));
      console.error("에러 코드:", error?.code);
      console.error("에러 메시지:", error?.message);
      console.error("에러 상세:", error);
      console.error("");
      console.error("🔍 진단 정보:");
      console.error("   Functions region:", functions?.region);
      console.error("   예상 region: asia-northeast3");
      console.error("   함수 이름: createTeam");
      console.error("   예상 URL: https://asia-northeast3-yago-vibe-spt.cloudfunctions.net/createTeam");
      console.error("=".repeat(80));
      
      setLoading(false);
      
      // 🔥 네트워크 에러 확인 (Failed to fetch, ERR_FAILED 등)
      const isNetworkError = 
        error?.message?.includes("Failed to fetch") ||
        error?.message?.includes("ERR_FAILED") ||
        error?.message?.includes("NetworkError") ||
        error?.code === "unavailable" ||
        error?.code === "deadline-exceeded";
      
      if (isNetworkError) {
        console.error("🚨 [TeamCreateForm] 네트워크 에러 감지!");
        console.error("📋 확인 사항:");
        console.error("   1. Firebase Console → Functions 탭에서 createTeam 함수 확인");
        console.error("   2. 함수 region이 asia-northeast3인지 확인");
        console.error("   3. 함수 상태가 'Active'인지 확인");
        console.error("   4. Service Worker가 요청을 차단하지 않는지 확인");
        console.error("");
        console.error("🔗 Firebase Console:");
        console.error("   https://console.firebase.google.com/project/yago-vibe-spt/functions");
        toast.error("네트워크 연결에 실패했습니다. Firebase Console에서 Functions 상태를 확인해주세요.");
        return;
      }
      
      // 🔥 Firebase Functions region 불일치 에러
      if (error?.code === "functions/not-found" || error?.message?.includes("not found")) {
        console.error("🚨 [TeamCreateForm] Functions 함수를 찾을 수 없음!");
        console.error("📋 확인 사항:");
        console.error("   1. Firebase Console → Functions 탭");
        console.error("   2. createTeam 함수가 배포되어 있는지 확인");
        console.error("   3. 함수 이름이 정확히 'createTeam'인지 확인 (대소문자 포함)");
        console.error("   4. 함수 region이 asia-northeast3인지 확인");
        console.error("");
        console.error("🔗 Firebase Console:");
        console.error("   https://console.firebase.google.com/project/yago-vibe-spt/functions");
        toast.error("서버 함수를 찾을 수 없습니다. Firebase Console에서 Functions 상태를 확인해주세요.");
        return;
      }

      if (error?.code === "functions/unauthenticated") {
        toast.error("인증 세션이 연결되지 않았습니다. 새로고침 후 다시 로그인해주세요.");
        navigate("/login", { state: { from: window.location.pathname } });
        return;
      }
      
      // 🔥 액션 C: UI 메시지 교체 (사기 오류 제거)
      if (error?.code === "functions/internal") {
        // functions/internal은 후속 동기화 실패일 가능성이 높음
        // 하지만 팀 생성 자체는 성공했을 수 있으므로, /create/next로 이동 시도
        console.warn("⚠️ [TeamCreateForm] 후속 동기화 실패 (하지만 팀 생성은 성공했을 수 있음)");
        console.error("🔍 [TeamCreateForm] 상세 에러 정보:", {
          code: error?.code,
          message: error?.message,
          details: error?.details,
          stack: error?.stack,
          functionsRegion: functions?.region,
        });
        
        // ⚠️ teamId가 있으면 팀 생성 성공으로 간주하고 /create/next로 이동
        // 🔥 여러 경로에서 teamId 추출 시도
        const errorTeamId = 
          error?.details?.teamId ||  // HttpsError의 details에 포함된 경우
          error?.data?.teamId ||     // error.data에 포함된 경우
          error?.teamId ||          // error 객체에 직접 포함된 경우
          extractTeamIdFromError(error); // 에러 메시지에서 추출
        
        console.log("🔍 [TeamCreateForm] teamId 추출 시도:", {
          detailsTeamId: error?.details?.teamId,
          dataTeamId: error?.data?.teamId,
          errorTeamId: error?.teamId,
          extracted: extractTeamIdFromError(error),
          finalTeamId: errorTeamId,
        });
        
        let recoveryId = errorTeamId;
        if (!isValidTeamId(recoveryId) && user?.uid) {
          recoveryId = await resolveTeamIdFromMembershipMirror(user.uid, teamName.trim());
          if (isValidTeamId(recoveryId)) {
            console.warn("⚠️ [TeamCreateForm] internal 에러였지만 미러에서 teamId 복구:", recoveryId);
          }
        }
        if (!isValidTeamId(recoveryId) && user?.uid) {
          recoveryId = await resolveTeamIdFromOwnedTeams(user.uid, teamName.trim());
          if (isValidTeamId(recoveryId)) {
            console.warn("⚠️ [TeamCreateForm] internal 에러였지만 teams 쿼리에서 teamId 복구:", recoveryId);
          }
        }

        if (isValidTeamId(recoveryId)) {
          console.log("✅ [TeamCreateForm] teamId 확보, 팀 화면으로 이동:", recoveryId);
          const afterQs = buildTeamHomeAfterCreateQuery(Boolean(user?.isAnonymous));
          navigate(`/team/${encodeURIComponent(recoveryId)}/public?${afterQs}`, { replace: true });
          setLoading(false);
        } else {
          const errorMessage = error?.message || "팀 생성 중 오류가 발생했습니다.";
          toast.error(
            "팀이 생성됐을 수 있어요. 내 팀 목록에서 확인해 주세요. 문제가 계속되면 잠시 후 다시 시도해 주세요."
          );
          console.error("❌ [TeamCreateForm] teamId 복구 실패:", errorMessage);
          navigate("/my-teams", { replace: true });
        }
        return;
      }
      
      // Callable은 성공했는데 클라에서 teamId만 못 찾은 경우 → 허브로 (404 `/teams` 등 방지)
      if (error?.code === "CLIENT_NO_TEAM_ID_AFTER_CREATE") {
        toast.error(
          "응답에서 팀 ID를 확인하지 못했어요. 내 팀에서 방금 만든 팀을 눌러 들어가 주세요."
        );
        navigate("/my-teams", { replace: true });
        return;
      }

      // 일반 에러: 친화 문구 + 상세는 콘솔
      const msg = error?.message || error?.code || "팀 생성에 실패했습니다.";
      console.error("[TeamCreateForm] 생성 실패(일반):", msg);
      toast.error("팀 생성 중 문제가 발생했어요. 다시 시도해주세요.");
      return;
    }
    } catch (unexpected: unknown) {
      console.error("[TeamCreateForm] executeTeamCreation(미처리 예외)", unexpected);
      toast.error("팀 생성 중 문제가 발생했어요. 다시 시도해주세요.");
      setLoading(false);
    }
  };

  const submitLabel = isMemberRequest ? "팀 신청하고 시작하기" : "✨ AI로 팀 만들기";

  return (
    <div className="min-h-screen bg-gray-50 pb-24 dark:bg-gray-900">
      <CreateFormContainer>
        <CreatePageContextBadges sportSlug={sportType} kind="team" />

        {/* 모드별 명시적 선언 문구 */}
        <div className="mb-6">
          {user?.isAnonymous ? (
            <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-50">
              <p className="font-medium">지금은 게스트(익명)로 시작해요</p>
              <p className="mt-1 text-xs leading-relaxed opacity-95">
                팀장도 팀 멤버 목록에 포함되는 것이 정상이에요. 팀을 만든 뒤에는 이메일 로그인·회원가입으로 계정만 연결해 주세요. 그러면 기기를 바꿔도 같은 팀을 이어갈 수 있어요.
              </p>
            </div>
          ) : null}
          {isMemberRequest ? (
            <>
              <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4 mb-4">
                <p className="text-sm font-medium text-purple-900 dark:text-purple-100">
                  협회 회원 팀으로 신청을 진행합니다
                </p>
                <p className="text-xs text-purple-700 dark:text-purple-300 mt-1">
                  (관리자 승인 후 회원 팀으로 전환됩니다)
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  비회원 팀으로 시작합니다
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                  (협회 소속은 나중에 신청할 수 있습니다)
                </p>
              </div>
            </>
          )}
        </div>

        <form id="team-create-form" onSubmit={handleFormSubmit} className="space-y-8">
          {/* 팀 종류 — 서버 teams.type: normal | academy */}
          <div className="space-y-3">
            <span className="block text-sm font-medium text-gray-700 dark:text-gray-300">팀 종류</span>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTeamKind("normal")}
                className={`rounded-xl border-2 p-4 text-left text-sm font-medium transition ${
                  teamKind === "normal"
                    ? "border-blue-500 bg-blue-50 text-blue-900 dark:border-blue-400 dark:bg-blue-950/30 dark:text-blue-100"
                    : "border-gray-200 bg-white text-gray-800 hover:border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                }`}
              >
                <span className="flex flex-wrap items-center gap-2">
                  일반 팀
                  <span className="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                    추천
                  </span>
                </span>
                <span className="mt-1 block text-xs font-normal text-gray-500 dark:text-gray-400">
                  동호회·일반 팀
                </span>
              </button>
              <button
                type="button"
                onClick={() => setTeamKind("academy")}
                className={`rounded-xl border-2 p-4 text-left text-sm font-medium transition ${
                  teamKind === "academy"
                    ? "border-violet-500 bg-violet-50 text-violet-900 dark:border-violet-400 dark:bg-violet-950/30 dark:text-violet-100"
                    : "border-gray-200 bg-white text-gray-800 hover:border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                }`}
              >
                유소년 아카데미
                <span className="mt-1 block text-xs font-normal text-gray-500 dark:text-gray-400">
                  연령·훈련 단계
                </span>
              </button>
            </div>
          </div>

          {teamKind === "academy" && (
            <div className="space-y-4 rounded-xl border border-violet-200 bg-violet-50/60 p-4 dark:border-violet-800 dark:bg-violet-950/20">
              <p className="text-xs text-violet-800 dark:text-violet-200">
                아카데미 팀은 서버에 연령대·훈련 수준 메타가 함께 저장됩니다.
              </p>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  연령대
                </label>
                <select
                  value={ageGroup}
                  onChange={(e) => setAgeGroup(e.target.value as (typeof AGE_GROUPS)[number])}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                >
                  {AGE_GROUPS.map((ag) => (
                    <option key={ag} value={ag}>
                      {ag}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  훈련 수준
                </label>
                <select
                  value={trainingLevel}
                  onChange={(e) =>
                    setTrainingLevel(e.target.value as (typeof TRAINING_LEVELS)[number])
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                >
                  <option value="beginner">초급</option>
                  <option value="intermediate">중급</option>
                  <option value="elite">엘리트</option>
                </select>
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-800 dark:text-gray-200">
                <input
                  type="checkbox"
                  checked={recruitOpen}
                  onChange={(e) => setRecruitOpen(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-violet-600"
                />
                신규 선수 모집 공개
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-800 dark:text-gray-200">
                <input
                  type="checkbox"
                  checked={linkSelfAsMainCoach}
                  onChange={(e) => setLinkSelfAsMainCoach(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-violet-600"
                />
                나를 대표 코치로 연결
                <span className="text-xs font-normal text-gray-500">(나중에 팀 설정에서 변경 가능)</span>
              </label>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  소개 (선택)
                </label>
                <textarea
                  value={academyDescription}
                  onChange={(e) => setAcademyDescription(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  placeholder="아카데미 소개를 적을 수 있어요"
                />
              </div>
            </div>
          )}

          {/* 협회 선택 (회원 신청 모드일 때만) */}
          {isMemberRequest && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                협회 선택
              </label>
              {associationsLoading ? (
                <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 animate-pulse">
                  협회 목록 불러오는 중...
                </div>
              ) : (
                <select
                  value={selectedAssociationId}
                  onChange={(e) => setSelectedAssociationId(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  required
                >
                  <option value="">협회를 선택하세요</option>
                  {associations.map((assoc) => (
                    <option key={assoc.id} value={assoc.id}>
                      {assoc.name} {assoc.region && `(${assoc.region})`}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* 팀 이름 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              팀 이름
            </label>
            <input
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="예: 야고 FC, 노원 유나이티드"
              required
              autoFocus
            />
          </div>

          {/* 활동 지역 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              활동 지역
            </label>
            <input
              type="text"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="예: 서울 노원구"
              required
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              팀의 기본 활동 지역입니다. 경기 생성 시 경기 지역은 별도로 설정할 수 있어요.
            </p>
          </div>

          {teamName.trim() && region.trim() ? (
            <div className="rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50/90 to-violet-50/70 px-3 py-2.5 text-xs text-indigo-950 dark:border-indigo-900/50 dark:from-indigo-950/40 dark:to-violet-950/30 dark:text-indigo-50">
              <span className="font-semibold">추천 한 줄 · </span>
              {region.trim()} 기반 {getSportLabel(normalizeSportId(sportType) ?? sportType)} 팀 「
              {teamName.trim()}」
            </div>
          ) : null}

          <div className="space-y-2">
            <span className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              팀 스타일 <span className="text-xs font-normal text-gray-500">(공개 팀 홈 AI 카피용)</span>
            </span>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {TEAM_BRAND_STYLES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setBrandStyle(s.id)}
                  className={cn(
                    "rounded-xl border-2 px-4 py-3 text-left text-sm font-medium transition",
                    brandStyle === s.id
                      ? "border-violet-500 bg-violet-50 text-violet-950 shadow-sm ring-1 ring-violet-500/20 dark:border-violet-400 dark:bg-violet-950/40 dark:text-violet-50 dark:ring-violet-400/30"
                      : "border-gray-200 bg-white text-gray-800 shadow-sm hover:border-gray-300 hover:shadow dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:border-gray-500"
                  )}
                >
                  <span className="mr-1" aria-hidden>
                    {s.emoji}
                  </span>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* 제출: 모바일 가운데 · PC 오른쪽(완료 액션) */}
          <div className="flex justify-center pt-2 md:justify-end">
            <button
              type="submit"
              disabled={
                loading ||
                (isMemberRequest && associationsLoading) ||
                !teamName.trim() ||
                !region.trim() ||
                (isMemberRequest && !selectedAssociationId)
              }
              className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 md:w-auto md:min-w-[240px] md:px-10"
            >
              {loading ? (isMemberRequest ? "신청 중..." : "생성 중...") : submitLabel}
            </button>
          </div>

        </form>

        {/* 토스트 메시지 */}
        {showToast && (
          <div className="fixed bottom-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg">
            {isMemberRequest ? "신청이 완료되었습니다!" : "팀이 생성되었습니다!"}
          </div>
        )}
      </CreateFormContainer>

      <TeamAiOnboardingDialog
        open={onboardingOpen}
        onOpenChange={setOnboardingOpen}
        loading={loading}
        onConfirm={(a) => void executeTeamCreation(a)}
        onSkip={() =>
          void executeTeamCreation(
            {
              mainActivity: DEFAULT_TEAM_ONBOARDING.mainActivity,
              vibe: DEFAULT_TEAM_ONBOARDING.vibe,
              recruitStyle: DEFAULT_TEAM_ONBOARDING.recruitStyle,
            },
            { aiSkipped: true }
          )
        }
      />
    </div>
  );
}

