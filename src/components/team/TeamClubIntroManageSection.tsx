import { useEffect, useState } from "react";
import { Loader2, Save, Sparkles, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { ClubIntroCatalogEntry, ClubIntroProfile, ClubIntroStatus } from "@/types/clubIntroProfile";
import { findClubIntroCatalogByTeamName } from "@/lib/team/nowonUnitClubIntroCatalog";
import { getTeamClubIntro } from "@/lib/team/resolveClubIntroProfile";
import { setTeamClubIntroCallable } from "@/lib/team/setTeamClubIntroClient";
import { generateClubIntroSummaryCallable } from "@/lib/team/generateClubIntroSummaryClient";
import { AiContentVocPanel } from "@/components/team/AiContentVocPanel";
import { AI_CONTENT_PROMPT_VERSION } from "@/lib/team/aiContentPromptVersions";
import {
  clubIntroFactsFingerprint,
  formatAiMetaTime,
} from "@/lib/team/clubIntroFactsFingerprint";
import { callableErrorMessage } from "@/lib/errors/callableErrorMessage";

export type TeamClubIntroManageSectionProps = {
  teamId: string;
  teamName: string;
  team: { aiProfile?: unknown; name?: unknown } | null;
  dark?: boolean;
  onUpdated: () => void | Promise<void>;
};

function linesToList(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

function listToLines(list?: string[]): string {
  return (list ?? []).join("\n");
}

function catalogToDraft(hit: ClubIntroCatalogEntry, teamId: string): ClubIntroProfile {
  const { catalogId: _c, matchKeys: _m, ...rest } = hit;
  return {
    ...rest,
    status: "DRAFT",
    platformTeamId: teamId,
    updatedAt: new Date().toISOString(),
  };
}

function emptyDraft(teamId: string, teamName: string): ClubIntroProfile {
  return {
    teamName: teamName.trim() || "팀",
    introSummary: "",
    ceremonyIntroText: "",
    source: "NOWON_UNIT_CLUB_CEREMONY_SCRIPT",
    status: "DRAFT",
    platformTeamId: teamId,
    updatedAt: new Date().toISOString(),
  };
}

export function TeamClubIntroManageSection({
  teamId,
  teamName,
  team,
  dark = false,
  onUpdated,
}: TeamClubIntroManageSectionProps) {
  const [draft, setDraft] = useState<ClubIntroProfile>(() => emptyDraft(teamId, teamName));
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [vocSession, setVocSession] = useState<{
    promptVersion: string;
    generatedAtIso: string;
    regenerateCount: number;
    baselineDraft: string;
  } | null>(null);
  const [hasSavedSoT, setHasSavedSoT] = useState(false);
  /** 시드 이름매칭 — 폼 채우기 전용. 저장 후 공개 읽기에는 사용하지 않음 */
  const catalogHit = findClubIntroCatalogByTeamName(teamName);

  useEffect(() => {
    const saved = getTeamClubIntro(team);
    if (saved) {
      setHasSavedSoT(true);
      setDraft({ ...saved, platformTeamId: teamId });
      return;
    }
    setHasSavedSoT(false);
    // 미저장: 시드로 폼을 바로 채움(이름매칭은 CMS 시드 전용 1회). 공개 읽기 경로 아님.
    const seed = findClubIntroCatalogByTeamName(teamName);
    setDraft(seed ? catalogToDraft(seed, teamId) : emptyDraft(teamId, teamName));
  }, [team, teamId, teamName]);

  const fillFormFromSeed = (overwrite: boolean) => {
    if (!catalogHit) {
      toast.message("이 팀명과 일치하는 노원 단위축구회 시드가 없어요.");
      return;
    }
    if (overwrite && hasSavedSoT) {
      const ok = window.confirm(
        "이미 저장된 소개가 있습니다. 시드로 폼을 덮어쓸까요? (아직 저장 버튼까지 누르지 않으면 Firestore는 유지됩니다.)"
      );
      if (!ok) return;
    }
    setDraft(catalogToDraft(catalogHit, teamId));
    toast.success(`「${catalogHit.teamName}」 시드를 폼에 채웠어요. 수정한 뒤 저장하세요.`);
  };

  const patch = (p: Partial<ClubIntroProfile>) => {
    setDraft((prev) => ({ ...prev, ...p }));
  };

  const factsFromDraft = () => ({
    teamName: draft.teamName,
    chairmanName: draft.chairmanName,
    foundedYear: draft.foundedYear,
    foundedDate: draft.foundedDate,
    memberCountLabel: draft.memberCountLabel,
    homeGrounds: draft.homeGrounds,
    ageRange: draft.ageRange,
    activityDay: draft.activityDay,
    teamValues: draft.teamValues,
    achievements: draft.achievements,
  });

  const currentFactsFp = clubIntroFactsFingerprint(factsFromDraft());
  const provenance = draft.introSummaryProvenance;
  const factsStale = Boolean(
    provenance?.factsFingerprint && provenance.factsFingerprint !== currentFactsFp
  );

  const generateIntroSummary = async () => {
    if (busy || aiBusy) return;
    if (!draft.teamName.trim()) {
      toast.error("팀명이 필요합니다.");
      return;
    }
    setAiBusy(true);
    const t = toast.loading("AI 팀소개 생성 중…");
    try {
      const facts = factsFromDraft();
      const { introSummaryDraft, source, promptVersion } = await generateClubIntroSummaryCallable({
        teamId,
        facts,
      });
      const fp = clubIntroFactsFingerprint(facts);
      const src = source === "template" ? "template" : "openai";
      patch({
        introSummary: introSummaryDraft,
        introSummaryProvenance: {
          generatedAt: new Date().toISOString(),
          source: src,
          factsFingerprint: fp,
        },
      });
      setVocSession((prev) => ({
        promptVersion: promptVersion || AI_CONTENT_PROMPT_VERSION.clubIntro,
        generatedAtIso: new Date().toISOString(),
        regenerateCount: prev ? prev.regenerateCount + 1 : 0,
        baselineDraft: introSummaryDraft,
      }));
      toast.dismiss(t);
      toast.success(
        source === "template"
          ? "템플릿으로 초안을 채웠어요. 수정 후 저장하세요."
          : "AI 초안을 폼에 채웠어요. 수정 후 저장하세요. (아직 공개되지 않습니다)"
      );
    } catch (e: unknown) {
      toast.dismiss(t);
      toast.error(callableErrorMessage(e) || "팀소개 생성에 실패했어요.");
    } finally {
      setAiBusy(false);
    }
  };

  const save = async () => {
    if (busy) return;
    if (!draft.introSummary.trim()) {
      toast.error("팀 소개 요약을 입력해 주세요.");
      return;
    }
    if (
      !draft.ceremonyIntroText.trim() &&
      (draft.status === "REVIEWED" || draft.status === "PUBLISHED")
    ) {
      toast.error("REVIEWED/PUBLISHED에는 입장식 원문이 필요합니다. 원문을 그대로 붙여넣으세요.");
      return;
    }
    setBusy(true);
    const t = toast.loading("저장하는 중…");
    try {
      await setTeamClubIntroCallable({
        teamId,
        clubIntro: {
          ...draft,
          platformTeamId: teamId,
          updatedAt: new Date().toISOString(),
        },
      });
      toast.dismiss(t);
      toast.success(
        draft.status === "PUBLISHED"
          ? "저장했어요. 공개 페이지에 반영됩니다."
          : "저장했어요. DRAFT/REVIEWED는 관리자 미리보기에만 보입니다."
      );
      setHasSavedSoT(true);
      await onUpdated();
    } catch (e: unknown) {
      toast.dismiss(t);
      toast.error(callableErrorMessage(e) || "저장에 실패했어요.");
    } finally {
      setBusy(false);
    }
  };

  const fieldClass = cn("mt-1 text-sm", dark ? "border-slate-600 bg-slate-950/60 text-slate-100" : "");
  const ceremonyMissing = !draft.ceremonyIntroText.trim();

  return (
    <section
      className={cn(
        "rounded-2xl border p-4 sm:p-5 space-y-3",
        dark ? "border-slate-600/80 bg-slate-800/30 text-slate-100" : "border-gray-200 bg-white/95"
      )}
      aria-label="단위축구회 소개 관리"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className={cn("text-sm font-semibold", dark ? "text-slate-100" : "text-gray-900")}>
            단위축구회 소개 (입장식 구조화)
          </h3>
          <p className={cn("mt-1 text-xs leading-relaxed", dark ? "text-slate-400" : "text-gray-500")}>
            시드로 폼을 채운 뒤 바로 수정하고 저장하세요. 저장 후에는 이 팀(
            <span className="font-mono text-[10px]">{teamId}</span>) SoT만 사용합니다. PUBLISHED만
            공개됩니다.
          </p>
        </div>
        {catalogHit ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className={cn("gap-1 text-xs", dark ? "border-slate-500" : "")}
            disabled={busy || aiBusy}
            onClick={() => fillFormFromSeed(hasSavedSoT)}
            title={`시드: ${catalogHit.teamName} (이름매칭은 폼 채우기 전용)`}
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            {hasSavedSoT ? "시드로 다시 채우기" : "시드로 폼 채우기"}
          </Button>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label className="text-xs">회장명</Label>
          <Input
            className={fieldClass}
            value={draft.chairmanName ?? ""}
            onChange={(e) => patch({ chairmanName: e.target.value })}
            disabled={busy || aiBusy}
          />
        </div>
        <div>
          <Label className="text-xs">창단연도</Label>
          <Input
            className={fieldClass}
            type="number"
            value={draft.foundedYear ?? ""}
            onChange={(e) =>
              patch({ foundedYear: e.target.value ? Number(e.target.value) : undefined })
            }
            disabled={busy || aiBusy}
          />
        </div>
        <div>
          <Label className="text-xs">회원 수 표기</Label>
          <Input
            className={fieldClass}
            value={draft.memberCountLabel ?? ""}
            onChange={(e) => patch({ memberCountLabel: e.target.value })}
            disabled={busy || aiBusy}
            placeholder="예: 약 70명"
          />
        </div>
        <div>
          <Label className="text-xs">연령대</Label>
          <Input
            className={fieldClass}
            value={draft.ageRange ?? ""}
            onChange={(e) => patch({ ageRange: e.target.value })}
            disabled={busy || aiBusy}
          />
        </div>
        <div className="sm:col-span-2">
          <Label className="text-xs">홈구장 (줄바꿈으로 구분)</Label>
          <Textarea
            className={cn(fieldClass, "min-h-[64px]")}
            value={listToLines(draft.homeGrounds)}
            onChange={(e) => patch({ homeGrounds: linesToList(e.target.value) })}
            disabled={busy || aiBusy}
          />
        </div>
        <div className="sm:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label className="text-xs">팀 소개 요약 (공개용)</Label>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="h-7 gap-1 text-xs"
              disabled={busy || aiBusy}
              onClick={() => void generateIntroSummary()}
              title="현재 폼의 구조화 필드만 사용합니다. 없는 사실은 만들지 않습니다."
            >
              {aiBusy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                <Wand2 className="h-3.5 w-3.5" aria-hidden />
              )}
              AI 팀소개 생성
            </Button>
          </div>
          <Textarea
            className={cn(fieldClass, "min-h-[88px]")}
            value={draft.introSummary}
            onChange={(e) => {
              const next = e.target.value;
              setDraft((prev) => ({
                ...prev,
                introSummary: next,
                introSummaryProvenance: prev.introSummaryProvenance
                  ? {
                      ...prev.introSummaryProvenance,
                      humanEditedAt: new Date().toISOString(),
                    }
                  : prev.introSummaryProvenance,
              }));
            }}
            disabled={busy || aiBusy}
            placeholder="구조화 필드를 채운 뒤 AI 팀소개 생성으로 초안을 만들 수 있어요."
          />
          {vocSession ? (
            <AiContentVocPanel
              key={`clubIntro-${vocSession.generatedAtIso}`}
              className="mt-2"
              teamId={teamId}
              featureType="clubIntro"
              promptVersion={vocSession.promptVersion}
              generatedAtIso={vocSession.generatedAtIso}
              regenerateCount={vocSession.regenerateCount}
              edited={draft.introSummary.trim() !== vocSession.baselineDraft.trim()}
              dark={dark}
            />
          ) : null}
          {provenance?.generatedAt ? (
            <p className={cn("mt-1 text-[11px] leading-relaxed", dark ? "text-slate-500" : "text-gray-500")}>
              AI 초안 생성 {formatAiMetaTime(provenance.generatedAt)}
              {provenance.humanEditedAt
                ? ` · 마지막 수정(관리자) ${formatAiMetaTime(provenance.humanEditedAt)}`
                : " · 마지막 수정 관리자 편집 없음"}
            </p>
          ) : (
            <p className={cn("mt-1 text-[11px]", dark ? "text-slate-500" : "text-gray-500")}>
              AI는 폼에 있는 창단·회원·홈구장·특징·업적만 사용합니다. 결과는 초안이며, 저장·PUBLISHED 전까지
              공개되지 않습니다.
            </p>
          )}
          {factsStale ? (
            <div
              className={cn(
                "mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs",
                dark
                  ? "border-amber-700/50 bg-amber-950/30 text-amber-100"
                  : "border-amber-200 bg-amber-50 text-amber-950"
              )}
              role="status"
            >
              <span>팀 정보가 변경되었습니다. AI 소개문을 다시 생성하시겠습니까?</span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                disabled={busy || aiBusy}
                onClick={() => void generateIntroSummary()}
              >
                다시 생성
              </Button>
            </div>
          ) : null}
        </div>
        <div className="sm:col-span-2">
          <Label className="text-xs">팀 특징 (줄바꿈)</Label>
          <Textarea
            className={cn(fieldClass, "min-h-[64px]")}
            value={listToLines(draft.teamValues)}
            onChange={(e) => patch({ teamValues: linesToList(e.target.value) })}
            disabled={busy || aiBusy}
          />
        </div>
        <div className="sm:col-span-2">
          <Label className="text-xs">주요 업적 (줄바꿈)</Label>
          <Textarea
            className={cn(fieldClass, "min-h-[64px]")}
            value={listToLines(draft.achievements)}
            onChange={(e) => patch({ achievements: linesToList(e.target.value) })}
            disabled={busy || aiBusy}
          />
        </div>
        <div className="sm:col-span-2">
          <Label className="text-xs">입장식 소개 멘트 원문</Label>
          <Textarea
            className={cn(fieldClass, "min-h-[120px]")}
            value={draft.ceremonyIntroText}
            onChange={(e) => patch({ ceremonyIntroText: e.target.value })}
            disabled={busy || aiBusy}
            placeholder="행사 대본 원문을 그대로 붙여넣으세요. AI로 재작성하지 마세요."
          />
          {ceremonyMissing ? (
            <p className={cn("mt-1 text-[11px]", dark ? "text-amber-300/90" : "text-amber-700")}>
              원문이 비어 있습니다. DRAFT 저장은 가능하고, REVIEWED/PUBLISHED 전에는 원문 붙여넣기가
              필요합니다.
            </p>
          ) : null}
        </div>
        <div>
          <Label className="text-xs">공개 상태</Label>
          <select
            className={cn(
              "mt-1 flex h-9 w-full rounded-md border px-3 text-sm",
              dark ? "border-slate-600 bg-slate-950 text-slate-100" : "border-input bg-background"
            )}
            value={draft.status}
            disabled={busy || aiBusy}
            onChange={(e) => patch({ status: e.target.value as ClubIntroStatus })}
          >
            <option value="DRAFT">DRAFT (미리보기만)</option>
            <option value="REVIEWED">REVIEWED</option>
            <option value="PUBLISHED">PUBLISHED (공개)</option>
          </select>
        </div>
        <div className="flex items-end justify-end">
          <Button type="button" size="sm" disabled={busy || aiBusy} className="gap-1.5" onClick={() => void save()}>
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            저장
          </Button>
        </div>
      </div>
    </section>
  );
}
