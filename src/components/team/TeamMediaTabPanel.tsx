import { useCallback, useState } from "react";
import { toast } from "sonner";
import { MediaGallery } from "@/components/media/MediaGallery";
import { MediaUpload } from "@/components/media/MediaUpload";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { prepareTeamMediaUpload } from "@/lib/team/prepareTeamMediaUpload";

export type TeamMediaTabPanelProps = {
  teamId: string;
  /** 활성 팀원 또는 팀장(문서 SoT) */
  canUpload: boolean;
  /** 운영진·팀장 — 편집·삭제·대표사진 */
  canManage?: boolean;
  userId: string | null;
  dark?: boolean;
};

type UploadKind = "photo" | "video" | "any";

export function TeamMediaTabPanel({
  teamId,
  canUpload,
  canManage = false,
  userId,
  dark = false,
}: TeamMediaTabPanelProps) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadKind, setUploadKind] = useState<UploadKind>("any");

  const openUpload = useCallback(
    (kind: UploadKind) => {
      if (!canUpload) {
        toast.message("팀원만 미디어를 업로드할 수 있어요.", {
          description: "가입 후 다시 시도해 주세요.",
        });
        return;
      }
      if (!userId) {
        toast.error("로그인이 필요해요.");
        return;
      }
      setUploadKind(kind);
      setUploadOpen(true);
    },
    [canUpload, userId]
  );

  const accept =
    uploadKind === "photo"
      ? "image/*"
      : uploadKind === "video"
        ? "video/*"
        : "image/*,video/*";

  const uploadTitle =
    uploadKind === "photo"
      ? "사진 업로드"
      : uploadKind === "video"
        ? "영상 업로드"
        : "미디어 업로드";

  if (!teamId.trim()) {
    return (
      <p className={cn("py-8 text-center text-sm", dark ? "text-slate-400" : "text-gray-500")}>
        팀 정보를 불러오는 중이에요.
      </p>
    );
  }

  return (
    <>
      <MediaGallery
        key={refreshKey}
        entityType="team"
        entityId={teamId}
        canUpload={canUpload}
        canManage={canManage}
        onUploadPhoto={() => openUpload("photo")}
        onUploadVideo={() => openUpload("video")}
        onUploadAny={() => openUpload("any")}
        dark={dark}
      />

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{uploadTitle}</DialogTitle>
            <DialogDescription>
              팀 활동 사진·영상은 공개 팀 페이지 미디어 탭과 활동 피드에 활용할 수 있어요.
            </DialogDescription>
          </DialogHeader>
          {userId ? (
            <MediaUpload
              entityType="team"
              entityId={teamId}
              uploadedBy={userId}
              accept={accept}
              onPrepareUpload={async () => {
                await prepareTeamMediaUpload(teamId);
              }}
              onUploadComplete={() => {
                setUploadOpen(false);
                setRefreshKey((k) => k + 1);
                toast.success("업로드가 완료됐어요.");
              }}
            />
          ) : (
            <p className="text-sm text-gray-600">로그인 후 업로드할 수 있어요.</p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
