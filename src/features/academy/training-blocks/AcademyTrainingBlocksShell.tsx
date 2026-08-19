import { Loader2, Plus } from "lucide-react";
import { normalizeMemberRole, type AcademyMemberRole } from "@/lib/team/academyMemberRole";
import {
  canArchiveTrainingBlocks,
  canManageTrainingBlocks,
} from "@/lib/academy/academyReadSelectors";
import { Button } from "@/components/ui/button";
import { useTrainingBlocksData } from "@/features/academy/training-blocks/useTrainingBlocksData";
import { useTrainingBlockActions } from "@/features/academy/training-blocks/mutations/useTrainingBlockActions";
import {
  TrainingBlockFormModal,
  type TrainingBlockFormValues,
} from "@/features/academy/training-blocks/TrainingBlockFormModal";
import type { TrainingBlockRow } from "@/features/academy/training-blocks/mutations/trainingBlockCallables";
import { useState } from "react";

type Props = {
  teamId: string;
  teamName?: string;
  viewerRole?: string;
};

const STATUS_LABEL: Record<string, string> = {
  draft: "초안",
  published: "게시됨",
  archived: "보관",
};

export function AcademyTrainingBlocksShell({ teamId, teamName, viewerRole }: Props) {
  const role = normalizeMemberRole(viewerRole) as AcademyMemberRole;
  const canManage = canManageTrainingBlocks(role);
  const canArchive = canArchiveTrainingBlocks(role);

  const { blocks, loading, error, refresh } = useTrainingBlocksData(teamId);
  const actions = useTrainingBlockActions({ refresh });

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editBlock, setEditBlock] = useState<TrainingBlockRow | null>(null);

  if (!canManage) {
    return (
      <p className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-4 text-sm text-gray-600">
        훈련 블록 라이브러리는 코치·운영진만 사용할 수 있습니다.
      </p>
    );
  }

  const saving = actions.pendingKey != null;

  async function handleSubmit(values: TrainingBlockFormValues) {
    if (formMode === "create") {
      await actions.createBlock({
        teamId,
        title: values.title.trim(),
        ...(values.description.trim() ? { description: values.description.trim() } : {}),
        ...(values.videoUrl.trim() ? { videoUrl: values.videoUrl.trim() } : {}),
        ...(values.coachNotes.trim() ? { coachNotes: values.coachNotes.trim() } : {}),
      });
    } else if (editBlock) {
      const patch: Record<string, unknown> = {
        title: values.title.trim(),
        description: values.description.trim() ? values.description.trim() : null,
        coachNotes: values.coachNotes.trim() ? values.coachNotes.trim() : null,
        videoUrl: values.videoUrl.trim() ? values.videoUrl.trim() : null,
      };
      if (values.publish && editBlock.status === "draft") {
        patch.status = "published";
      }
      await actions.updateBlock({
        teamId,
        blockId: editBlock.blockId,
        patch: patch as Parameters<typeof actions.updateBlock>[0]["patch"],
      });
    }
    setFormOpen(false);
    setEditBlock(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">훈련 블록</h2>
          <p className="mt-1 text-xs text-gray-500">
            {teamName ? `${teamName} · ` : ""}재사용 드릴 라이브러리 (S1 — 세션 연결은 S2)
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setFormMode("create");
            setEditBlock(null);
            setFormOpen(true);
          }}
        >
          <Plus className="mr-1 h-4 w-4" />
          블록 만들기
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          불러오는 중…
        </div>
      ) : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {!loading && blocks.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-4 text-sm text-gray-600">
          아직 훈련 블록이 없습니다. YouTube/Vimeo 링크로 첫 블록을 만들어 보세요.
        </p>
      ) : (
        <ul className="space-y-2">
          {blocks.map((b) => (
            <li
              key={b.blockId}
              className="rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-gray-900">{b.title}</p>
                  <p className="text-xs text-gray-500">
                    {STATUS_LABEL[b.status] ?? b.status}
                    {b.videoUrl ? " · 영상 있음" : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  {b.status !== "archived" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={saving}
                      onClick={() => {
                        setFormMode("edit");
                        setEditBlock(b);
                        setFormOpen(true);
                      }}
                    >
                      수정
                    </Button>
                  ) : null}
                  {canArchive && b.status !== "archived" ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={saving}
                      onClick={() => void actions.archiveBlock({ teamId, blockId: b.blockId })}
                    >
                      보관
                    </Button>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <TrainingBlockFormModal
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditBlock(null);
        }}
        mode={formMode}
        block={editBlock}
        saving={saving}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
