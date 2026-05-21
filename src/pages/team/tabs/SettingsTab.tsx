/**
 * 🔥 팀 설정 탭 — 팀 운영 컨트롤 센터(1차: 팀명/라인업 기본값/멤버 정책·리마인드)
 */

import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useAuth } from "@/context/AuthProvider";
import { createTeamInviteLink } from "@/lib/team/teamInviteLink";
import { publicInviteLandingUrlStrict } from "@/lib/growth/teamInviteShare";
import { applyToTournament } from "@/lib/tournament/tournamentApplication";
import { canEditTeam } from "@/lib/team/permissions";
import { updateTeamDocument } from "@/lib/team/updateTeamDocument";
import { updateTeamSettings } from "@/services/teamService";
import {
  TEAM_DEFAULT_FORMATIONS,
  type TeamDefaultFormation,
  type TeamDefaultStrategy,
  type TeamOperationalSettings,
} from "@/types/teamOperationalSettings";
import { toast } from "sonner";
import TeamFeePolicySettingsCard from "@/features/fees/components/TeamFeePolicySettingsCard";

interface SettingsTabProps {
  teamId: string;
  team: Record<string, unknown> & { id?: string };
  onTeamUpdated?: () => void | Promise<void>;
}

function SectionCard(props: { title: string; description?: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{props.title}</h3>
        {props.description ? <p className="mt-1 text-sm text-gray-600">{props.description}</p> : null}
      </div>
      {props.children}
    </div>
  );
}

function readOperationalSettings(team: Record<string, unknown>): TeamOperationalSettings {
  const s = team.settings;
  if (!s || typeof s !== "object" || Array.isArray(s)) return {};
  return s as TeamOperationalSettings;
}

export function SettingsTab({ teamId, team, onTeamUpdated }: SettingsTabProps) {
  const { user } = useAuth();
  const [generatingLink, setGeneratingLink] = useState(false);

  const [teamName, setTeamName] = useState(String(team?.name ?? ""));
  const [description, setDescription] = useState(String(team?.description ?? ""));

  const [defaultFormation, setDefaultFormation] = useState<TeamDefaultFormation>(() => {
    const s = readOperationalSettings(team);
    return (TEAM_DEFAULT_FORMATIONS as readonly string[]).includes(String(s.defaultFormation))
      ? (s.defaultFormation as TeamDefaultFormation)
      : "4-4-2";
  });
  const [defaultStrategy, setDefaultStrategy] = useState<TeamDefaultStrategy>(() => {
    const s = readOperationalSettings(team);
    return s.defaultStrategy === "young" || s.defaultStrategy === "senior" ? s.defaultStrategy : "balanced";
  });
  const [autoLineupName, setAutoLineupName] = useState(() => readOperationalSettings(team).autoLineupName !== false);

  const [allowDuplicateJersey, setAllowDuplicateJersey] = useState(
    () => readOperationalSettings(team).allowDuplicateJersey === true
  );
  const [defaultAvailable, setDefaultAvailable] = useState(() => readOperationalSettings(team).defaultAvailable !== false);
  const [showAge, setShowAge] = useState(() => readOperationalSettings(team).showAge !== false);

  const [reminderCooldownMinutes, setReminderCooldownMinutes] = useState(() => {
    const s = readOperationalSettings(team);
    return typeof s.reminderCooldownMinutes === "number" && Number.isFinite(s.reminderCooldownMinutes)
      ? s.reminderCooldownMinutes
      : 10;
  });
  const [autoReminder, setAutoReminder] = useState(() => readOperationalSettings(team).autoReminder === true);

  const [feeAutoCloseEnabled, setFeeAutoCloseEnabled] = useState(
    () => readOperationalSettings(team).feeAutoCloseEnabled === true
  );
  const [feeAutoCloseDayOfMonth, setFeeAutoCloseDayOfMonth] = useState(() => {
    const raw = readOperationalSettings(team).feeAutoCloseDayOfMonth;
    return typeof raw === "number" && Number.isFinite(raw) && raw >= 1 && raw <= 31 ? raw : 31;
  });
  const [feeAutoCloseDryRun, setFeeAutoCloseDryRun] = useState(
    () => readOperationalSettings(team).feeAutoCloseDryRun === true
  );

  const [canEditProfile, setCanEditProfile] = useState(false);
  const [permLoading, setPermLoading] = useState(true);

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingLineupDefaults, setSavingLineupDefaults] = useState(false);
  const [savingMemberPolicy, setSavingMemberPolicy] = useState(false);
  const [savingNotify, setSavingNotify] = useState(false);
  const [savingFeeAutoClose, setSavingFeeAutoClose] = useState(false);

  useEffect(() => {
    setTeamName(String(team?.name ?? ""));
    setDescription(String(team?.description ?? ""));
    const next = readOperationalSettings(team);
    setDefaultFormation(
      (TEAM_DEFAULT_FORMATIONS as readonly string[]).includes(String(next.defaultFormation))
        ? (next.defaultFormation as TeamDefaultFormation)
        : "4-4-2"
    );
    setDefaultStrategy(
      next.defaultStrategy === "young" || next.defaultStrategy === "senior" ? next.defaultStrategy : "balanced"
    );
    setAutoLineupName(next.autoLineupName !== false);
    setAllowDuplicateJersey(next.allowDuplicateJersey === true);
    setDefaultAvailable(next.defaultAvailable !== false);
    setShowAge(next.showAge !== false);
    setReminderCooldownMinutes(
      typeof next.reminderCooldownMinutes === "number" && Number.isFinite(next.reminderCooldownMinutes)
        ? next.reminderCooldownMinutes
        : 10
    );
    setAutoReminder(next.autoReminder === true);
    setFeeAutoCloseEnabled(next.feeAutoCloseEnabled === true);
    const d = next.feeAutoCloseDayOfMonth;
    setFeeAutoCloseDayOfMonth(
      typeof d === "number" && Number.isFinite(d) && d >= 1 && d <= 31 ? d : 31
    );
  }, [team]);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!user?.uid || !teamId) {
        setCanEditProfile(false);
        setPermLoading(false);
        return;
      }
      setPermLoading(true);
      try {
        const ok = await canEditTeam(user.uid, teamId);
        if (!alive) return;
        setCanEditProfile(ok);
      } catch {
        if (!alive) return;
        setCanEditProfile(false);
      } finally {
        if (alive) setPermLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [teamId, user?.uid]);

  const bumpTeam = useCallback(async () => {
    try {
      await onTeamUpdated?.();
    } catch {
      // ignore
    }
  }, [onTeamUpdated]);

  const handleCreateInviteLink = async () => {
    if (!teamId || !user?.uid) return;

    setGeneratingLink(true);
    try {
      const inviteId = await createTeamInviteLink(teamId, user.uid, {
        teamName: typeof team?.name === "string" ? team.name : undefined,
      });
      const inviteUrl = publicInviteLandingUrlStrict(inviteId);

      await navigator.clipboard.writeText(inviteUrl);
      toast.success("초대 링크가 생성되어 클립보드에 복사됐어요.");
    } catch (e: unknown) {
      console.error("초대 링크 생성 실패:", e);
      toast.error(e instanceof Error ? e.message : "초대 링크 생성에 실패했습니다.");
    } finally {
      setGeneratingLink(false);
    }
  };

  const handleApplyTournament = async () => {
    const tournamentId = prompt("대회 ID를 입력하세요:");
    if (!tournamentId || !teamId || !user?.uid) return;

    try {
      await applyToTournament({
        tournamentId: tournamentId.trim(),
        teamId,
        leaderUid: user.uid,
      });
      toast.success("대회 참가 신청이 완료되었습니다.");
    } catch (e: unknown) {
      console.error("대회 참가 신청 실패:", e);
      toast.error(e instanceof Error ? e.message : "대회 참가 신청에 실패했습니다.");
    }
  };

  const saveProfile = async () => {
    if (!teamId || !user?.uid) return;
    if (!canEditProfile) {
      toast.error("팀장/관리자만 팀 이름·소개를 수정할 수 있어요.");
      return;
    }
    const name = teamName.trim();
    if (!name) {
      toast.error("팀 이름을 입력해주세요.");
      return;
    }
    setSavingProfile(true);
    try {
      await updateTeamDocument(teamId, {
        name,
        description: description.trim() ? description.trim() : null,
      });
      toast.success("팀 기본 정보를 저장했어요.");
      await bumpTeam();
    } catch (e: unknown) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "저장에 실패했습니다. (Firestore Rules/권한을 확인해주세요)");
    } finally {
      setSavingProfile(false);
    }
  };

  const saveLineupDefaults = async () => {
    if (!teamId) return;
    setSavingLineupDefaults(true);
    try {
      await updateTeamSettings(teamId, {
        defaultFormation,
        defaultStrategy,
        autoLineupName,
      });
      toast.success("라인업 기본 설정을 저장했어요.");
      await bumpTeam();
    } catch (e: unknown) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "저장에 실패했습니다. (Firestore Rules/권한을 확인해주세요)");
    } finally {
      setSavingLineupDefaults(false);
    }
  };

  const saveMemberPolicy = async () => {
    if (!teamId) return;
    setSavingMemberPolicy(true);
    try {
      await updateTeamSettings(teamId, {
        allowDuplicateJersey,
        defaultAvailable,
        showAge,
      });
      toast.success("멤버 정책을 저장했어요.");
      await bumpTeam();
    } catch (e: unknown) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "저장에 실패했습니다. (Firestore Rules/권한을 확인해주세요)");
    } finally {
      setSavingMemberPolicy(false);
    }
  };

  const saveNotify = async () => {
    if (!teamId) return;
    const minutes = Math.round(Number(reminderCooldownMinutes));
    if (!Number.isFinite(minutes) || minutes < 1 || minutes > 24 * 60) {
      toast.error("리마인드 쿨타임은 1~1440(분) 범위로 입력해주세요.");
      return;
    }
    setSavingNotify(true);
    try {
      await updateTeamSettings(teamId, {
        reminderCooldownMinutes: minutes,
        autoReminder,
      });
      toast.success("알림(리마인드) 설정을 저장했어요.");
      await bumpTeam();
    } catch (e: unknown) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "저장에 실패했습니다. (Firestore Rules/권한을 확인해주세요)");
    } finally {
      setSavingNotify(false);
    }
  };

  const saveFeeAutoClose = async () => {
    if (!teamId) return;
    const day = Math.round(Number(feeAutoCloseDayOfMonth));
    if (!Number.isFinite(day) || day < 1 || day > 31) {
      toast.error("자동 마감 기준일은 1~31 사이로 입력해 주세요. (31은 해당 월 말일)");
      return;
    }
    setSavingFeeAutoClose(true);
    try {
      await updateTeamSettings(teamId, {
        feeAutoCloseEnabled,
        feeAutoCloseDayOfMonth: day,
        feeAutoCloseDryRun,
      });
      toast.success("회비 자동 마감 설정을 저장했어요.");
      await bumpTeam();
    } catch (e: unknown) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "저장에 실패했습니다. (Firestore Rules/권한을 확인해주세요)");
    } finally {
      setSavingFeeAutoClose(false);
    }
  };

  const disabledBecausePerm = permLoading || !canEditProfile;

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-blue-100 bg-blue-50/40 p-4 text-sm text-blue-950">
        <p className="font-semibold">설정 탭 = 팀 운영 컨트롤 센터</p>
        <p className="mt-1 text-xs text-blue-900/90">
          운영에 필요한 변경은 여기로 모읍니다. (권한/데이터 삭제/팀 삭제는 다음 단계에서 더 강하게 묶을게요.)
        </p>
      </div>

      <SectionCard
        title="팀 기본 정보"
        description="팀 이름/소개는 팀장·관리자만 변경할 수 있어요. (부팀장 화면과 정책을 맞추기 위함)"
      >
        <div className="grid gap-4">
          <label className="block">
            <div className="text-sm font-medium text-gray-800">팀 이름</div>
            <input
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              disabled={disabledBecausePerm}
              className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm disabled:bg-gray-50 disabled:text-gray-500"
            />
          </label>

          <label className="block">
            <div className="text-sm font-medium text-gray-800">팀 소개 (선택)</div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={disabledBecausePerm}
              rows={4}
              className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm disabled:bg-gray-50 disabled:text-gray-500"
            />
          </label>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={saveProfile}
              disabled={disabledBecausePerm || savingProfile}
              className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-50"
            >
              {savingProfile ? "저장 중..." : "저장"}
            </button>
            {permLoading ? <span className="text-xs text-gray-500">권한 확인 중...</span> : null}
            {!permLoading && !canEditProfile ? (
              <span className="text-xs text-gray-600">읽기 전용 (팀장/관리자만 수정)</span>
            ) : null}
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="경기 기본 설정 (라인업 연동)"
        description="새 라인업 화면의 기본 포메이션/전략 프리필에 사용됩니다."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <div className="text-sm font-medium text-gray-800">기본 포메이션</div>
            <select
              value={defaultFormation}
              onChange={(e) => setDefaultFormation(e.target.value as TeamDefaultFormation)}
              className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
            >
              {TEAM_DEFAULT_FORMATIONS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <div className="text-sm font-medium text-gray-800">기본 추천 전략</div>
            <select
              value={defaultStrategy}
              onChange={(e) => setDefaultStrategy(e.target.value as TeamDefaultStrategy)}
              className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
            >
              <option value="balanced">균형</option>
              <option value="young">청춘</option>
              <option value="senior">베테랑</option>
            </select>
          </label>
        </div>

        <label className="mt-4 flex items-center justify-between gap-3 rounded-md border border-gray-200 px-3 py-2">
          <div>
            <div className="text-sm font-medium text-gray-900">라인업 이름 자동 생성</div>
            <div className="text-xs text-gray-600">저장 UX를 빠르게 만들기 위한 토글(다음 단계에서 라인업 저장 로직과 더 강하게 연결)</div>
          </div>
          <input type="checkbox" checked={autoLineupName} onChange={(e) => setAutoLineupName(e.target.checked)} />
        </label>

        <div className="mt-4">
          <button
            type="button"
            onClick={saveLineupDefaults}
            disabled={savingLineupDefaults}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {savingLineupDefaults ? "저장 중..." : "라인업 기본 설정 저장"}
          </button>
        </div>
      </SectionCard>

      <SectionCard title="멤버 정책" description="멤버 UX/검증에 연결되는 운영 스위치입니다.">
        <div className="space-y-3">
          <label className="flex items-center justify-between gap-3 rounded-md border border-gray-200 px-3 py-2">
            <div>
              <div className="text-sm font-medium text-gray-900">배번 중복 허용</div>
              <div className="text-xs text-gray-600">중복 배번이 필요한 팀만 켜세요.</div>
            </div>
            <input type="checkbox" checked={allowDuplicateJersey} onChange={(e) => setAllowDuplicateJersey(e.target.checked)} />
          </label>

          <label className="flex items-center justify-between gap-3 rounded-md border border-gray-200 px-3 py-2">
            <div>
              <div className="text-sm font-medium text-gray-900">출전 가능 기본값</div>
              <div className="text-xs text-gray-600">라인업에서 기본 체크 UX에 사용(단계적 연결)</div>
            </div>
            <input type="checkbox" checked={defaultAvailable} onChange={(e) => setDefaultAvailable(e.target.checked)} />
          </label>

          <label className="flex items-center justify-between gap-3 rounded-md border border-gray-200 px-3 py-2">
            <div>
              <div className="text-sm font-medium text-gray-900">연령 표시</div>
              <div className="text-xs text-gray-600">출생연도 기반 표시 정책(단계적 연결)</div>
            </div>
            <input type="checkbox" checked={showAge} onChange={(e) => setShowAge(e.target.checked)} />
          </label>
        </div>

        <div className="mt-4">
          <button
            type="button"
            onClick={saveMemberPolicy}
            disabled={savingMemberPolicy}
            className="rounded-md bg-violet-700 px-4 py-2 text-sm font-medium text-white hover:bg-violet-800 disabled:opacity-50"
          >
            {savingMemberPolicy ? "저장 중..." : "멤버 정책 저장"}
          </button>
        </div>
      </SectionCard>

      <SectionCard
        title="알림 설정 (리마인드)"
        description="FCM 전에는 ‘정책 값 저장’ 중심으로 두고, 발송 로직에서 읽어갈 수 있게 합니다."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <div className="text-sm font-medium text-gray-800">리마인드 기본 쿨타임(분)</div>
            <input
              inputMode="numeric"
              value={String(reminderCooldownMinutes)}
              onChange={(e) => setReminderCooldownMinutes(Number(e.target.value))}
              className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
            />
          </label>

          <label className="mt-8 flex items-center justify-between gap-3 rounded-md border border-gray-200 px-3 py-2 md:mt-6">
            <div>
              <div className="text-sm font-medium text-gray-900">자동 리마인드</div>
              <div className="text-xs text-gray-600">기본은 OFF 권장</div>
            </div>
            <input type="checkbox" checked={autoReminder} onChange={(e) => setAutoReminder(e.target.checked)} />
          </label>
        </div>

        <div className="mt-4">
          <button
            type="button"
            onClick={saveNotify}
            disabled={savingNotify}
            className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            {savingNotify ? "저장 중..." : "알림 설정 저장"}
          </button>
        </div>
      </SectionCard>

      <TeamFeePolicySettingsCard teamId={teamId} disabled={disabledBecausePerm} />

      <SectionCard
        title="회비 자동 마감"
        description="매일 새벽(서울) 서버가 조회합니다. 마감일이 지난 오픈 회차만 대상이며, 해당 회차의 납부 문서가 전부 paid일 때만 마감합니다."
      >
        <label className="flex items-center justify-between gap-3 rounded-md border border-gray-200 px-3 py-2">
          <div>
            <div className="text-sm font-medium text-gray-900">자동 마감 사용</div>
            <div className="text-xs text-gray-600">OFF면 수동 마감만 가능합니다.</div>
          </div>
          <input
            type="checkbox"
            checked={feeAutoCloseEnabled}
            onChange={(e) => setFeeAutoCloseEnabled(e.target.checked)}
            disabled={disabledBecausePerm}
          />
        </label>
        <label className="mt-4 block max-w-xs">
          <div className="text-sm font-medium text-gray-800">기준일(매월, 서울)</div>
          <div className="mt-0.5 text-xs text-gray-500">
            마감과 같은 달에는 이 날(또는 말일) 이후에만 자동 마감을 시도합니다. 31은 짧은 달은 말일로 처리됩니다.
          </div>
          <input
            inputMode="numeric"
            value={String(feeAutoCloseDayOfMonth)}
            onChange={(e) => setFeeAutoCloseDayOfMonth(Number(e.target.value))}
            disabled={disabledBecausePerm || !feeAutoCloseEnabled}
            className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
          />
        </label>
        <label className="mt-4 flex items-center justify-between gap-3 rounded-md border border-amber-200 bg-amber-50/50 px-3 py-2">
          <div>
            <div className="text-sm font-medium text-amber-950">드라이런(로그만)</div>
            <div className="text-xs text-amber-900/90">
              ON이면 조건 충족 시 Cloud Logging에만 기록하고 실제 마감은 하지 않습니다. 정책 검증 후 끄세요.
            </div>
          </div>
          <input
            type="checkbox"
            checked={feeAutoCloseDryRun}
            onChange={(e) => setFeeAutoCloseDryRun(e.target.checked)}
            disabled={disabledBecausePerm || !feeAutoCloseEnabled}
          />
        </label>
        <div className="mt-4">
          <button
            type="button"
            onClick={saveFeeAutoClose}
            disabled={disabledBecausePerm || savingFeeAutoClose}
            className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900 disabled:opacity-50"
          >
            {savingFeeAutoClose ? "저장 중..." : "회비 자동 마감 저장"}
          </button>
        </div>
      </SectionCard>

      <SectionCard title="성장/초대" description="운영에 필요한 초대/대회 신청은 아래에 유지합니다.">
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-700 mb-3">팀원을 빠르게 늘리거나, 대회 참가 신청이 필요할 때 사용하세요.</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleCreateInviteLink}
                disabled={generatingLink}
                className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                {generatingLink ? "생성 중..." : "팀 초대 링크 생성"}
              </button>
              <button
                onClick={handleApplyTournament}
                className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                대회 참가 신청
              </button>
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="text-sm font-medium text-gray-900 mb-2">팀 정보(읽기)</div>
            <div className="space-y-2 text-sm text-gray-800">
              <div>
                <span className="font-medium text-gray-700">팀 이름:</span> {String(team?.name ?? "")}
              </div>
              <div>
                <span className="font-medium text-gray-700">지역:</span> {team?.region ? String(team.region) : "미설정"}
              </div>
              <div>
                <span className="font-medium text-gray-700">종목:</span> {team?.sportType ? String(team.sportType) : "미설정"}
              </div>
              {team?.associationId ? (
                <div>
                  <span className="font-medium text-gray-700">협회 소속:</span>{" "}
                  <span className="text-blue-700">{String(team.associationId)}</span>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
