import { useParams, useNavigate, Link, useSearchParams } from "react-router-dom";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  Building2,
  Bell,
  Trophy,
  Calendar,
  BarChart,
  Users,
  GraduationCap,
  Settings,
  FileText,
  Wallet,
  ClipboardList,
  PieChart,
} from "lucide-react";
import { useAuth } from "@/context/AuthProvider";
import { addDoc, collection, doc, getDoc, getDocs, limit, onSnapshot, orderBy, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { FederationHeader } from "@/components/federation/FederationHeader";
import { FederationHero } from "@/components/federation/FederationHero";
import { FederationAboutTab } from "@/components/federation/FederationAboutTab";
import FederationInviteManager from "@/components/federation/FederationInviteManager";
import FederationMemberList from "@/components/federation/FederationMemberList";
import FederationLogs from "@/components/federation/FederationLogs";
import FederationActivityFeed from "@/components/federation/FederationActivityFeed";
import FederationDashboardStats from "@/components/federation/FederationDashboardStats";
import NotificationCenter from "@/components/notifications/NotificationCenter";
import { hasRole } from "@/utils/hasRole";
import { LeagueCard } from "@/components/leagues/LeagueCard";
import { uploadFederationCoverImage, uploadFederationLogoImage } from "@/services/federationService";
import { toast } from "sonner";

export default function FederationHomePage() {
  const { federationSlug } = useParams<{ federationSlug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const tabFromUrl = searchParams.get("tab") || "home";
  const editFromUrl = searchParams.get("edit") === "1";
  const devForceEdit = searchParams.get("devEdit") === "1";
  const [activeTab, setActiveTab] = useState<string>(tabFromUrl);

  useEffect(() => {
    const t = searchParams.get("tab") || "home";
    setActiveTab(t);
  }, [searchParams]);
  useEffect(() => {
    if (!federationSlug) return;
    // 비로그인 사용자는 admin(ProtectedRoute)으로 보내지 않음 → /login 튕김 방지
    if (!user?.uid) return;
    const tab = searchParams.get("tab");
    const section = searchParams.get("section");
    const legacyFinanceKey = tab || section;
    if (
      legacyFinanceKey !== "accounting" &&
      legacyFinanceKey !== "teamFees" &&
      legacyFinanceKey !== "competitionFees"
    ) {
      return;
    }
    navigate(`/federations/${federationSlug}/admin?tab=finance&subtab=${legacyFinanceKey}`, { replace: true });
  }, [searchParams, federationSlug, navigate, user?.uid]);
  const [federation, setFederation] = useState<any>(null);
  const [federationSource, setFederationSource] = useState<"firestore" | "fallback">("fallback");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    teamCount: 0,
    playerCount: 0,
    leagueCount: 0,
    matchCount: 0,
  });
  const [heroUploading, setHeroUploading] = useState(false);
  const [heroPreviewUrl, setHeroPreviewUrl] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const heroFileInputRef = useRef<HTMLInputElement | null>(null);
  const logoFileInputRef = useRef<HTMLInputElement | null>(null);
  const hasLogInitRef = useRef(false);
  const lastLogIdRef = useRef<string | null>(null);
  const userNameCacheRef = useRef<Record<string, string>>({});

  useEffect(() => {
    console.log("[FederationHomePage] federationSlug:", federationSlug);
  }, [federationSlug]);

  useEffect(() => {
    // redirect 복구 중: 토큰·Auth 상태 정리 전 onSnapshot → permission-denied / 리스너 오류 방지
    if (authLoading) return;
    if (!federationSlug) {
      setLoading(false);
      return;
    }
    // authLoading=false 직후 user 없음(복구 레이스)에서 onSnapshot 금지 — 로그인 후 uid 생기면 이 effect 재실행
    if (!user?.uid) {
      setFederationSource("fallback");
      setFederation({
        id: federationSlug,
        name: "노원구 축구협회",
        slug: federationSlug,
        region: "서울 노원구",
        description: "서울 노원구 지역 축구 리그 운영",
      });
      setStats({ teamCount: 24, playerCount: 320, leagueCount: 4, matchCount: 66 });
      setError(null);
      setLoading(false);
      return;
    }
    const unsubscribe = onSnapshot(
      doc(db, "federations", federationSlug),
      (fedDoc) => {
        if (fedDoc.exists()) {
          const data = fedDoc.data();
          setFederation({ id: fedDoc.id, ...data });
          setFederationSource("firestore");
          setStats({
            teamCount: typeof data.teamCount === "number" ? data.teamCount : 0,
            playerCount: typeof data.playerCount === "number" ? data.playerCount : 0,
            leagueCount: typeof data.leagueCount === "number" ? data.leagueCount : 0,
            matchCount: typeof data.matchCount === "number" ? data.matchCount : 0,
          });
          setError(null);
        } else {
          setFederationSource("fallback");
          setFederation({
            id: federationSlug,
            name: "노원구 축구협회",
            slug: federationSlug,
            region: "서울 노원구",
            description: "서울 노원구 지역 축구 리그 운영",
          });
          setStats({ teamCount: 24, playerCount: 320, leagueCount: 4, matchCount: 66 });
          setError(null);
        }
        setLoading(false);
      },
      (error: any) => {
        console.error("협회 정보 실시간 조회 실패:", error);
        if (error?.code === "permission-denied") {
          setFederationSource("fallback");
          setFederation({
            id: federationSlug,
            name: "노원구 축구협회",
            slug: federationSlug,
            region: "서울 노원구",
            description: "서울 노원구 지역 축구 리그 운영",
          });
          setStats({ teamCount: 24, playerCount: 320, leagueCount: 4, matchCount: 66 });
          setError("권한이 없어 일부 정보를 불러올 수 없습니다.");
        } else {
          setError("협회 정보를 불러오는 중 오류가 발생했습니다.");
        }
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [federationSlug, authLoading, user?.uid]);

  const refreshFederation = useCallback(async () => {
    // onSnapshot 구독 중이라 별도 수동 새로고침은 필요하지 않음
  }, []);

  useEffect(() => {
    return () => {
      if (heroPreviewUrl) URL.revokeObjectURL(heroPreviewUrl);
      if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
    };
  }, [heroPreviewUrl, logoPreviewUrl]);

  const tabs = [
    { id: "home", label: "홈", icon: Building2 },
    { id: "about", label: "협회소개", icon: Building2 },
    { id: "notices", label: "공지", icon: Bell },
    { id: "tournaments", label: "대회/리그", icon: Trophy },
    { id: "matches", label: "경기일정", icon: Calendar },
    { id: "results", label: "결과/순위", icon: BarChart },
    { id: "teams", label: "참가팀/클럽", icon: Users },
    { id: "regulations", label: "규정/자료실", icon: FileText },
    { id: "sponsors", label: "후원사", icon: Trophy },
    { id: "youth", label: "유소년", icon: GraduationCap },
    { id: "contact", label: "문의하기", icon: Bell },
    // 관리자 전용 탭(회비·참가비·회계)은 메인 UI에서 숨김 — 관리자 대시보드 또는 ⋯ 메뉴에서만 접근
    // { id: "teamFees", label: "회비·팀", icon: Wallet },
    // { id: "competitionFees", label: "대회·참가비", icon: ClipboardList },
    // { id: "accounting", label: "회계", icon: PieChart },
  ];

  // federation이 없으면 기본 데이터 사용 (매 렌더 새 객체 금지 → SEO useEffect·자식 memo 과도 실행 방지)
  const displayFederation = useMemo(() => {
    if (federation) return federation;
    return {
      id: federationSlug || "",
      name: "협회",
      slug: federationSlug || "",
      region: "",
      description: "",
    };
  }, [federation, federationSlug]);
  const primaryColor =
    String(
      displayFederation?.primaryColor ||
        displayFederation?.branding?.primaryColor ||
        "#1E40AF"
    ).trim() || "#1E40AF";
  const sportLabelMap: Record<string, string> = {
    soccer: "축구",
    football: "축구",
    futsal: "풋살",
    basketball: "농구",
    baseball: "야구",
    volleyball: "배구",
    badminton: "배드민턴",
  };
  const sportLabel = sportLabelMap[String(displayFederation?.sport || "").toLowerCase()] || "스포츠";
  const normalizedName = String(displayFederation?.name || "").trim();
  const computedBrandName =
    normalizedName && normalizedName !== "협회"
      ? normalizedName
      : `${String(displayFederation?.region || "지역").trim() || "지역"} ${sportLabel} 협회`;
  const computedSubtitle =
    String(displayFederation?.description || "").trim() ||
    `${sportLabel} 협회 운영 · 공지 · 경기 · 참가팀 관리`;

  // SEO/OG 메타는 모든 렌더에서 동일한 훅 순서로 실행되어야 함
  useEffect(() => {
    const rawPublished =
      displayFederation?.published && typeof displayFederation.published === "object"
        ? displayFederation.published
        : (displayFederation?.live && typeof displayFederation.live === "object" ? displayFederation.live : null);
    const liveIntro = String(rawPublished?.introMessage || rawPublished?.president?.message || "").trim();
    const liveHistory = String(rawPublished?.history || "").trim();
    const description =
      (liveIntro || liveHistory || String(displayFederation?.description || "").trim() || "협회 정보 페이지")
        .slice(0, 140);
    const federationName = String(displayFederation?.name || "협회").trim();
    const title = `${federationName} | 협회 소개`;
    const image =
      String(
        rawPublished?.chairpersonPhotoUrl ||
          rawPublished?.president?.photoUrl ||
          displayFederation?.heroImage ||
          displayFederation?.logoUrl ||
          "/icons/icon-maskable-512.png"
      ).trim();
    const canonicalPath = `/federation/${encodeURIComponent(federationSlug || displayFederation?.slug || "")}`;
    const canonicalUrl = `${window.location.origin}${canonicalPath}`;
    const imageUrl = image.startsWith("http") ? image : `${window.location.origin}${image}`;

    document.title = title;

    const ensureMeta = (attr: "name" | "property", key: string, content: string) => {
      let el = document.head.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    const ensureCanonical = (href: string) => {
      let link = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement("link");
        link.setAttribute("rel", "canonical");
        document.head.appendChild(link);
      }
      link.setAttribute("href", href);
    };

    ensureMeta("name", "description", description);
    ensureMeta("property", "og:type", "website");
    ensureMeta("property", "og:title", title);
    ensureMeta("property", "og:description", description);
    ensureMeta("property", "og:image", imageUrl);
    ensureMeta("property", "og:url", canonicalUrl);
    ensureMeta("name", "twitter:card", "summary_large_image");
    ensureMeta("name", "twitter:title", title);
    ensureMeta("name", "twitter:description", description);
    ensureMeta("name", "twitter:image", imageUrl);
    ensureCanonical(canonicalUrl);
  }, [displayFederation, federationSlug]);

  const canEditAbout = (() => {
    // 개발용 강제 편집 모드: ?devEdit=1
    if (devForceEdit) return true;
    if (!user) return false;
    const uid = user.uid;
    const ownerUid = displayFederation.ownerUid || displayFederation.ownerId || displayFederation.owner?.uid;
    if (ownerUid === uid) return true;

    const adminCandidates: string[] = [
      ...(Array.isArray(displayFederation.adminIds) ? displayFederation.adminIds : []),
      ...(Array.isArray(displayFederation.admins) ? displayFederation.admins : []),
      ...(Array.isArray(displayFederation.adminUids) ? displayFederation.adminUids : []),
      ...(Array.isArray(displayFederation.editorIds) ? displayFederation.editorIds : []),
      ...(Array.isArray(displayFederation.editors) ? displayFederation.editors : []),
      ...(Array.isArray(displayFederation.roles?.admins) ? displayFederation.roles.admins : []),
      ...(Array.isArray(displayFederation.roles?.editors) ? displayFederation.roles.editors : []),
    ].filter((v) => typeof v === "string");
    if (adminCandidates.includes(uid)) return true;

    const memberRole = Array.isArray(displayFederation.members)
      ? displayFederation.members.find((m: any) => m?.uid === uid)?.role
      : null;
    if (memberRole === "owner" || memberRole === "admin" || memberRole === "editor") return true;

    return hasRole(profile, ["ADMIN"]);
  })();

  /** Firestore rules `isFederationManager`와 동일하게 쓰기 위한 별칭 (logs 구독 가드) */
  const isFederationManager = canEditAbout;

  useEffect(() => {
    setNameInput(String(displayFederation?.name || ""));
  }, [displayFederation?.name]);

  useEffect(() => {
    if (!canEditAbout) {
      setIsEditMode(false);
      return;
    }
    // Edit Mode는 URL devEdit로 자동 진입하지 않고, edit=1(수정하기 클릭)일 때만 진입
    if (editFromUrl) {
      setIsEditMode(true);
    }
  }, [canEditAbout, editFromUrl]);

  useEffect(() => {
    if (!federationSlug || authLoading || !user?.uid) return;
    if (!isFederationManager) return;

    hasLogInitRef.current = false;
    lastLogIdRef.current = null;

    const resolveUserName = async (uid?: string) => {
      if (!uid) return "알 수 없음";
      if (userNameCacheRef.current[uid]) return userNameCacheRef.current[uid];
      try {
        const snap = await getDoc(doc(db, "users", uid));
        const data = snap.data() as any;
        const name = String(data?.displayName || data?.name || data?.nickname || uid);
        userNameCacheRef.current[uid] = name;
        return name;
      } catch {
        return uid;
      }
    };

    const formatRealtimeToast = async (log: any) => {
      const actorName = await resolveUserName(log?.actorId);
      const targetName = await resolveUserName(log?.targetId);
      const role = String(log?.metadata?.role || "editor");

      if (log?.type === "INVITE_CREATED") {
        return `${actorName}님이 ${role} 권한으로 초대했습니다`;
      }
      if (log?.type === "INVITE_ACCEPTED") {
        return `${actorName}님이 협회에 참여했습니다`;
      }
      if (log?.type === "ROLE_CHANGED") {
        if (log?.metadata?.action === "removed") {
          return `${actorName}님이 ${targetName}님을 관리자 목록에서 제거했습니다`;
        }
        return `${actorName}님이 권한을 변경했습니다`;
      }
      return `${actorName}님의 새로운 활동이 있습니다`;
    };

    const q = query(
      collection(db, "federations", federationSlug, "logs"),
      orderBy("createdAt", "desc"),
      limit(1)
    );

    let unsub: (() => void) | undefined;
    unsub = onSnapshot(
      q,
      async (snap) => {
        const first = snap.docs[0];
        if (!first) return;

        if (!hasLogInitRef.current) {
          hasLogInitRef.current = true;
          lastLogIdRef.current = first.id;
          return;
        }

        if (lastLogIdRef.current === first.id) return;
        lastLogIdRef.current = first.id;

        const message = await formatRealtimeToast(first.data());
        toast(message, { duration: 3000 });
      },
      (error) => {
        console.error("❌ [FederationHomePage] logs 구독 실패:", error);
        unsub?.();
      }
    );

    return () => {
      unsub?.();
    };
  }, [federationSlug, user, authLoading, isFederationManager]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center federation-portal-root">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  const emptyLeagueOnboarding =
    federationSource === "firestore" && stats.leagueCount === 0;

  const explicitAssociationId =
    String(
      displayFederation?.associationId ||
      displayFederation?.association?.id ||
      ""
    ).trim() || null;
  const fallbackAssociationId = federationSlug ? `assoc-${federationSlug}` : null;
  const targetAssociationId = explicitAssociationId || fallbackAssociationId;

  const handleOpenAssociation = async () => {
    if (!targetAssociationId) {
      toast.error("연결된 협회 정보가 없습니다.");
      return;
    }
    try {
      const snap = await getDoc(doc(db, "associations", targetAssociationId));
      if (!snap.exists()) {
        toast.error(`연결된 협회를 찾을 수 없습니다. (${targetAssociationId})`);
        return;
      }
      navigate(`/association/${targetAssociationId}`);
    } catch (error) {
      console.error("[FederationHomePage] 협회 페이지 이동 실패:", error);
      toast.error("협회 페이지 이동 중 오류가 발생했습니다.");
    }
  };

  const handleRequestEditFromMenu = () => {
    // 클릭 반응이 확실히 보이도록 먼저 About 탭으로 이동
    setActiveTab("about");
    setSearchParams({ tab: "about", edit: "1", devEdit: "1", ts: String(Date.now()) });

    if (!canEditAbout) {
      toast.error("수정 권한이 없습니다.");
      return;
    }
    setIsEditMode(true);
    toast.success("편집 모드가 켜졌습니다.");
  };

  const handleHeroImageChange = async (file?: File) => {
    console.log("[FederationHomePage] handleHeroImageChange called", {
      hasFile: !!file,
      federationSlug,
      canEditAbout,
    });
    if (!file || !federationSlug || !canEditAbout) return;
    if (!file.type.startsWith("image/")) {
      toast.error("이미지 파일만 업로드할 수 있습니다.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("5MB 이하 이미지만 업로드 가능합니다.");
      return;
    }
    setHeroUploading(true);
    const localPreviewUrl = URL.createObjectURL(file);
    setHeroPreviewUrl(localPreviewUrl);
    try {
      console.log("[FederationHomePage] hero upload start", {
        federationSlug,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
      });
      const heroUrl = await uploadFederationCoverImage(file, federationSlug);
      console.log("[FederationHomePage] hero upload success", {
        federationSlug,
        heroUrl,
      });
      const heroPatch: Record<string, unknown> = {
        coverImageUrl: heroUrl,
        heroImage: heroUrl,
        coverImage: heroUrl, // 레거시 필드 호환
        updatedAt: serverTimestamp(),
      };
      await updateDoc(doc(db, "federations", federationSlug), heroPatch as any);
      setFederation((prev: any) => ({ ...(prev || {}), heroImage: heroUrl }));
      toast.success("배경 이미지를 저장했습니다.");
    } catch (e) {
      console.error("[FederationHomePage] hero image save failed", {
        federationSlug,
        error: e,
      });
      const code = (e as any)?.code;
      if (code === "permission-denied") {
        toast.error("권한이 없어 배경 이미지를 저장할 수 없습니다. (federations 쓰기 권한 필요)");
      } else {
        toast.error("배경 이미지 저장에 실패했습니다.");
      }
    } finally {
      URL.revokeObjectURL(localPreviewUrl);
      setHeroPreviewUrl(null);
      setHeroUploading(false);
    }
  };

  const handleSaveName = async () => {
    const nextName = nameInput.trim();
    if (!federationSlug || !canEditAbout) return;
    if (!nextName) {
      toast.error("협회 이름을 입력해주세요.");
      return;
    }
    try {
      await updateDoc(doc(db, "federations", federationSlug), {
        name: nextName,
        updatedAt: serverTimestamp(),
      });
      setFederation((prev: any) => ({ ...(prev || {}), name: nextName }));
      setIsEditingName(false);
      toast.success("협회 이름을 저장했습니다.");
    } catch (e) {
      console.error("[FederationHomePage] save name failed", e);
      toast.error("협회 이름 저장에 실패했습니다.");
    }
  };

  const handleCancelNameEdit = () => {
    setIsEditingName(false);
    setNameInput(String(displayFederation?.name || ""));
  };

  const handleLogoImageChange = async (file?: File) => {
    if (!file || !federationSlug || !canEditAbout) return;
    if (!file.type.startsWith("image/")) {
      toast.error("이미지 파일만 업로드할 수 있습니다.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("5MB 이하 이미지만 업로드 가능합니다.");
      return;
    }
    setLogoUploading(true);
    const localPreviewUrl = URL.createObjectURL(file);
    setLogoPreviewUrl(localPreviewUrl);
    try {
      const logoUrl = await uploadFederationLogoImage(file, federationSlug);
      await updateDoc(doc(db, "federations", federationSlug), {
        logoUrl,
        updatedAt: serverTimestamp(),
      });
      setFederation((prev: any) => ({ ...(prev || {}), logoUrl }));
      toast.success("협회 로고를 저장했습니다.");
    } catch (e) {
      console.error("[FederationHomePage] logo upload failed", e);
      toast.error("협회 로고 저장에 실패했습니다.");
    } finally {
      URL.revokeObjectURL(localPreviewUrl);
      setLogoPreviewUrl(null);
      setLogoUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 federation-portal-root pb-40">
      {/* View Mode: 화면 고정 수정 버튼 제거. 수정은 더보기 메뉴에서만 진입 */}

      {/* Error Message */}
      {error && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="max-w-7xl mx-auto">
            <p className="text-sm text-yellow-700">{error}</p>
          </div>
        </div>
      )}

      {/* Federation Header */}
      <FederationHeader
        emptyLeagueOnboarding={emptyLeagueOnboarding}
        canEdit={canEditAbout}
        onRequestEdit={handleRequestEditFromMenu}
        federation={{
          id: displayFederation.id,
          name: computedBrandName,
          slug: federationSlug || displayFederation.slug,
          logoUrl: displayFederation.logoUrl || displayFederation.logoImage,
          region: displayFederation.region || "",
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 sm:pt-2">
        <input
          ref={logoFileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          disabled={logoUploading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            void handleLogoImageChange(file);
            e.currentTarget.value = "";
          }}
        />
        {canEditAbout && isEditMode ? (
          <div
            className="mb-4 bg-white border rounded-xl p-3 shadow-sm"
            style={{ borderColor: `${primaryColor}33` }}
          >
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => heroFileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-md border border-gray-200 text-sm text-gray-700 hover:bg-gray-50"
              >
                {heroUploading ? "커버 업로드 중..." : "커버 업로드"}
              </button>
              <button
                type="button"
                onClick={() => logoFileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-md border border-gray-200 text-sm text-gray-700 hover:bg-gray-50"
              >
                {logoUploading ? "로고 업로드 중..." : "로고 변경"}
              </button>
              {isEditingName ? (
                <>
                  <input
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    onBlur={() => {
                      void handleSaveName();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void handleSaveName();
                        return;
                      }
                      if (e.key === "Escape") {
                        e.preventDefault();
                        handleCancelNameEdit();
                      }
                    }}
                    autoFocus
                    className="h-9 rounded-md border border-gray-300 px-3 text-sm w-64 max-w-[70vw]"
                    placeholder={computedBrandName}
                  />
                  <button
                    type="button"
                    onClick={() => void handleSaveName()}
                    className="h-9 px-3 rounded-md text-white text-sm"
                    style={{ backgroundColor: primaryColor }}
                  >
                    이름 저장
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelNameEdit}
                    className="h-9 px-3 rounded-md border border-gray-200 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    취소
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditingName(true)}
                  className="px-3 py-1.5 rounded-md border border-gray-200 text-sm text-gray-700 hover:bg-gray-50"
                  title="클릭해서 이름 수정"
                >
                  {displayFederation?.name || computedBrandName}
                </button>
              )}
              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditMode(false);
                    handleCancelNameEdit();
                    setSearchParams((prev) => {
                      const next = new URLSearchParams(prev);
                      next.set("tab", "about");
                      next.delete("edit");
                      next.set("ts", String(Date.now()));
                      return next;
                    });
                  }}
                  className="px-3 py-1.5 rounded-md text-white text-sm"
                  style={{ backgroundColor: primaryColor }}
                >
                  완료
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditMode(false);
                    handleCancelNameEdit();
                    setSearchParams((prev) => {
                      const next = new URLSearchParams(prev);
                      next.set("tab", "about");
                      next.delete("edit");
                      next.set("ts", String(Date.now()));
                      return next;
                    });
                  }}
                  className="px-3 py-1.5 rounded-md border border-gray-200 text-sm text-gray-700 hover:bg-gray-50"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <div className="relative">
          <div>
            <FederationHero
              federation={{
                heroImage:
                  heroPreviewUrl ||
                  displayFederation.coverImageUrl ||
                  displayFederation.heroImage ||
                  displayFederation.coverImage,
                name: displayFederation.name || "협회",
              }}
            />
          </div>
          <input
            ref={heroFileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            disabled={heroUploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              console.log("[FederationHomePage] file input onChange", {
                hasFile: !!file,
                fileName: file?.name,
                fileType: file?.type,
                fileSize: file?.size,
              });
              void handleHeroImageChange(file);
              e.currentTarget.value = "";
            }}
          />
        </div>

        {/* CTA: Hero와 분리 — 리그 없을 때만 단일 핵심 행동 */}
        {emptyLeagueOnboarding && activeTab === "tournaments" && canEditAbout && (
          <div className="mt-6 mb-8 rounded-xl border border-emerald-200 bg-emerald-50/90 px-6 py-8 text-center shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">⚽ 첫 리그를 만들어보세요</h2>
            <p className="text-gray-600 text-sm mb-5 w-full max-w-none px-3 md:mx-auto md:max-w-3xl">
              아직 등록된 리그가 없습니다. 리그를 만들면 팀, 일정, 결과를 관리할 수 있습니다.
            </p>
            <Link
              to={`/leagues/create?federation=${encodeURIComponent(federationSlug!)}`}
              className="inline-flex items-center justify-center rounded-lg bg-emerald-600 text-white font-semibold px-5 py-2.5 text-sm shadow hover:bg-emerald-700 transition-colors"
            >
              첫 리그 만들기
            </Link>
          </div>
        )}
      </div>

      {/* 기존 탭 메뉴 (더보기 메뉴로 이동된 항목들) */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 pt-1 pb-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 space-y-2">
              {[
                { title: "기본", ids: ["home", "about", "notices"] },
                { title: "경기", ids: ["tournaments", "matches", "results"] },
                { title: "운영", ids: ["teams", "regulations", "sponsors", "youth", "contact"] },
              ].map((group) => (
                <div key={group.title}>
                  <p className="text-[11px] text-gray-400 px-1 mb-1">{group.title}</p>
                  <div className="flex flex-wrap gap-1">
                    {group.ids
                      .map((id) => tabs.find((tab) => tab.id === id))
                      .filter((tab): tab is (typeof tabs)[number] => !!tab)
                      .map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => {
                            setActiveTab(tab.id);
                            setSearchParams(tab.id === "home" ? {} : { tab: tab.id });
                          }}
                          className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium transition-colors rounded-lg border ${
                            activeTab === tab.id
                              ? "bg-primary-50 text-primary-700 border-primary-200"
                              : "text-gray-600 hover:bg-gray-50 border-transparent"
                          }`}
                        >
                          <tab.icon className="w-4 h-4" />
                          {tab.label}
                        </button>
                      ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 relative">
              {/* logs 서브컬렉션 구독 → 규칙상 isFederationManager만 — 비매니저에게 마운트 금지 */}
              {federationSlug && canEditAbout ? (
                <NotificationCenter federationId={federationSlug} currentUserId={user?.uid} />
              ) : null}
              {/* 관리자 직접 버튼 제거 → 3점 메뉴로 이동, 일반 유저에게는 ⋯ 자체 숨김 */}
              {canEditAbout && (
                <>
                  <button
                    type="button"
                    onClick={() => setMoreOpen((v) => !v)}
                    aria-label="관리자 더보기"
                    className="px-3 py-2 rounded-lg border border-gray-200 text-gray-700 bg-white text-sm font-medium"
                  >
                    ⋯
                  </button>
                  {moreOpen && (
                    <div className="absolute right-0 top-10 w-44 rounded-md border bg-white shadow-md z-20 p-1">
                      <button
                        onClick={() => {
                          setMoreOpen(false);
                          navigate(`/federations/${federationSlug}/admin`);
                        }}
                        className="w-full text-left px-3 py-2 rounded text-sm text-gray-700 hover:bg-gray-50"
                      >
                        관리자 대시보드
                      </button>
                      <button
                        onClick={() => {
                          setMoreOpen(false);
                          setActiveTab("about");
                          setSearchParams({ tab: "about", edit: "1", ts: String(Date.now()) });
                          setIsEditMode(true);
                        }}
                        className="w-full text-left px-3 py-2 rounded text-sm text-gray-700 hover:bg-gray-50"
                      >
                        소개 편집 모드
                      </button>
                      <button
                        onClick={() => {
                          setMoreOpen(false);
                          setActiveTab("tournaments");
                          setSearchParams({ tab: "tournaments", ts: String(Date.now()) });
                        }}
                        className="w-full text-left px-3 py-2 rounded text-sm text-gray-700 hover:bg-gray-50"
                      >
                        리그 관리
                      </button>
                      <div className="my-1 h-px bg-gray-100" />
                      <button
                        onClick={() => {
                          setMoreOpen(false);
                          navigate(`/federations/${federationSlug}/admin?section=teams`);
                        }}
                        className="w-full text-left px-3 py-2 rounded text-sm text-gray-700 hover:bg-gray-50"
                      >
                        팀 관리
                      </button>
                      <button
                        onClick={() => {
                          setMoreOpen(false);
                          navigate(`/federations/${federationSlug}/admin?section=members`);
                        }}
                        className="w-full text-left px-3 py-2 rounded text-sm text-gray-700 hover:bg-gray-50"
                      >
                        회원 관리
                      </button>
                      <div className="my-1 h-px bg-gray-100" />
                      <button
                        onClick={() => {
                          setMoreOpen(false);
                          navigate(`/federations/${federationSlug}/admin?tab=finance&subtab=teamFees`);
                        }}
                        className="w-full text-left px-3 py-2 rounded text-sm text-gray-700 hover:bg-gray-50"
                      >
                        회비 관리
                      </button>
                      <button
                        onClick={() => {
                          setMoreOpen(false);
                          navigate(`/federations/${federationSlug}/admin?tab=finance&subtab=competitionFees`);
                        }}
                        className="w-full text-left px-3 py-2 rounded text-sm text-gray-700 hover:bg-gray-50"
                      >
                        대회 참가비
                      </button>
                      <button
                        onClick={() => {
                          setMoreOpen(false);
                          navigate(`/federations/${federationSlug}/admin?tab=finance&subtab=accounting`);
                        }}
                        className="w-full text-left px-3 py-2 rounded text-sm text-gray-700 hover:bg-gray-50"
                      >
                        회계
                      </button>
                      <div className="my-1 h-px bg-gray-100" />
                      <button
                        onClick={() => {
                          setMoreOpen(false);
                          navigate(`/federations/${federationSlug}/admin?section=settings`);
                        }}
                        className="w-full text-left px-3 py-2 rounded text-sm text-gray-700 hover:bg-gray-50"
                      >
                        설정
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 탭 콘텐츠 */}
      <div className="max-w-7xl mx-auto px-4 pt-0 pb-8">
        {activeTab === "home" && (
          <>
            <HomeTab
              federationSlug={federationSlug!}
              federationSource={federationSource}
              leagueCount={stats.leagueCount}
            />
            {/* 관리자 기능 블록은 메인(Home)에서 제거 — 관리자 대시보드에서만 제공 */}
          </>
        )}
        {activeTab === "about" && (
          <>
            <FederationAboutTab
              federationSlug={federationSlug!}
              federation={displayFederation}
              canEdit={canEditAbout || devForceEdit}
              inlineEditMode={isEditMode}
              onUpdated={refreshFederation}
            />
          </>
        )}
        {activeTab === "notices" && <NoticesTab federationSlug={federationSlug!} />}
        {activeTab === "tournaments" && <TournamentsTab federationSlug={federationSlug!} />}
        {activeTab === "matches" && <MatchesTab federationSlug={federationSlug!} />}
        {activeTab === "results" && <ResultsTab federationSlug={federationSlug!} />}
        {activeTab === "teams" && <TeamsTab federationSlug={federationSlug!} />}
        {activeTab === "regulations" && <RegulationsTab federationSlug={federationSlug!} />}
        {activeTab === "sponsors" && <SponsorsTab federationSlug={federationSlug!} />}
        {activeTab === "youth" && <YouthTab federationSlug={federationSlug!} />}
        {activeTab === "contact" && <ContactTab federationSlug={federationSlug!} />}
        {/* 모바일 하단 안전 여백: BottomNav/FAB에 가려지는 것 방지 */}
        <div className="h-24 md:h-0" />
      </div>
    </div>
  );
}

// 홈 탭
function HomeTab({
  federationSlug,
  federationSource,
  leagueCount,
}: {
  federationSlug: string;
  federationSource: "firestore" | "fallback";
  leagueCount: number;
}) {
  const showFirstLeagueCta =
    federationSource === "firestore" && leagueCount === 0;

  /* 리그 없음 CTA는 Hero 아래 전용 섹션에만 둠 — 홈 탭 중복 제거 */
  if (showFirstLeagueCta) {
    return (
      <p className="text-center text-sm text-gray-500 py-4">
        리그가 등록되면 이곳에 목록이 표시됩니다.
      </p>
    );
  }

  if (federationSource === "firestore" && leagueCount > 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-600">
        등록된 리그 <strong className="text-gray-900">{leagueCount}</strong>개 — 목록·카드 연동은 다음 단계에서
        이어갑니다.
        <div className="mt-4">
          <Link
            to={`/leagues/create?federation=${encodeURIComponent(federationSlug)}`}
            className="text-sm font-medium text-primary-600 hover:underline"
          >
            + 리그 추가
          </Link>
        </div>
      </div>
    );
  }

  // 데모(문서 없음·fallback)
  const leagues = [
    {
      id: "k7-league",
      name: "노원구 K7 리그",
      teamCount: 12,
      matchCount: 36,
      startDate: "2025-01-01",
      endDate: "2025-06-30",
      status: "active",
    },
    {
      id: "weekend-league",
      name: "노원구 주말리그",
      teamCount: 8,
      matchCount: 0,
      startDate: "2025-07-01",
      endDate: "2025-12-31",
      status: "scheduled",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-gray-900">대회 참가 / 신청</div>
          <div className="text-xs text-gray-600 mt-1">참가 신청은 대회 페이지에서 진행할 수 있습니다.</div>
        </div>
        <Link
          to={`/activity/federations/${federationSlug}`}
          className="inline-flex items-center justify-center rounded-lg bg-primary-600 text-white font-semibold px-4 py-2 text-sm hover:bg-primary-700 transition-colors"
        >
          대회 참가하기
        </Link>
      </div>

      {/* 진행중 리그 - League Card 사용 */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">진행중 리그</h2>
          <Link
            to={`/activity/federations/${federationSlug}`}
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            전체 보기 →
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {leagues.map((league) => (
            <LeagueCard
              key={league.id}
              league={league}
              federationSlug={federationSlug}
            />
          ))}
        </div>
      </div>

      {/* 이번주 경기 */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">이번주 경기</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <div className="font-semibold">Tigers vs Lions</div>
              <div className="text-sm text-gray-500">
                2025-03-15 15:00 · 마들스타디움
              </div>
            </div>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
              상세보기
            </button>
          </div>
        </div>
      </div>

      {/* 최근 경기 결과 */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">최근 경기 결과</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <div className="font-semibold">Tigers 2 : 1 Lions</div>
              <div className="text-sm text-gray-500">
                2025-03-10 · 노원구 K7 리그
              </div>
            </div>
            <button className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm">
              상세보기
            </button>
          </div>
        </div>
      </div>

      {/* 현재 순위 TOP */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">현재 순위 TOP 5</h2>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((rank) => (
            <div key={rank} className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <div className="flex items-center gap-3">
                <span className="font-bold w-6">{rank}</span>
                <span className="font-semibold">팀 {rank}</span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span>10경기</span>
                <span className="font-bold">20점</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// 공지 탭
function NoticesTab({ federationSlug }: { federationSlug: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <h2 className="text-lg font-semibold mb-4">공지사항</h2>
      <div className="space-y-3">
        <div className="p-4 border border-gray-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded">중요</span>
            <span className="font-semibold">2025 시즌 참가 등록 안내</span>
          </div>
          <p className="text-sm text-gray-600">2025-03-01</p>
        </div>
      </div>
    </div>
  );
}

// 대회/리그 탭
function TournamentsTab({ federationSlug }: { federationSlug: string }) {
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTournament, setSelectedTournament] = useState<any | null>(null);
  const [teamName, setTeamName] = useState("");
  const [managerName, setManagerName] = useState("");
  const [phone, setPhone] = useState("");
  const [memo, setMemo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [applyError, setApplyError] = useState("");

  useEffect(() => {
    if (!federationSlug) return;
    console.log("[TournamentsTab] collection path:", `federations/${federationSlug}/leagues`);
    const leaguesRef = collection(db, "federations", federationSlug, "leagues");
    const unsub = onSnapshot(
      leaguesRef,
      (snap) => {
        console.log("[TournamentsTab] snapshot size:", snap.size);
        console.log("[TournamentsTab] doc ids:", snap.docs.map((d) => d.id));
        const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        rows.sort((a, b) => {
          const aSec = a?.createdAt?.seconds ?? 0;
          const bSec = b?.createdAt?.seconds ?? 0;
          return bSec - aSec;
        });
        console.log("[TournamentsTab] tournaments raw:", rows);
        setTournaments(rows);
        setLoading(false);
      },
      (error) => {
        console.error("[TournamentsTab] onSnapshot error:", error);
        setTournaments([]);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [federationSlug]);

  const activeTournaments = tournaments.filter((t) => {
    const mode = String(t?.mode || "").trim().toLowerCase();
    const statusRaw = String(t?.status || "").trim().toLowerCase();
    const status = statusRaw.replace(/\s+/g, "");
    console.log("[TournamentsTab] normalize mode/status:", { rawMode: t?.mode, rawStatus: t?.status, mode, status });
    const isTournament = mode.includes("tournament");
    const isActive =
      status.includes("진행") ||
      status === "ongoing" ||
      status === "open" ||
      status === "active";
    return isTournament && isActive;
  });
  useEffect(() => {
    console.log("[TournamentsTab] counts:", {
      rawCount: tournaments.length,
      activeCount: activeTournaments.length,
    });
  }, [tournaments, activeTournaments]);
  const openApplyModal = (tournament: any) => {
    setApplyError("");
    setSelectedTournament(tournament);
  };
  const closeApplyModal = () => {
    setSelectedTournament(null);
    setApplyError("");
    setTeamName("");
    setManagerName("");
    setPhone("");
    setMemo("");
  };
  const submitApplication = async () => {
    if (!federationSlug || !selectedTournament?.id) return;
    if (!teamName.trim() || !managerName.trim() || !phone.trim()) {
      setApplyError("필수 항목(팀명/대표자/연락처)을 모두 입력해주세요.");
      toast.error("필수 항목(팀명/대표자/연락처)을 입력하세요.");
      return;
    }
    setApplyError("");

    const auth = (await import("firebase/auth")).getAuth();
    const user = auth.currentUser;
    if (!user) {
      toast.info("로그인 후 참가 신청할 수 있습니다.");
      navigate("/login?next=" + encodeURIComponent(window.location.pathname + window.location.search));
      return;
    }

    try {
      setSubmitting(true);
      const appsRef = collection(db, "federations", federationSlug, "leagues", selectedTournament.id, "applications");
      const dupQ = query(appsRef, where("teamName", "==", teamName.trim()), where("status", "==", "pending"));
      const dupSnap = await getDocs(dupQ);
      if (!dupSnap.empty) {
        setApplyError("이미 접수된 신청이 있습니다.");
        toast.error("이미 접수된 신청이 있습니다.");
        setSubmitting(false);
        return;
      }

      await addDoc(appsRef, {
        teamName: teamName.trim(),
        managerName: managerName.trim(),
        phone: phone.trim(),
        note: memo.trim() || "",
        status: "pending",
        createdAt: serverTimestamp(),
        createdBy: user.uid,
      });
      toast.success("신청이 접수되었습니다.");
      closeApplyModal();
    } catch (error) {
      console.error("[TournamentsTab] submit application failed:", error);
      toast.error("신청 접수에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">진행중 대회</h2>
        {loading ? (
          <p className="text-sm text-gray-600">대회 정보를 불러오는 중...</p>
        ) : activeTournaments.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">현재 진행 중인 대회가 없습니다.</div>
        ) : (
          <div className="space-y-3">
            {activeTournaments.map((t) => (
              <div
                key={t.id}
                className="p-4 border border-gray-200 rounded-lg hover:shadow-sm cursor-pointer"
                onClick={() => navigate(`/activity/federations/${federationSlug}/tournaments/${t.id}`)}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold mb-1">{String(t?.name || "대회")}</div>
                  <span className="text-xs px-2 py-0.5 rounded border bg-blue-50 text-blue-700 border-blue-200">
                    {String(t?.status || "진행중")}
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  {String(t?.startDate || "일정 미정")} ~ {String(t?.endDate || "일정 미정")}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    className="text-sm text-blue-600 hover:underline"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/activity/federations/${federationSlug}/tournaments/${t.id}`);
                    }}
                  >
                    상세보기
                  </button>
                  <button
                    className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                    onClick={(e) => {
                      e.stopPropagation();
                      openApplyModal(t);
                    }}
                  >
                    참가 신청
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {selectedTournament && (
        <div className="fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/40" onClick={closeApplyModal} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-none md:max-w-3xl rounded-xl border bg-white p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">참가 신청</h3>
                <button className="text-gray-500 hover:text-gray-700" onClick={closeApplyModal}>
                  ✕
                </button>
              </div>
              <p className="text-sm text-gray-600">{String(selectedTournament?.name || "대회")}</p>
              <div className="space-y-3">
                <input
                  value={teamName}
                  onChange={(e) => {
                    setTeamName(e.target.value);
                    if (applyError) setApplyError("");
                  }}
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  placeholder="팀명 *"
                />
                <input
                  value={managerName}
                  onChange={(e) => {
                    setManagerName(e.target.value);
                    if (applyError) setApplyError("");
                  }}
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  placeholder="대표자 이름 *"
                />
                <input
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (applyError) setApplyError("");
                  }}
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  placeholder="연락처 *"
                />
                <textarea
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-sm min-h-[80px]"
                  placeholder="메모(선택)"
                />
                <div className="text-xs text-gray-500">※ 신청 접수 후 관리자가 승인하면 팀 등록 단계로 진행됩니다.</div>
                {applyError ? (
                  <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">
                    {applyError}
                  </div>
                ) : null}
              </div>
              <div className="flex justify-end gap-2">
                <button className="px-3 py-1.5 rounded border text-sm" onClick={closeApplyModal}>
                  취소
                </button>
                <button
                  className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm disabled:opacity-60"
                  onClick={() => void submitApplication()}
                  disabled={submitting}
                >
                  {submitting ? "신청 중..." : "신청하기"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 경기 탭
function MatchesTab({ federationSlug }: { federationSlug: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <h2 className="text-lg font-semibold mb-4">경기 일정</h2>
      <div className="space-y-3">
        <div className="p-4 border border-gray-200 rounded-lg">
          <div className="font-semibold mb-1">Tigers vs Lions</div>
          <div className="text-sm text-gray-600">2025-03-15 15:00 · 마들스타디움</div>
        </div>
      </div>
    </div>
  );
}

// 결과/순위 탭
function ResultsTab({ federationSlug }: { federationSlug: string }) {
  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">최근 경기 결과</h2>
        <div className="space-y-3">
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="font-semibold mb-1">Tigers 2 : 1 Lions</div>
            <div className="text-sm text-gray-600">2025-03-10 · 노원구 K7 리그</div>
            <button className="mt-2 text-sm text-blue-600 hover:underline">상세보기</button>
          </div>
        </div>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">순위표</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">순위</th>
                <th className="px-4 py-3 text-left">팀</th>
                <th className="px-4 py-3 text-center">경기</th>
                <th className="px-4 py-3 text-center">승점</th>
                <th className="px-4 py-3 text-center">득실</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5].map((rank) => (
                <tr key={rank} className="border-t">
                  <td className="px-4 py-3 font-bold">{rank}</td>
                  <td className="px-4 py-3">팀 {rank}</td>
                  <td className="px-4 py-3 text-center">10</td>
                  <td className="px-4 py-3 text-center font-bold">20</td>
                  <td className="px-4 py-3 text-center">+10</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// 규정/자료실 탭
function RegulationsTab({ federationSlug }: { federationSlug: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <h2 className="text-lg font-semibold mb-4">규정/자료실</h2>
      <div className="space-y-3">
        <div className="p-4 border border-gray-200 rounded-lg">
          <div className="font-semibold mb-1">대회요강</div>
          <div className="text-sm text-gray-600">2025 노원구청장기 축구대회 요강</div>
          <button className="mt-2 text-sm text-blue-600 hover:underline">다운로드</button>
        </div>
        <div className="p-4 border border-gray-200 rounded-lg">
          <div className="font-semibold mb-1">대회규정</div>
          <div className="text-sm text-gray-600">경기 규칙 및 참가 규정</div>
          <button className="mt-2 text-sm text-blue-600 hover:underline">다운로드</button>
        </div>
        <div className="p-4 border border-gray-200 rounded-lg">
          <div className="font-semibold mb-1">선수등록 규정</div>
          <div className="text-sm text-gray-600">선수 등록 및 자격 규정</div>
          <button className="mt-2 text-sm text-blue-600 hover:underline">다운로드</button>
        </div>
      </div>
    </div>
  );
}

// 후원사 탭
function SponsorsTab({ federationSlug }: { federationSlug: string }) {
  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">공식 후원사</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((sponsor) => (
            <div key={sponsor} className="p-4 border border-gray-200 rounded-lg text-center">
              <div className="text-sm font-semibold">후원사 {sponsor}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">협력 병원</h2>
        <div className="space-y-2">
          <div className="p-3 border border-gray-200 rounded">병원명 · 연락처</div>
        </div>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">용품/유니폼 업체</h2>
        <div className="space-y-2">
          <div className="p-3 border border-gray-200 rounded">업체명 · 연락처</div>
        </div>
      </div>
    </div>
  );
}

// 문의하기 탭
function ContactTab({ federationSlug }: { federationSlug: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <h2 className="text-lg font-semibold mb-4">문의하기</h2>
      <form className="space-y-4">
        <div>
          <label className="block text-sm font-semibold mb-2">이름</label>
          <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-2">연락처</label>
          <input type="tel" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-2">문의 내용</label>
          <textarea className="w-full px-3 py-2 border border-gray-300 rounded-lg h-32" />
        </div>
        <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          문의하기
        </button>
      </form>
    </div>
  );
}

// 팀 탭
function TeamsTab({ federationSlug }: { federationSlug: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <h2 className="text-lg font-semibold mb-4">참가 팀</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((team) => (
          <div key={team} className="p-4 border border-gray-200 rounded-lg">
            <div className="font-semibold">팀 {team}</div>
            <div className="text-sm text-gray-600 mt-1">서울 노원구</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 유소년 탭
function YouthTab({ federationSlug }: { federationSlug: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <h2 className="text-lg font-semibold mb-4">유소년 아카데미</h2>
      <p className="text-gray-600">유소년 프로그램 정보가 여기에 표시됩니다.</p>
    </div>
  );
}
