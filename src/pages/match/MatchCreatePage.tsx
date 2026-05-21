/**
 * 경기 매칭 글쓰기 — `/sports/:sport/match/create` (레거시 `/match/create` → 리다이렉트)
 * 팀 검색 자동완성 · 구장 지도 선택 · 연락 수단별 상세 입력
 */

import {
  useState,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { normalizeSportId } from "@/constants/sports";
import { MapPin } from "lucide-react";
import { useMyTeams } from "@/hooks/useMyTeams";
import { db, auth } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createMatch, ensureOpenMatchHostChatRoom } from "@/services/matchService";
import type { CreateMatchInput, MatchContactMethod, MatchLevel } from "@/types/match";
import { CreatePageContextBadges } from "@/components/create/CreatePageContextBadges";
import MapPickerModal from "@/components/schedule/MapPickerModal";
import { StadiumAutocomplete } from "@/components/match/StadiumAutocomplete";
import { MatchStadiumKakaoPreview } from "@/components/match/MatchStadiumKakaoPreview";
import {
  clearHubRecommendationNav,
  peekHubRecommendationNav,
  type SportsHubRecommendation,
} from "@/lib/sportsHubRecommendation";

const LEVELS: MatchLevel[] = [
  "초보",
  "중급",
  "고급",
  "상관없음",
  "취미",
  "아마추어",
];
const CONTACT_METHODS: MatchContactMethod[] = [
  "카카오톡",
  "채팅",
  "전화",
  "문자",
];

const CARD =
  "rounded-2xl border border-gray-200/90 bg-white p-4 shadow-md ring-1 ring-black/[0.04]";
const LABEL_CLASS = "mb-1 block text-sm font-medium text-gray-700";
const CONTROL_CLASS =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-0 disabled:opacity-50";

type TeamRow = { id: string; name: string; sportType: string };

type MatchFormFields = {
  date: string;
  time: string;
  region: string;
  stadium: string;
  level: MatchLevel;
  fee: string;
  contact: MatchContactMethod;
  contactDetail: string;
  description: string;
};

function isContactDetailValid(
  method: MatchContactMethod,
  detail: string
): boolean {
  const t = detail.trim();
  if (method === "채팅") return true;
  if (method === "카카오톡") return t.length >= 2;
  if (method === "전화" || method === "문자") {
    const digits = t.replace(/\D/g, "");
    return digits.length >= 9 && digits.length <= 15;
  }
  return true;
}

function TeamSearchCombobox({
  teams,
  teamId,
  saving,
  onSelectTeam,
}: {
  teams: TeamRow[];
  teamId: string;
  saving: boolean;
  onSelectTeam: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    if (open) return;
    const t = teams.find((x) => x.id === teamId);
    setQ(t ? t.name : "");
  }, [teamId, teams, open]);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return teams;
    return teams.filter((t) => t.name.toLowerCase().includes(s));
  }, [teams, q]);

  return (
    <div className="relative" ref={wrapRef}>
      <Input
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        value={q}
        disabled={saving}
        placeholder="팀 이름을 검색하세요"
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
          onSelectTeam("");
        }}
        onFocus={() => setOpen(true)}
        className={CONTROL_CLASS}
      />
      {open && (
        <ul
          className="absolute z-[60] mt-1 max-h-52 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
          role="listbox"
        >
          {list.length === 0 ? (
            <li className="px-3 py-2 text-sm text-gray-500">검색 결과가 없습니다</li>
          ) : (
            list.map((t) => (
              <li key={t.id} role="option">
                <button
                  type="button"
                  className="w-full px-3 py-2.5 text-left text-sm text-gray-900 hover:bg-gray-50"
                  onClick={() => {
                    onSelectTeam(t.id);
                    setQ(t.name);
                    setOpen(false);
                  }}
                >
                  {t.name}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

const defaultForm = (): MatchFormFields => ({
  date: "",
  time: "",
  region: "",
  stadium: "",
  level: "상관없음",
  fee: "",
  contact: "채팅",
  contactDetail: "",
  description: "",
});

/** 허브 추천 → 다음 토요일 18:00 근사 프리셋 */
function suggestNextMatchSlot(): { date: string; time: string } {
  const now = new Date();
  const dow = now.getDay();
  let addDays = (6 - dow + 7) % 7;
  if (addDays === 0 && now.getHours() >= 17) addDays = 7;
  const d = new Date(now);
  d.setDate(d.getDate() + addDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return { date: `${y}-${m}-${day}`, time: "18:00" };
}

function SectionCard({
  sectionId,
  title,
  description,
  children,
}: {
  sectionId: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const headingId = `match-create-${sectionId}`;
  return (
    <section
      className={`${CARD} space-y-3`}
      aria-labelledby={headingId}
    >
      <header className="border-b border-gray-200/80 pb-3">
        <h2
          id={headingId}
          className="text-base font-bold tracking-tight text-gray-900"
        >
          {title}
        </h2>
        {description ? (
          <p className="mt-1 text-xs leading-relaxed text-gray-500">
            {description}
          </p>
        ) : null}
      </header>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export default function MatchCreatePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { sport: sportRoute } = useParams<{ sport?: string }>();
  const routeSportSlug = normalizeSportId(sportRoute) ?? "soccer";
  const { teamMembers, loading: teamsLoading } = useMyTeams();

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

  const hubPresetsAppliedRef = useRef(false);

  const myTeam = teamMembers.length > 0 ? teamMembers[0] : null;
  const [teams, setTeams] = useState<TeamRow[]>([]);

  const [teamId, setTeamId] = useState("");
  const [teamName, setTeamName] = useState("");
  const [teamSportType, setTeamSportType] = useState("soccer");
  const [form, setForm] = useState<MatchFormFields>(defaultForm);

  const [stadiumCoords, setStadiumCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [showMapPicker, setShowMapPicker] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  const handleFormChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setForm((prev) => {
      if (name === "level") {
        return { ...prev, level: value as MatchLevel };
      }
      if (name === "contact") {
        return { ...prev, contact: value as MatchContactMethod, contactDetail: "" };
      }
      return { ...prev, [name]: value } as MatchFormFields;
    });
  };

  useEffect(() => {
    if (teamMembers.length === 0) return;
    let cancelled = false;
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
              sportType: (teamData.sportType || teamData.sportKey || "soccer") as string,
            };
          })
        );
        const valid = teamsList.filter((t): t is TeamRow => t !== null);
        if (cancelled) return;
        setTeams(valid);
        if (valid.length === 1) {
          setTeamId(valid[0].id);
          setTeamName(valid[0].name);
          setTeamSportType(valid[0].sportType);
        }
      } catch (err) {
        console.error("❌ [MatchCreatePage] 팀 목록 조회 실패:", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [teamMembers]);

  /** 허브 추천 → 팀·일시·지역 프리셋 (1회) */
  useEffect(() => {
    if (hubPresetsAppliedRef.current || teams.length === 0) return;
    const hub = hubPayloadRef.current;
    if (!hub) {
      hubPresetsAppliedRef.current = true;
      return;
    }
    const auto = hub.auto;
    if (auto?.presetTeamId && teams.some((t) => t.id === auto.presetTeamId)) {
      setTeamId(auto.presetTeamId);
      const row = teams.find((t) => t.id === auto.presetTeamId);
      if (row) {
        setTeamName(row.name);
        setTeamSportType(row.sportType);
      }
    }
    if (
      hub.kind === "match_first" ||
      hub.kind === "match_stale" ||
      auto?.createChatAfterSuccess
    ) {
      const slot = suggestNextMatchSlot();
      setForm((prev) => ({
        ...prev,
        date: slot.date,
        time: slot.time,
        region: auto?.presetRegion?.trim() ? auto.presetRegion.trim() : prev.region,
      }));
    } else if (auto?.presetRegion?.trim()) {
      setForm((prev) => ({ ...prev, region: auto.presetRegion!.trim() }));
    }
    hubPresetsAppliedRef.current = true;
  }, [teams]);

  useEffect(() => {
    if (!teamId) return;
    const selected = teams.find((t) => t.id === teamId);
    if (selected) {
      setTeamName(selected.name);
      setTeamSportType(selected.sportType);
    }
  }, [teamId, teams]);

  useEffect(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    setForm((prev) => ({ ...prev, date: `${y}-${m}-${d}` }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const {
      date,
      time,
      region,
      stadium,
      level,
      fee,
      contact,
      contactDetail,
      description,
    } = form;

    if (!teamId) {
      setError("팀을 선택해주세요.");
      return;
    }
    if (!date || !time) {
      setError("경기 날짜와 시간을 입력해주세요.");
      return;
    }
    const dateTimeString = `${date}T${time}:00`;
    const matchDateTime = new Date(dateTimeString);
    if (matchDateTime < new Date()) {
      setError("경기 일시는 현재 시각 이후여야 합니다.");
      return;
    }
    if (!region.trim()) {
      setError("경기 지역을 입력해주세요.");
      return;
    }
    if (!isContactDetailValid(contact, contactDetail)) {
      if (contact === "카카오톡") {
        setError("카카오톡 ID를 2자 이상 입력해주세요.");
      } else {
        setError("전화번호를 올바르게 입력해주세요. (숫자 9~15자리)");
      }
      return;
    }
    if (!auth.currentUser) {
      setError("로그인이 필요합니다.");
      return;
    }

    setSaving(true);
    try {
      const matchInput: CreateMatchInput = {
        teamId,
        teamName: teamName || "",
        sport: (teamSportType || "soccer") as CreateMatchInput["sport"],
        date: matchDateTime,
        time,
        matchRegion: region.trim(),
        region: region.trim(),
        stadium: stadium.trim() || undefined,
        stadiumLat: stadiumCoords?.lat,
        stadiumLng: stadiumCoords?.lng,
        level,
        fee: fee ? Number(fee) : undefined,
        contact,
        contactDetail: contactDetail.trim() || undefined,
        description: description.trim() || undefined,
      };

      const matchId = await createMatch(matchInput, auth.currentUser.uid);

      const hub = hubPayloadRef.current;
      let openedChat = false;
      if (hub?.auto?.createChatAfterSuccess) {
        try {
          await ensureOpenMatchHostChatRoom(matchId);
          openedChat = true;
        } catch (e) {
          console.warn("[MatchCreatePage] 오픈 매칭 채팅방 준비 실패 (무시):", e);
        }
      }
      clearHubRecommendationNav();

      const sportQ = encodeURIComponent(teamSportType || routeSportSlug);
      const hubQuery = openedChat ? "&hubCreated=1&hubChat=1" : "&hubCreated=1";
      navigate(`/match?sport=${sportQ}${hubQuery}`);
    } catch (err: unknown) {
      console.error("❌ [MatchCreatePage] 저장 실패:", err);
      setError("글 작성 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setSaving(false);
    }
  };

  if (teamsLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f9fafb]">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-purple-600" />
          <p className="text-sm text-gray-500">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!myTeam || teamMembers.length === 0 || teams.length === 0) {
    return (
      <div className="min-h-screen bg-[#f9fafb]">
        <div className="w-full max-w-none px-3 md:mx-auto md:max-w-[480px] py-8">
          <CreatePageContextBadges sportSlug={routeSportSlug} kind="match" />
          <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100 text-3xl">
              🏆
            </div>
            <h2 className="mb-2 text-lg font-semibold text-gray-900">
              팀에 가입해야 매칭글을 작성할 수 있습니다
            </h2>
            <p className="mb-6 text-sm text-gray-600">
              먼저 팀을 만들거나 가입해주세요.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button
                onClick={() => navigate(`/sports/${encodeURIComponent(routeSportSlug)}/team/create`)}
                className="sm:min-w-[140px]"
              >
                팀 만들기
              </Button>
              <Button variant="outline" onClick={() => navigate("/team")} className="sm:min-w-[140px]">
                팀 찾기
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const {
    date,
    time,
    region,
    stadium,
    level,
    fee,
    contact,
    contactDetail,
    description,
  } = form;

  const contactOk = isContactDetailValid(contact, contactDetail);
  const submitBlockReason = (() => {
    if (!teamId) return "팀을 선택해주세요.";
    if (!date) return "경기 날짜를 입력해주세요.";
    if (!time) return "경기 시간을 입력해주세요.";
    if (!region.trim()) return "경기 지역을 입력해주세요.";
    if (!contactOk) {
      if (contact === "카카오톡") return "카카오톡 ID를 2자 이상 입력해주세요.";
      if (contact === "전화" || contact === "문자") return "전화번호를 숫자 9~15자리로 입력해주세요.";
    }
    return null;
  })();
  const canSubmit = submitBlockReason == null;

  return (
    <>
    <div className="relative min-h-screen bg-gray-50 pb-32">
      <div className="mx-auto w-full max-w-[480px] px-4 py-6">
        <CreatePageContextBadges sportSlug={routeSportSlug} kind="match" />
        <form id="match-create-form" className="space-y-4" onSubmit={handleSubmit}>
          {error ? (
            <div
              className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm"
              role="alert"
            >
              {error}
            </div>
          ) : null}

          <SectionCard
            sectionId="team"
            title="매칭 팀"
            description="이 글을 올릴 팀을 선택하세요."
          >
            <div>
              <Label htmlFor="team" className={LABEL_CLASS}>
                팀 선택 <span className="text-red-500">*</span>
              </Label>
              {teams.length === 1 ? (
                <Input
                  id="team"
                  value={teams[0].name}
                  disabled
                  className={CONTROL_CLASS}
                />
              ) : (
                <TeamSearchCombobox
                  teams={teams}
                  teamId={teamId}
                  saving={saving}
                  onSelectTeam={setTeamId}
                />
              )}
              {teams.length > 1 && !teamId ? (
                <p className="mt-1.5 text-xs text-amber-700">
                  목록에서 팀을 선택해주세요.
                </p>
              ) : null}
            </div>
          </SectionCard>

          <SectionCard
            sectionId="basic"
            title="기본 정보"
            description="경기가 열리는 날짜와 시간입니다."
          >
            <div>
              <Label htmlFor="date" className={LABEL_CLASS}>
                경기 날짜 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="date"
                name="date"
                type="date"
                value={date}
                onChange={handleFormChange}
                disabled={saving}
                required
                className={CONTROL_CLASS}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
            <div>
              <Label htmlFor="time" className={LABEL_CLASS}>
                경기 시간 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="time"
                name="time"
                type="time"
                value={time}
                onChange={handleFormChange}
                disabled={saving}
                required
                className={CONTROL_CLASS}
              />
            </div>
          </SectionCard>

          <SectionCard
            sectionId="location"
            title="경기 위치"
            description="구장은 검색어로 적거나 지도에서 핀을 찍을 수 있어요."
          >
            <div>
              <Label htmlFor="region" className={LABEL_CLASS}>
                경기 지역 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="region"
                name="region"
                value={region}
                onChange={handleFormChange}
                placeholder="예: 포천"
                disabled={saving}
                required
                className={CONTROL_CLASS}
              />
            </div>
            <div>
              <Label htmlFor="stadium" className={LABEL_CLASS}>
                구장
              </Label>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                <StadiumAutocomplete
                  id="stadium"
                  value={stadium}
                  disabled={saving}
                  placeholder="예: 소흘 체육공원"
                  className="relative min-w-0 sm:flex-1"
                  inputClassName={CONTROL_CLASS}
                  onValueChange={(next) => {
                    setForm((prev) => ({ ...prev, stadium: next }));
                    setStadiumCoords(null);
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={saving}
                  onClick={() => setShowMapPicker(true)}
                  className="h-10 shrink-0 gap-2 whitespace-nowrap border-blue-200 text-blue-700 hover:bg-blue-50"
                >
                  <MapPin className="h-4 w-4" />
                  지도에서 선택
                </Button>
              </div>
              {stadiumCoords ? (
                <p className="mt-1.5 flex items-center gap-1 text-xs text-green-600">
                  <MapPin className="h-3 w-3" />
                  위치 핀이 저장되었습니다 (위도·경도)
                </p>
              ) : (
                <p className="mt-1.5 text-xs text-gray-500">
                  지도에서 선택하면 주소가 구장 칸에 채워지고 좌표가 함께 저장됩니다.
                </p>
              )}
              <div className="mt-3">
                <p className="mb-1.5 text-xs font-medium text-gray-600">
                  위치 미리보기
                </p>
                <MatchStadiumKakaoPreview
                  lat={stadiumCoords?.lat ?? null}
                  lng={stadiumCoords?.lng ?? null}
                />
              </div>
            </div>
          </SectionCard>

          <SectionCard
            sectionId="conditions"
            title="매칭 조건"
            description="상대 팀이 참고할 조건입니다."
          >
            <div>
              <Label htmlFor="level" className={LABEL_CLASS}>
                팀 수준
              </Label>
              <select
                id="level"
                name="level"
                value={level}
                onChange={handleFormChange}
                className={CONTROL_CLASS}
                disabled={saving}
              >
                {LEVELS.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="fee" className={LABEL_CLASS}>
                참가비 (원)
              </Label>
              <Input
                id="fee"
                name="fee"
                type="number"
                inputMode="numeric"
                value={fee}
                onChange={handleFormChange}
                placeholder="50000"
                disabled={saving}
                min={0}
                className={CONTROL_CLASS}
              />
              {fee ? (
                <p className="mt-1 text-xs text-gray-500">
                  {Number(fee).toLocaleString()}원
                </p>
              ) : null}
            </div>
            <div>
              <Label htmlFor="contact" className={LABEL_CLASS}>
                연락 방법 <span className="text-red-500">*</span>
              </Label>
              <select
                id="contact"
                name="contact"
                value={contact}
                onChange={handleFormChange}
                className={CONTROL_CLASS}
                disabled={saving}
              >
                {CONTACT_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
            </div>
            {contact === "카카오톡" ? (
              <div>
                <Label htmlFor="contactDetail" className={LABEL_CLASS}>
                  카카오톡 ID <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="contactDetail"
                  name="contactDetail"
                  value={contactDetail}
                  onChange={handleFormChange}
                  placeholder="예: yago_official"
                  disabled={saving}
                  autoComplete="username"
                  className={CONTROL_CLASS}
                />
              </div>
            ) : null}
            {contact === "전화" ? (
              <div>
                <Label htmlFor="contactDetail" className={LABEL_CLASS}>
                  전화번호 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="contactDetail"
                  name="contactDetail"
                  type="tel"
                  inputMode="tel"
                  value={contactDetail}
                  onChange={handleFormChange}
                  placeholder="010-1234-5678"
                  disabled={saving}
                  className={CONTROL_CLASS}
                />
              </div>
            ) : null}
            {contact === "문자" ? (
              <div>
                <Label htmlFor="contactDetail" className={LABEL_CLASS}>
                  문자 받을 번호 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="contactDetail"
                  name="contactDetail"
                  type="tel"
                  inputMode="tel"
                  value={contactDetail}
                  onChange={handleFormChange}
                  placeholder="010-1234-5678"
                  disabled={saving}
                  className={CONTROL_CLASS}
                />
              </div>
            ) : null}
          </SectionCard>

          <SectionCard
            sectionId="notes"
            title="추가 설명"
            description="경기 방식·준비물 등을 적어주세요."
          >
            <div>
              <Label htmlFor="description" className={LABEL_CLASS}>
                상세 내용
              </Label>
              <textarea
                id="description"
                name="description"
                value={description}
                onChange={handleFormChange}
                placeholder="경기 관련 내용을 입력해주세요"
                disabled={saving}
                rows={5}
                className={`${CONTROL_CLASS} min-h-28 resize-y`}
              />
            </div>
          </SectionCard>

          <SectionCard
            sectionId="team-image"
            title="팀 이미지 (선택)"
            description="선택 사항 — 대표 이미지 미리보기."
          >
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setImagePreviewUrl(URL.createObjectURL(file));
                else setImagePreviewUrl(null);
              }}
              className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-blue-700"
              disabled={saving}
            />
            {imagePreviewUrl ? (
              <img
                src={imagePreviewUrl}
                alt="미리보기"
                className="mt-3 h-36 w-full rounded-lg border border-gray-100 object-cover"
              />
            ) : null}
          </SectionCard>
        </form>
      </div>

      {showMapPicker ? (
        <MapPickerModal
          onClose={() => setShowMapPicker(false)}
          onSelect={(lat, lng, name) => {
            const short =
              name.length > 80 ? `${name.slice(0, 77)}…` : name;
            setForm((prev) => ({
              ...prev,
              stadium: short.split(",")[0]?.trim() || short,
            }));
            setStadiumCoords({ lat, lng });
            setShowMapPicker(false);
          }}
        />
      ) : null}
    </div>

    {createPortal(
      <div
        className="fixed bottom-0 left-0 z-[100] w-full border-t border-gray-200 bg-white"
        style={{
          paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0px))",
        }}
      >
        <div className="mx-auto flex max-w-[480px] gap-2 px-4 py-3">
          {!canSubmit ? (
            <p className="absolute -top-6 left-1/2 w-full max-w-[480px] -translate-x-1/2 px-4 text-center text-xs text-amber-700">
              {submitBlockReason}
            </p>
          ) : null}
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(-1)}
            disabled={saving}
            className="h-12 min-h-12 flex-1 rounded-xl border border-gray-300 bg-white text-base font-normal text-gray-600 shadow-none hover:bg-gray-50"
          >
            취소
          </Button>
          <Button
            type="submit"
            form="match-create-form"
            disabled={saving || !canSubmit}
            className="h-12 min-h-12 flex-1 rounded-xl border-0 bg-blue-600 text-base font-semibold text-white shadow-md shadow-blue-600/30 hover:bg-blue-700 disabled:bg-gray-300 disabled:shadow-none disabled:text-gray-500"
          >
            {saving ? "등록 중…" : "매칭 등록"}
          </Button>
        </div>
      </div>,
      document.body
    )}
    </>
  );
}
