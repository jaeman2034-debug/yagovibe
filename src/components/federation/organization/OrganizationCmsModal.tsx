/**
 * 협회 조직 구성 CMS — 임원별 사진·프로필 편집
 * DnD · 원형 크롭 · 600×600/≤100KB · 즉시 Storage+Firestore 반영
 */
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { OrganizationMemberPhoto } from "@/components/federation/organization/OrganizationMemberCard";
import { OrganizationPhotoCropPanel } from "@/components/federation/organization/OrganizationPhotoCropPanel";
import { NOWON_ORG_DEPARTMENT_ORDER } from "@/lib/federation/nowonOrganizationCatalog";
import { resolveOrganizationMembers } from "@/lib/federation/resolveFederationOrganization";
import { resolveExecutivePhotoSources, isRemoteExecutivePhoto } from "@/lib/federation/resolveExecutiveLocalPhoto";
import {
  FEDERATION_ORG_PHOTO_ACCEPT,
  assertFederationOrgPhotoFile,
  deleteFederationOrganizationPhoto,
  uploadFederationOrganizationPhoto,
} from "@/lib/federation/uploadFederationOrganizationPhoto";
import {
  clearFederationExecutivePhoto,
  upsertFederationExecutive,
} from "@/services/federationService";
import type {
  FederationOrganizationMember,
  LegacyFederationExecutive,
} from "@/types/federationOrganization";

export type OrganizationCmsExecutive = LegacyFederationExecutive & {
  name: string;
  role: string;
};

function departmentLabel(department: string): string {
  return NOWON_ORG_DEPARTMENT_ORDER.find((d) => d.id === department)?.title || department || "";
}

function memberToExecutive(m: FederationOrganizationMember): OrganizationCmsExecutive {
  return {
    id: m.id,
    name: m.name,
    role: m.position,
    position: m.position,
    department: m.department,
    photo: m.photo ?? null,
    description: m.description ?? null,
    duties: m.duties ?? null,
    email: m.email ?? null,
    phone: m.phone ?? null,
    career: m.career ?? null,
    order: m.order,
  };
}

function withResolvedPhotos(
  m: FederationOrganizationMember,
  firestorePhoto: string | null
): FederationOrganizationMember {
  const sources = resolveExecutivePhotoSources({
    position: m.position,
    name: m.name,
    firestorePhoto,
  });
  return {
    ...m,
    photo: sources[0] ?? null,
    photoSources: sources,
  };
}

export function OrganizationCmsModal({
  open,
  onClose,
  federationSlug,
  initial,
  initialOrgSummary,
  chairpersonPhotoUrl,
  saving,
  onSave,
  onSynced,
}: {
  open: boolean;
  onClose: () => void;
  federationSlug: string;
  initial: OrganizationCmsExecutive[];
  initialOrgSummary: string;
  chairpersonPhotoUrl?: string | null;
  saving: boolean;
  onSave: (payload: {
    executives: OrganizationCmsExecutive[];
    organizationSummary: string;
  }) => Promise<void>;
  onSynced?: () => void | Promise<void>;
}) {
  const [orgSummary, setOrgSummary] = useState(initialOrgSummary);
  const [rows, setRows] = useState<FederationOrganizationMember[]>([]);
  const [draft, setDraft] = useState<FederationOrganizationMember | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [memberSaving, setMemberSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setOrgSummary(initialOrgSummary);
    setRows(
      resolveOrganizationMembers({
        federationSlug,
        executives: initial,
        chairpersonPhotoUrl,
      })
    );
  }, [open, initial, initialOrgSummary, federationSlug, chairpersonPhotoUrl]);

  useEffect(() => {
    if (open) {
      setDraft(null);
      setCropFile(null);
    }
  }, [open]);

  const openEdit = (m: FederationOrganizationMember) => {
    setCropFile(null);
    setDraft({ ...m });
  };

  const closeEdit = () => {
    setDraft(null);
    setCropFile(null);
  };

  const patchDraft = (patch: Partial<FederationOrganizationMember>) => {
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  const applyMemberLocal = (next: FederationOrganizationMember) => {
    setDraft(next);
    setRows((prev) => prev.map((r) => (r.id === next.id ? next : r)));
  };

  const beginCrop = (file: File) => {
    try {
      assertFederationOrgPhotoFile(file);
      setCropFile(file);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "이미지를 확인할 수 없습니다.");
    }
  };

  const onPickPhoto = (files: FileList | null) => {
    const file = files?.[0];
    if (!file || !draft) return;
    beginCrop(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onCropConfirm = async (blob: Blob) => {
    if (!draft) return;
    setPhotoBusy(true);
    const t = toast.loading("사진을 업로드하는 중…");
    try {
      const url = await uploadFederationOrganizationPhoto({
        federationId: federationSlug,
        memberId: draft.id,
        blob,
      });
      const next = withResolvedPhotos({ ...draft, photo: url }, url);
      applyMemberLocal(next);
      await upsertFederationExecutive(federationSlug, {
        ...memberToExecutive(next),
        id: next.id,
        photo: url,
      });
      setCropFile(null);
      toast.dismiss(t);
      toast.success("사진을 저장했습니다. 홈페이지에 바로 반영됩니다.");
      await onSynced?.();
    } catch (e: unknown) {
      toast.dismiss(t);
      toast.error(e instanceof Error ? e.message : "사진 업로드에 실패했습니다.");
    } finally {
      setPhotoBusy(false);
    }
  };

  const onDeletePhoto = async () => {
    if (!draft) return;
    if (!window.confirm("CMS에 올린 사진을 삭제할까요?\n(폴더 기본 사진이 있으면 그것으로 표시됩니다.)")) {
      return;
    }
    setPhotoBusy(true);
    const t = toast.loading("사진을 삭제하는 중…");
    try {
      await deleteFederationOrganizationPhoto({
        federationId: federationSlug,
        memberId: draft.id,
      });
      await clearFederationExecutivePhoto(federationSlug, draft.id);
      const next = withResolvedPhotos({ ...draft }, null);
      applyMemberLocal(next);
      toast.dismiss(t);
      toast.success("사진을 삭제했습니다.");
      await onSynced?.();
    } catch (e) {
      console.error(e);
      toast.dismiss(t);
      toast.error("사진 삭제에 실패했습니다.");
    } finally {
      setPhotoBusy(false);
    }
  };

  const saveMember = async () => {
    if (!draft) return;
    if (!draft.name.trim() || !draft.position.trim()) {
      toast.error("이름과 직책은 비울 수 없습니다.");
      return;
    }
    if (cropFile) {
      toast.error("사진 자르기를 먼저 확인하거나 취소해 주세요.");
      return;
    }
    setMemberSaving(true);
    try {
      const remotePhoto = isRemoteExecutivePhoto(draft.photo) ? draft.photo : null;
      await upsertFederationExecutive(federationSlug, {
        ...memberToExecutive(draft),
        id: draft.id,
        photo: remotePhoto,
      });
      setRows((prev) => prev.map((r) => (r.id === draft.id ? draft : r)));
      toast.success("임원 정보를 저장했습니다.");
      closeEdit();
      await onSynced?.();
    } catch (e) {
      console.error(e);
      toast.error("저장에 실패했습니다.");
    } finally {
      setMemberSaving(false);
    }
  };

  if (!open) return null;

  const hasCmsPhoto = draft ? isRemoteExecutivePhoto(draft.photo) : false;

  const sortedRows = [...rows].sort((a, b) => {
    const orderById = new Map(NOWON_ORG_DEPARTMENT_ORDER.map((d, i) => [d.id, i]));
    const da = orderById.get(a.department) ?? 999;
    const db = orderById.get(b.department) ?? 999;
    if (da !== db) return da - db;
    return (a.order || 0) - (b.order || 0);
  });

  return (
    <div className="fixed inset-0 z-[1300] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="닫기"
        onClick={onClose}
      />
      <div
        className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-white shadow-xl"
        role="dialog"
        aria-modal="true"
      >
        <div className="border-b border-gray-100 px-6 py-4">
          <h3 className="text-lg font-semibold">
            {draft ? `${draft.name || "임원"} 수정` : "조직 구성 수정"}
          </h3>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {draft ? (
            <div className="space-y-4">
              {cropFile ? (
                <OrganizationPhotoCropPanel
                  file={cropFile}
                  busy={photoBusy}
                  onCancel={() => setCropFile(null)}
                  onConfirm={onCropConfirm}
                />
              ) : (
                <>
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-28 w-28 overflow-hidden rounded-full bg-gray-100 ring-2 ring-gray-100">
                      <OrganizationMemberPhoto member={draft} />
                    </div>
                    <p className="text-sm font-medium text-gray-900">{draft.name}</p>
                  </div>

                  <div
                    role="button"
                    tabIndex={0}
                    className={`rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors ${
                      dragOver
                        ? "border-slate-700 bg-slate-50"
                        : "border-gray-300 bg-white hover:border-gray-400"
                    }`}
                    onDragEnter={(e) => {
                      e.preventDefault();
                      setDragOver(true);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOver(true);
                    }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOver(false);
                      onPickPhoto(e.dataTransfer.files);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
                    }}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <p className="text-sm font-medium text-gray-800">사진을 끌어다 놓으세요</p>
                    <p className="mt-1 text-xs text-gray-500">또는 클릭해서 사진 선택</p>
                    <p className="mt-2 text-xs text-gray-400">jpg · png · webp · 1:1 원형 크롭 · 600×600</p>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={FEDERATION_ORG_PHOTO_ACCEPT}
                    className="hidden"
                    onChange={(e) => onPickPhoto(e.target.files)}
                  />

                  <div className="flex flex-wrap justify-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={photoBusy || memberSaving}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      사진 변경
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={photoBusy || memberSaving || !hasCmsPhoto}
                      onClick={() => void onDeletePhoto()}
                    >
                      사진 삭제
                    </Button>
                  </div>
                </>
              )}

              <label className="block text-sm">
                <span className="mb-1 block font-medium text-gray-700">이름</span>
                <input
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  value={draft.name}
                  onChange={(e) => patchDraft({ name: e.target.value })}
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-gray-700">직책</span>
                <input
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  value={draft.position}
                  onChange={(e) => patchDraft({ position: e.target.value })}
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-gray-700">담당부서</span>
                <select
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  value={draft.department || ""}
                  onChange={(e) => patchDraft({ department: e.target.value })}
                >
                  <option value="">선택</option>
                  {NOWON_ORG_DEPARTMENT_ORDER.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title}
                    </option>
                  ))}
                </select>
                <span className="mt-1 block text-xs text-gray-500">
                  부서를 바꾸면 홈페이지 조직 카드 그룹이 함께 이동합니다.
                </span>
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-gray-700">순서 (order)</span>
                <input
                  type="number"
                  min={1}
                  step={1}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  value={Number.isFinite(draft.order) ? draft.order : 1}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    patchDraft({ order: Number.isFinite(n) ? n : 1 });
                  }}
                />
                <span className="mt-1 block text-xs text-gray-500">
                  같은 부서 안에서 숫자가 작을수록 위에 표시됩니다.
                </span>
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-gray-700">소개</span>
                <textarea
                  className="min-h-[72px] w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  value={draft.description || ""}
                  onChange={(e) => patchDraft({ description: e.target.value })}
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-gray-700">담당업무</span>
                <textarea
                  className="min-h-[72px] w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  value={draft.duties || ""}
                  onChange={(e) => patchDraft({ duties: e.target.value })}
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-gray-700">연락처</span>
                <input
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  value={draft.phone || ""}
                  onChange={(e) => patchDraft({ phone: e.target.value })}
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-gray-700">이메일</span>
                <input
                  type="email"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  value={draft.email || ""}
                  onChange={(e) => patchDraft({ email: e.target.value })}
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-gray-700">경력</span>
                <textarea
                  className="min-h-[72px] w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  value={draft.career || ""}
                  onChange={(e) => patchDraft({ career: e.target.value })}
                />
              </label>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">조직 운영 개요</label>
                <textarea
                  className="min-h-[100px] w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  placeholder="사무국·분과 역할 등 한두 문단으로 작성"
                  value={orgSummary}
                  onChange={(e) => setOrgSummary(e.target.value)}
                />
              </div>
              <p className="text-xs text-gray-500">임원을 선택해 사진·프로필을 수정하세요.</p>
              <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
                {sortedRows.map((m) => (
                  <li key={m.id} className="flex items-center gap-3 px-3 py-2.5">
                    <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full bg-gray-100">
                      <OrganizationMemberPhoto member={m} compact />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">{m.name}</p>
                      <p className="truncate text-xs text-gray-500">
                        {m.position}
                        {departmentLabel(m.department)
                          ? ` · ${departmentLabel(m.department)}`
                          : ""}
                      </p>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={() => openEdit(m)}>
                      수정
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
          {draft ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={closeEdit}
                disabled={memberSaving || photoBusy}
              >
                취소
              </Button>
              <Button
                type="button"
                onClick={() => void saveMember()}
                disabled={memberSaving || photoBusy}
              >
                {memberSaving ? "저장 중…" : "저장"}
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
                닫기
              </Button>
              <Button
                type="button"
                onClick={() =>
                  void onSave({
                    executives: rows.map(memberToExecutive),
                    organizationSummary: orgSummary.trim(),
                  })
                }
                disabled={saving}
              >
                {saving ? "저장 중…" : "전체 저장"}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
