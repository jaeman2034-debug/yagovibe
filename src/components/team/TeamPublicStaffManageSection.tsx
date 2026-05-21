import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, ImagePlus, Loader2, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { TeamPublicStaffMember } from "@/types/teamPublicStaff";
import { getTeamPublicStaff } from "@/lib/team/resolveTeamPublicStaff";
import { setTeamPublicStaffCallable, uploadTeamPublicStaffPhotoCallable } from "@/lib/team/teamPublicStaffClient";
import { callableErrorMessage } from "@/lib/errors/callableErrorMessage";
import { squareCropImageToJpegDataUrl } from "@/lib/image/squareCropToJpegDataUrl";
import { CLUB_PUBLIC_OFFICER_TITLE_OPTIONS } from "@/types/clubRole";

const MAX_STAFF = 12;

/** select 옵션과 정확히 일치할 때만 프리셋으로 간주 (저장 값은 항상 문자열 title) */
const TITLE_SELECT_OTHER = "__other__";
const STAFF_POSITION_PRESETS = CLUB_PUBLIC_OFFICER_TITLE_OPTIONS;

const selectBaseClass = (dark: boolean) =>
  cn(
    "mt-1 flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    dark ? "border-slate-600 bg-slate-900 text-slate-100 ring-offset-slate-900" : "border-input bg-background ring-offset-background"
  );

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => {
      if (typeof fr.result === "string") resolve(fr.result);
      else reject(new Error("FileReader 결과 형식이 올바르지 않습니다."));
    };
    fr.onerror = () => reject(fr.error ?? new Error("파일을 읽지 못했습니다."));
    fr.readAsDataURL(file);
  });
}

function newStaffId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `s_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function cloneMember(m: TeamPublicStaffMember): TeamPublicStaffMember {
  return { ...m };
}

function cloneList(list: TeamPublicStaffMember[]): TeamPublicStaffMember[] {
  return list.map(cloneMember);
}

function sortStaff(list: TeamPublicStaffMember[]): TeamPublicStaffMember[] {
  return [...list].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
}

function titleSelectValue(title: string): string {
  const t = title.trim();
  if (!t) return "";
  return (STAFF_POSITION_PRESETS as readonly string[]).includes(t) ? t : TITLE_SELECT_OTHER;
}

function reorderStaffInPlace(list: TeamPublicStaffMember[], id: string, dir: -1 | 1): TeamPublicStaffMember[] {
  const sorted = sortStaff(list);
  const i = sorted.findIndex((x) => x.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= sorted.length) return list;
  const next = [...sorted];
  const tmp = next[i]!;
  next[i] = next[j]!;
  next[j] = tmp;
  return next.map((row, idx) => ({ ...row, order: idx * 10 }));
}

export type TeamPublicStaffManageSectionProps = {
  teamId: string;
  team: { aiProfile?: unknown } | null;
  dark?: boolean;
  onUpdated: () => void | Promise<void>;
};

type EditingKey = null | "new" | string;

/** 팀장·운영진 — 공개 운영진(브랜딩) 목록 편집. members 권한과 별개. (표기: 생활체육 클럽 직함) */
export function TeamPublicStaffManageSection({ teamId, team, dark = false, onUpdated }: TeamPublicStaffManageSectionProps) {
  const tid = teamId.trim();
  const [staff, setStaff] = useState<TeamPublicStaffMember[]>([]);
  const [editingKey, setEditingKey] = useState<EditingKey>(null);
  const [editDraft, setEditDraft] = useState<TeamPublicStaffMember | null>(null);
  const [titleOtherMode, setTitleOtherMode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [photoBusyId, setPhotoBusyId] = useState<string | null>(null);
  /** 편집 시작 시점 스냅샷 — 취소 시 복원 (신규 추가는 목록에 넣지 않음) */
  const staffSnapshotOnEditOpen = useRef<TeamPublicStaffMember[] | null>(null);

  /** 편집 중에는 로컬 목록을 덮어쓰지 않음(취소·순서 조정 유지). 편집 종료 후에는 서버 스냅샷과 맞춤 */
  useEffect(() => {
    if (editingKey !== null) return;
    setStaff(getTeamPublicStaff(team));
  }, [team, editingKey]);

  const editingLocked = editingKey !== null;

  const guardEditingLock = () => {
    if (editingLocked) {
      toast.message("진행 중인 편집을 저장하거나 취소해 주세요.");
      return true;
    }
    return false;
  };

  const beginEdit = (row: TeamPublicStaffMember) => {
    if (guardEditingLock()) return;
    staffSnapshotOnEditOpen.current = cloneList(staff);
    setEditingKey(row.id);
    setEditDraft(cloneMember(row));
    const t = row.title.trim();
    setTitleOtherMode(Boolean(t && !(STAFF_POSITION_PRESETS as readonly string[]).includes(t)));
  };

  const beginAdd = () => {
    if (guardEditingLock()) return;
    if (staff.length >= MAX_STAFF) {
      toast.message(`운영진은 최대 ${MAX_STAFF}명까지 추가할 수 있어요.`);
      return;
    }
    staffSnapshotOnEditOpen.current = cloneList(staff);
    const order = staff.length ? Math.max(...staff.map((r) => r.order)) + 10 : 0;
    setEditingKey("new");
    setEditDraft({
      id: newStaffId(),
      name: "",
      title: "",
      intro: "",
      visible: true,
      order,
    });
    setTitleOtherMode(false);
  };

  const cancelEdit = () => {
    if (staffSnapshotOnEditOpen.current) {
      setStaff(cloneList(staffSnapshotOnEditOpen.current));
    }
    staffSnapshotOnEditOpen.current = null;
    setEditingKey(null);
    setEditDraft(null);
    setTitleOtherMode(false);
  };

  const patchDraft = (patch: Partial<TeamPublicStaffMember>) => {
    setEditDraft((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  const onTitleSelectChange = (value: string, prevTitle: string) => {
    if (!editDraft) return;
    if (value === TITLE_SELECT_OTHER) {
      setTitleOtherMode(true);
      const wasPreset = (STAFF_POSITION_PRESETS as readonly string[]).includes(prevTitle.trim());
      patchDraft({ title: wasPreset ? "" : prevTitle });
      requestAnimationFrame(() => {
        document.getElementById("staff-title-other-input")?.focus();
      });
      return;
    }
    setTitleOtherMode(false);
    if (value === "") {
      patchDraft({ title: "" });
      return;
    }
    patchDraft({ title: value });
  };

  const onPhoto = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file || !tid || !editDraft) return;
    if (!file.type.startsWith("image/")) {
      toast.error("이미지 파일만 올릴 수 있어요.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("파일은 8MB 이하로 올려 주세요.");
      return;
    }
    const id = editDraft.id;
    setPhotoBusyId(id);
    const t = toast.loading("사진을 처리하는 중…");
    try {
      let imageDataUrl: string;
      let contentType = "image/jpeg";
      try {
        imageDataUrl = await squareCropImageToJpegDataUrl(file, { maxEdge: 1024, quality: 0.88 });
      } catch {
        toast.message("자동 자르기에 실패해 원본으로 올립니다.");
        imageDataUrl = await readFileAsDataUrl(file);
        contentType = file.type || "image/jpeg";
      }
      const out = await uploadTeamPublicStaffPhotoCallable({
        teamId: tid,
        staffId: id,
        imageDataUrl,
        contentType,
      });
      if (!out.photoUrl) throw new Error("NO_URL");
      patchDraft({ photoUrl: out.photoUrl });
      toast.dismiss(t);
      toast.success("사진을 반영했어요. 저장하면 공개 페이지에 적용됩니다.");
    } catch (e: unknown) {
      toast.dismiss(t);
      toast.error(callableErrorMessage(e) || "업로드에 실패했어요.");
    } finally {
      setPhotoBusyId(null);
    }
  };

  const persistStaff = async (nextList: TeamPublicStaffMember[]) => {
    for (const r of nextList) {
      if (!r.name.trim() || !r.title.trim()) {
        toast.error("이름과 직책은 비울 수 없어요.");
        return false;
      }
    }
    setBusy(true);
    const t = toast.loading("저장하는 중…");
    try {
      await setTeamPublicStaffCallable({ teamId: tid, staff: sortStaff(nextList) });
      toast.dismiss(t);
      toast.success("저장했어요. 아래 「운영진 소개」에 반영됩니다.");
      await onUpdated();
      return true;
    } catch (e: unknown) {
      toast.dismiss(t);
      toast.error(callableErrorMessage(e) || "저장에 실패했어요.");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const saveEdit = async () => {
    if (!tid || busy || !editDraft || !editingKey) return;
    if (!editDraft.name.trim() || !editDraft.title.trim()) {
      toast.error("이름과 직책은 비울 수 없어요.");
      return;
    }
    const merged =
      editingKey === "new"
        ? [...staff, { ...editDraft, order: staff.length ? Math.max(...staff.map((r) => r.order)) + 10 : 0 }]
        : staff.map((r) => (r.id === editDraft.id ? { ...editDraft, order: r.order } : r));
    const ok = await persistStaff(merged);
    if (!ok) return;
    staffSnapshotOnEditOpen.current = null;
    setEditingKey(null);
    setEditDraft(null);
    setTitleOtherMode(false);
  };

  const removeRow = async (id: string) => {
    if (guardEditingLock()) return;
    if (!window.confirm("이 운영진 항목을 삭제할까요?")) return;
    const next = staff.filter((r) => r.id !== id);
    await persistStaff(next);
  };

  const moveRowInList = (id: string, dir: -1 | 1) => {
    setStaff((prev) => reorderStaffInPlace(prev, id, dir));
  };

  if (!tid) return null;

  const sorted = sortStaff(staff);
  const sel = editDraft ? (titleOtherMode ? TITLE_SELECT_OTHER : titleSelectValue(editDraft.title)) : "";

  return (
    <section
      className={cn(
        "relative rounded-2xl border p-4 sm:p-5",
        dark ? "border-slate-600/80 bg-slate-800/30 text-slate-100" : "border-gray-200 bg-white/95 text-gray-900"
      )}
      aria-label="운영진 소개 관리"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className={cn("text-sm font-semibold tracking-tight", dark ? "text-slate-100" : "text-gray-900")}>
            운영진 소개 관리
          </h3>
          <p className={cn("mt-1 max-w-xl text-xs leading-relaxed", dark ? "text-slate-400" : "text-gray-500")}>
            대표(회장) 카드와 별도입니다. 목록에서 수정·삭제하고, 추가는 필요할 때만 펼칩니다.
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {sorted.length === 0 && editingKey !== "new" ? (
          <div
            className={cn(
              "rounded-xl border border-dashed px-4 py-8 text-center",
              dark ? "border-slate-600 text-slate-400" : "border-gray-200 text-gray-500"
            )}
          >
            <p className="text-sm">등록된 공개 운영진이 없어요.</p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className={cn("mt-4 gap-1 text-xs", dark ? "border-slate-500 text-slate-100 hover:bg-slate-700" : "")}
              disabled={busy}
              onClick={beginAdd}
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
              운영진 추가
            </Button>
          </div>
        ) : sorted.length > 0 ? (
          <ul className="space-y-2" aria-label="운영진 목록">
            {sorted.map((r) => (
              <li key={r.id}>
                {editingKey === r.id && editDraft ? (
                  <div
                    className={cn(
                      "rounded-xl border p-3 sm:p-4",
                      dark ? "border-violet-500/40 bg-slate-900/50" : "border-indigo-200 bg-indigo-50/50"
                    )}
                  >
                    <p className={cn("mb-3 text-xs font-medium", dark ? "text-violet-200" : "text-indigo-900")}>
                      운영진 수정
                    </p>
                    <StaffEditorForm
                      dark={dark}
                      busy={busy}
                      photoBusy={photoBusyId === editDraft.id}
                      draft={editDraft}
                      sel={sel}
                      titleOtherMode={titleOtherMode}
                      onTitleSelectChange={onTitleSelectChange}
                      patchDraft={patchDraft}
                      onPhoto={onPhoto}
                      onMoveUp={() => moveRowInList(r.id, -1)}
                      onMoveDown={() => moveRowInList(r.id, 1)}
                      disableMoveUp={sorted.findIndex((x) => x.id === r.id) <= 0}
                      disableMoveDown={sorted.findIndex((x) => x.id === r.id) >= sorted.length - 1}
                    />
                    <div className="mt-4 flex flex-wrap justify-end gap-2 border-t pt-3 border-inherit">
                      <Button type="button" size="sm" variant="outline" disabled={busy} onClick={cancelEdit} className="gap-1 text-xs">
                        <X className="h-3.5 w-3.5" aria-hidden />
                        취소
                      </Button>
                      <Button type="button" size="sm" disabled={busy} className="gap-1.5 text-xs font-semibold" onClick={() => void saveEdit()}>
                        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Save className="h-3.5 w-3.5" aria-hidden />}
                        저장
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    className={cn(
                      "flex flex-wrap items-center gap-3 rounded-xl border px-3 py-2.5 sm:px-4",
                      dark ? "border-slate-600/80 bg-slate-900/35" : "border-gray-100 bg-gray-50/90"
                    )}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      {r.photoUrl ? (
                        <img
                          src={r.photoUrl}
                          alt=""
                          className={cn(
                            "h-10 w-10 shrink-0 rounded-full object-cover ring-2 ring-offset-1",
                            dark ? "ring-slate-600 ring-offset-slate-900" : "ring-gray-200 ring-offset-white"
                          )}
                        />
                      ) : (
                        <div
                          className={cn(
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ring-2 ring-offset-1",
                            dark
                              ? "bg-slate-700 text-slate-100 ring-slate-600 ring-offset-slate-900"
                              : "bg-indigo-100 text-indigo-800 ring-indigo-200 ring-offset-white"
                          )}
                          aria-hidden
                        >
                          {r.name.trim().slice(0, 1) || "?"}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                          <span className={cn("truncate text-sm font-semibold", dark ? "text-slate-50" : "text-gray-900")}>
                            {r.name}
                          </span>
                          <span
                            className={cn(
                              "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
                              dark ? "bg-slate-700 text-slate-200" : "bg-gray-200 text-gray-800"
                            )}
                          >
                            {r.title}
                          </span>
                          {!r.visible ? (
                            <span
                              className={cn(
                                "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
                                dark ? "bg-amber-900/50 text-amber-100" : "bg-amber-100 text-amber-900"
                              )}
                            >
                              비공개
                            </span>
                          ) : null}
                        </div>
                        {r.intro?.trim() ? (
                          <p className={cn("mt-0.5 truncate text-xs", dark ? "text-slate-400" : "text-gray-500")}>{r.intro.trim()}</p>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-1.5 sm:ml-auto">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className={cn("h-8 gap-1 px-2.5 text-xs", dark ? "border-slate-500 text-slate-100" : "")}
                        disabled={busy || editingLocked}
                        onClick={() => beginEdit(r)}
                      >
                        <Pencil className="h-3 w-3" aria-hidden />
                        수정
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-8 gap-1 px-2.5 text-xs text-red-600 hover:text-red-700"
                        disabled={busy || editingLocked}
                        onClick={() => void removeRow(r.id)}
                      >
                        <Trash2 className="h-3 w-3" aria-hidden />
                        삭제
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : null}

        {editingKey === "new" && editDraft ? (
          <div
            className={cn(
              "rounded-xl border p-3 sm:p-4",
              dark ? "border-violet-500/40 bg-slate-900/50" : "border-indigo-200 bg-indigo-50/50"
            )}
          >
            <p className={cn("mb-3 text-xs font-medium", dark ? "text-violet-200" : "text-indigo-900")}>신규 운영진 등록</p>
            <StaffEditorForm
              dark={dark}
              busy={busy}
              photoBusy={photoBusyId === editDraft.id}
              draft={editDraft}
              sel={sel}
              titleOtherMode={titleOtherMode}
              onTitleSelectChange={onTitleSelectChange}
              patchDraft={patchDraft}
              onPhoto={onPhoto}
              onMoveUp={() => {}}
              onMoveDown={() => {}}
              disableMoveUp
              disableMoveDown
              hideReorder
            />
            <div className="mt-4 flex flex-wrap justify-end gap-2 border-t pt-3 border-inherit">
              <Button type="button" size="sm" variant="outline" disabled={busy} onClick={cancelEdit} className="gap-1 text-xs">
                <X className="h-3.5 w-3.5" aria-hidden />
                취소
              </Button>
              <Button type="button" size="sm" disabled={busy} className="gap-1.5 text-xs font-semibold" onClick={() => void saveEdit()}>
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Save className="h-3.5 w-3.5" aria-hidden />}
                저장
              </Button>
            </div>
          </div>
        ) : null}

        {sorted.length > 0 ? (
          <div className="pt-1">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy || editingLocked || staff.length >= MAX_STAFF}
              className={cn("w-full gap-1 text-xs sm:w-auto", dark ? "border-slate-500 text-slate-100 hover:bg-slate-700" : "")}
              onClick={beginAdd}
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
              운영진 추가
            </Button>
          </div>
        ) : null}
      </div>
    </section>
  );
}

type StaffEditorFormProps = {
  dark: boolean;
  busy: boolean;
  photoBusy: boolean;
  draft: TeamPublicStaffMember;
  sel: string;
  titleOtherMode: boolean;
  onTitleSelectChange: (value: string, prevTitle: string) => void;
  patchDraft: (p: Partial<TeamPublicStaffMember>) => void;
  onPhoto: (files: FileList | null) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  disableMoveUp: boolean;
  disableMoveDown: boolean;
  hideReorder?: boolean;
};

function StaffEditorForm({
  dark,
  busy,
  photoBusy,
  draft,
  sel,
  titleOtherMode,
  onTitleSelectChange,
  patchDraft,
  onPhoto,
  onMoveUp,
  onMoveDown,
  disableMoveUp,
  disableMoveDown,
  hideReorder,
}: StaffEditorFormProps) {
  return (
    <div className="flex flex-wrap items-start gap-3">
      {!hideReorder ? (
        <div className="flex flex-col gap-1 pt-1">
          <Button type="button" size="icon" variant="ghost" className="h-8 w-8" disabled={busy || disableMoveUp} onClick={onMoveUp} aria-label="목록에서 위로">
            <ArrowUp className="h-4 w-4" aria-hidden />
          </Button>
          <Button type="button" size="icon" variant="ghost" className="h-8 w-8" disabled={busy || disableMoveDown} onClick={onMoveDown} aria-label="목록에서 아래로">
            <ArrowDown className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      ) : null}
      <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <div>
            <Label className={cn("text-xs", dark ? "text-slate-300" : "")}>이름</Label>
            <Input
              className={cn("mt-1 h-9 text-sm", dark ? "border-slate-600 bg-slate-900 text-slate-100" : "")}
              value={draft.name}
              onChange={(e) => patchDraft({ name: e.target.value })}
              disabled={busy}
              maxLength={40}
            />
          </div>
          <div>
            <Label className={cn("text-xs", dark ? "text-slate-300" : "")}>직책</Label>
            <select
              className={selectBaseClass(dark)}
              value={sel}
              disabled={busy}
              onChange={(e) => onTitleSelectChange(e.target.value, draft.title)}
              aria-label="직책 프리셋"
            >
              <option value="">직책 선택</option>
              {STAFF_POSITION_PRESETS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
              <option value={TITLE_SELECT_OTHER}>기타 (직접 입력)</option>
            </select>
            {sel === TITLE_SELECT_OTHER ? (
              <Input
                id="staff-title-other-input"
                className={cn("mt-2 h-9 text-sm", dark ? "border-slate-600 bg-slate-900 text-slate-100" : "")}
                value={draft.title}
                placeholder="직접 입력 (예: 홍보이사)"
                onChange={(e) => patchDraft({ title: e.target.value })}
                disabled={busy}
                maxLength={40}
                autoComplete="off"
              />
            ) : null}
          </div>
          <div>
            <Label className={cn("text-xs", dark ? "text-slate-300" : "")}>한 줄 소개</Label>
            <Input
              className={cn("mt-1 h-9 text-sm", dark ? "border-slate-600 bg-slate-900 text-slate-100" : "")}
              value={draft.intro ?? ""}
              onChange={(e) => patchDraft({ intro: e.target.value })}
              disabled={busy}
              maxLength={200}
            />
          </div>
        </div>
        <div className="flex flex-col gap-4 sm:items-end">
          <div className="flex w-full max-w-xs items-center justify-between gap-3 sm:max-w-none">
            <Label htmlFor={`vis-edit-${draft.id}`} className={cn("text-xs font-medium", dark ? "text-slate-200" : "text-gray-800")}>
              공개 페이지에 표시
            </Label>
            <Switch
              id={`vis-edit-${draft.id}`}
              checked={draft.visible}
              disabled={busy}
              onCheckedChange={(c) => patchDraft({ visible: c })}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              id={`photo-edit-${draft.id}`}
              disabled={busy}
              onChange={(e) => void onPhoto(e.target.files)}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              className={cn("gap-1 text-xs", dark ? "border-slate-500 text-slate-100" : "")}
              disabled={busy || photoBusy}
              onClick={() => document.getElementById(`photo-edit-${draft.id}`)?.click()}
              title="가운데 기준 1:1로 잘라 올립니다."
            >
              {photoBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <ImagePlus className="h-3.5 w-3.5" aria-hidden />}
              사진 (1:1)
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
