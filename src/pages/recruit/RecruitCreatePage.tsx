/**
 * 🔥 팀원 모집 글쓰기 페이지
 * 
 * 경로: `/sports/:sport/recruit/create` (레거시 `/recruit/create` → 리다이렉트)
 * 
 * 역할:
 * - 팀원 모집 글 작성
 * - recruits 컬렉션에 저장
 * - activities 컬렉션에 recruit_created 생성
 */

import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { normalizeSportId } from "@/constants/sports";
import { CreatePageContextBadges } from "@/components/create/CreatePageContextBadges";
import { useMyTeams } from "@/hooks/useMyTeams";
import { db, auth } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createRecruit } from "@/services/recruitService";
import { uploadRecruitImages } from "@/services/recruitImageUpload";
import { RecruitImagePicker, type RecruitLocalImage } from "@/components/recruit/RecruitImagePicker";
import type { CreateRecruitInput } from "@/types/recruit";
import {
  clearHubRecommendationNav,
  peekHubRecommendationNav,
  type SportsHubRecommendation,
} from "@/lib/sportsHubRecommendation";
import { toast } from "sonner";

const POSITIONS = ["공격수", "미드필더", "수비수", "골키퍼"] as const;
const LEVELS = ["취미", "아마추어", "준선수"] as const;
const TRAINING_DAYS = ["월", "화", "수", "목", "금", "토", "일"] as const;
const CONTACT_METHODS = ["채팅", "전화"] as const;
const MAX_RECRUIT_IMAGES = 5;

export default function RecruitCreatePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { sport: sportRoute } = useParams<{ sport?: string }>();
  /** URL `/sports/:sport/recruit/create` — 항상 canonical 슬러그 (미인식·누락 시 soccer) */
  const routeSportSlug = normalizeSportId(sportRoute ?? undefined) ?? "soccer";

  const hubPayloadRef = useRef<SportsHubRecommendation | null | undefined>(undefined);
  if (hubPayloadRef.current === undefined) {
    const st = (location.state as { hubRecommendation?: SportsHubRecommendation })?.hubRecommendation;
    if (st) {
      hubPayloadRef.current = st;
      clearHubRecommendationNav();
    } else {
      hubPayloadRef.current = peekHubRecommendationNav();
    }
  }
  const hubPresetAppliedRef = useRef(false);

  const { teamMembers, loading: teamsLoading } = useMyTeams();

  // 🔥 첫 번째 팀을 myTeam으로 사용 (팀이 하나면 자동 선택)
  const myTeam = teamMembers?.length ? teamMembers[0] : null;
  const [teams, setTeams] = useState<Array<{ id: string; name: string; sportType: string }>>([]);
  /** 팀 목록 Firestore 조회 완료 여부 (비동기 전에 teams=[] 로 빈 화면 오판 방지) */
  const [teamsFetchDone, setTeamsFetchDone] = useState(false);

  const [teamId, setTeamId] = useState<string>("");
  const [teamName, setTeamName] = useState<string>("");
  const [teamSportType, setTeamSportType] = useState<string>(routeSportSlug); // 🔥 팀의 sportType · URL 종목
  const [position, setPosition] = useState<string[]>([]);
  const [slots, setSlots] = useState<string>("");
  const [region, setRegion] = useState<string>("");
  const [trainingDays, setTrainingDays] = useState<string[]>([]);
  const [level, setLevel] = useState<"취미" | "아마추어" | "준선수">("아마추어");
  const [contact, setContact] = useState<"채팅" | "전화">("채팅");
  const [description, setDescription] = useState<string>("");
  const [recruitImages, setRecruitImages] = useState<RecruitLocalImage[]>([]);
  const recruitImagesRef = useRef(recruitImages);
  recruitImagesRef.current = recruitImages;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      recruitImagesRef.current.forEach((img) => {
        if (img.previewUrl) URL.revokeObjectURL(img.previewUrl);
      });
    };
  }, []);

  // URL 종목이 바뀌면(같은 탭에서 종목 전환 등) 아직 팀 미선택일 때 기본 종목만 맞춤
  useEffect(() => {
    if (!teamId) setTeamSportType(routeSportSlug);
  }, [routeSportSlug, teamId]);

  // 🔥 팀 목록 단일 로드 (이전에 동일 로직이 두 번 있어 상태 경쟁·예외 유발 가능)
  useEffect(() => {
    let cancelled = false;

    if (teamMembers.length === 0) {
      setTeams([]);
      setTeamsFetchDone(true);
      return () => {
        cancelled = true;
      };
    }

    setTeamsFetchDone(false);
    (async () => {
      try {
        const teamsList = await Promise.all(
          teamMembers.map(async (tm) => {
            const teamDoc = await getDoc(doc(db, "teams", tm.teamId));
            if (!teamDoc.exists()) return null;
            const teamData = teamDoc.data();
            return {
              id: tm.teamId,
              name: (teamData.name as string) || tm.teamId,
              sportType: ((teamData.sportType || teamData.sportKey || routeSportSlug) as string) || routeSportSlug,
            };
          })
        );
        if (cancelled) return;
        const validTeams = teamsList.filter(
          (t): t is { id: string; name: string; sportType: string } => t !== null
        );
        setTeams(validTeams);

        if (validTeams.length === 1) {
          const only = validTeams[0];
          if (!only) return;
          setTeamId((prev) => prev || only.id);
          setTeamName(only.name);
          const n = normalizeSportId(only.sportType);
          setTeamSportType(n ?? only.sportType);
        }
      } catch (err) {
        console.error("❌ [RecruitCreatePage] 팀 목록 조회 실패:", err);
        if (!cancelled) setTeams([]);
      } finally {
        if (!cancelled) setTeamsFetchDone(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [teamMembers, routeSportSlug]);

  /** 허브 추천 → 모집 팀 프리셋 */
  useEffect(() => {
    if (!teamsFetchDone) return;
    if (teams.length === 0) {
      hubPresetAppliedRef.current = true;
      return;
    }
    if (hubPresetAppliedRef.current) return;
    const hub = hubPayloadRef.current;
    const preset = hub?.auto?.presetTeamId;
    if (!preset || !teams.some((t) => t.id === preset)) {
      hubPresetAppliedRef.current = true;
      return;
    }
    setTeamId(preset);
    const row = teams.find((t) => t.id === preset);
    if (row) {
      setTeamName(row.name);
      const n = normalizeSportId(row.sportType);
      setTeamSportType(n ?? row.sportType);
    }
    hubPresetAppliedRef.current = true;
  }, [teams, teamsFetchDone]);

  // 🔥 팀 선택 시 이름·종목 동기화 (다중 팀 시 드롭다운)
  useEffect(() => {
    if (!teamId) return;
    const list = Array.isArray(teams) ? teams : [];
    const selectedTeam = list.find((t) => t.id === teamId);
    if (selectedTeam) {
      setTeamName(selectedTeam.name);
      const normalized = normalizeSportId(selectedTeam.sportType);
      if (normalized) setTeamSportType(normalized);
    }
  }, [teamId, teams]);

  // 🔥 포지션 토글
  const togglePosition = (pos: string) => {
    setPosition((prev) =>
      prev.includes(pos) ? prev.filter((p) => p !== pos) : [...prev, pos]
    );
  };

  // 🔥 훈련 요일 토글
  const toggleTrainingDay = (day: string) => {
    setTrainingDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 검증
    if (!teamId) {
      setError("팀을 선택해주세요.");
      return;
    }

    const rowList = Array.isArray(teams) ? teams : [];
    if (!rowList.some((t) => t.id === teamId)) {
      setError("선택한 팀 정보를 불러오지 못했습니다. 새로고침 후 다시 시도해주세요.");
      return;
    }

    if (position.length === 0) {
      setError("모집 포지션을 선택해주세요.");
      return;
    }

    if (!slots || isNaN(Number(slots)) || Number(slots) <= 0) {
      setError("모집 인원수를 입력해주세요.");
      return;
    }

    if (!region.trim()) {
      setError("지역을 입력해주세요.");
      return;
    }

    if (recruitImages.length === 0) {
      setError("모집 글에는 사진을 1장 이상 등록해주세요.");
      return;
    }

    if (recruitImages.length > MAX_RECRUIT_IMAGES) {
      setError(`사진은 최대 ${MAX_RECRUIT_IMAGES}장까지 등록할 수 있습니다.`);
      return;
    }

    if (!auth.currentUser) {
      setError("로그인이 필요합니다.");
      return;
    }

    setSaving(true);

    try {
      const sportSlug = normalizeSportId(teamSportType) ?? "soccer";

      const imageUrls = await uploadRecruitImages(
        auth.currentUser.uid,
        recruitImages.map((x) => x.file)
      );

      const recruitInput: CreateRecruitInput = {
        teamId,
        teamName: teamName || "",
        sport: sportSlug as CreateRecruitInput["sport"],
        position,
        slots: Number(slots),
        region: region.trim(),
        trainingDays: trainingDays.length > 0 ? trainingDays : undefined,
        level,
        contact,
        description: description.trim() || undefined,
        imageUrls,
      };

      const recruitId = await createRecruit(recruitInput, auth.currentUser.uid);
      console.log("✅ [RecruitCreatePage] recruit saved:", recruitId);

      const hub = hubPayloadRef.current;
      if (hub?.auto?.generateInviteLink) {
        toast.success("모집글이 올라갔어요. 팀 채팅·카톡으로 링크를 공유해 보세요.", {
          duration: 5000,
        });
      }
      clearHubRecommendationNav();

      // 🔥 ActivityFactory 사용
      try {
        const { createTeamRecruitActivity } = await import("@/services/activity/activityFactory");
        await createTeamRecruitActivity({
          recruitId,
          authorId: auth.currentUser.uid,
          teamId,
          teamName: teamName || "팀",
          position,
          slots: Number(slots),
          description: description?.trim(),
          thumbnailUrl: imageUrls[0],
          sport: sportSlug,
          activityEntity: "recruit",
        });
        console.log("✅ [RecruitCreatePage] activity created");
      } catch (err) {
        console.warn("⚠️ [RecruitCreatePage] activity 생성 실패 (무시):", err);
      }

      // 성공 - 목록 페이지로 이동 (또는 상세 페이지)
      navigate(`/sports/${encodeURIComponent(routeSportSlug)}?tab=activity`);
    } catch (err: any) {
      console.error("❌ [RecruitCreatePage] 저장 실패:", err);
      setError("글 작성 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setSaving(false);
    }
  };

  const safeTeams = Array.isArray(teams) ? teams : [];
  const firstTeam = safeTeams[0] ?? null;

  // 🔥 로딩: 훅 로딩 + Firestore 팀 행 hydrate 완료 전까지 폼/teams[n] 접근 금지
  if (teamsLoading || !teamsFetchDone) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-gray-500">로딩 중...</div>
        </div>
      </div>
    );
  }

  // 🔥 팀이 없을 때: 팀 만들기 안내 (Empty State)
  if (!myTeam || !teamMembers?.length || safeTeams.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="w-full max-w-none px-3 md:mx-auto md:max-w-2xl p-3 md:p-6">
          <CreatePageContextBadges sportSlug={routeSportSlug} kind="recruit" />
          <div className="py-12 text-center">
            <div className="mb-6">
              <div className="w-20 h-20 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center">
                <span className="text-3xl">👥</span>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                팀에 가입해야 모집글을 작성할 수 있습니다
              </h2>
              <p className="text-gray-600 mb-6">
                먼저 팀을 만들거나 가입해주세요.
              </p>
            </div>
            <div className="flex gap-3 justify-center">
              <Button
                onClick={() => navigate(`/sports/${encodeURIComponent(routeSportSlug)}/team/create`)}
                className="px-6"
              >
                팀 만들기
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/app/team")}
                className="px-6"
              >
                팀 찾기
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full max-w-none px-3 md:mx-auto md:max-w-2xl p-3 md:p-6">
        <CreatePageContextBadges sportSlug={routeSportSlug} kind="recruit" />
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* 팀 선택 (팀이 하나면 자동 선택, 여러 개면 드롭다운) */}
          <div>
            <Label htmlFor="team">팀 이름 *</Label>
            {safeTeams.length === 1 && firstTeam ? (
              <Input
                id="team"
                value={firstTeam.name ?? ""}
                disabled
                className="mt-1 bg-gray-50"
              />
            ) : (
              <select
                id="team"
                value={teamId}
                onChange={(e) => {
                  const id = e.target.value;
                  setTeamId(id);
                  const row = safeTeams.find((t) => t.id === id);
                  if (row) {
                    setTeamName(row.name);
                    const n = normalizeSportId(row.sportType);
                    setTeamSportType(n ?? row.sportType);
                  }
                }}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={saving}
                required
              >
                <option value="">팀을 선택하세요</option>
                {safeTeams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* 모집 포지션 */}
          <div>
            <Label>모집 포지션 *</Label>
            <div className="flex gap-2 flex-wrap mt-2">
              {POSITIONS.map((pos) => (
                <button
                  key={pos}
                  type="button"
                  onClick={() => togglePosition(pos)}
                  className={`px-4 py-2 rounded-lg border transition ${
                    position.includes(pos)
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-700 border-gray-300 hover:border-blue-500"
                  }`}
                  disabled={saving}
                >
                  {pos}
                </button>
              ))}
            </div>
          </div>

          {/* 모집 인원 */}
          <div>
            <Label htmlFor="slots">모집 인원 *</Label>
            <Input
              id="slots"
              type="number"
              value={slots}
              onChange={(e) => setSlots(e.target.value)}
              placeholder="예: 2"
              disabled={saving}
              required
              min="1"
            />
          </div>

          {/* 지역 */}
          <div>
            <Label htmlFor="region">지역 *</Label>
            <Input
              id="region"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder="예: 포천 소흘"
              disabled={saving}
              required
            />
          </div>

          <RecruitImagePicker
            images={recruitImages}
            onChange={setRecruitImages}
            disabled={saving}
            maxImages={MAX_RECRUIT_IMAGES}
          />

          {/* 훈련 요일 */}
          <div>
            <Label>훈련 요일</Label>
            <div className="flex gap-2 flex-wrap mt-2">
              {TRAINING_DAYS.map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleTrainingDay(day)}
                  className={`px-4 py-2 rounded-lg border transition ${
                    trainingDays.includes(day)
                      ? "bg-purple-600 text-white border-purple-600"
                      : "bg-white text-gray-700 border-gray-300 hover:border-purple-500"
                  }`}
                  disabled={saving}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          {/* 팀 수준 */}
          <div>
            <Label htmlFor="level">팀 수준</Label>
            <select
              id="level"
              value={level}
              onChange={(e) => setLevel(e.target.value as typeof level)}
              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={saving}
            >
              {LEVELS.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl}
                </option>
              ))}
            </select>
          </div>

          {/* 연락 방법 */}
          <div>
            <Label htmlFor="contact">연락 방법</Label>
            <select
              id="contact"
              value={contact}
              onChange={(e) => setContact(e.target.value as typeof contact)}
              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={saving}
            >
              {CONTACT_METHODS.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
          </div>

          {/* 상세 설명 */}
          <div>
            <Label htmlFor="description">상세 설명</Label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="팀 소개 및 모집 내용을 작성해주세요."
              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[120px]"
              disabled={saving}
            />
          </div>

          {/* 제출 버튼 */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(-1)}
              disabled={saving}
              className="flex-1"
            >
              취소
            </Button>
            <Button type="submit" disabled={saving} className="flex-1">
              {saving ? "등록 중..." : "모집글 등록"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
