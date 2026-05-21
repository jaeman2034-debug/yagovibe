/**
 * MediaGallery — 사진/영상 갤러리, 라이트박스, 운영자 관리 메뉴
 */

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Image,
  Video,
  Play,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  Upload,
  MoreVertical,
  Pencil,
  Trash2,
  Star,
  Loader2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  deleteMedia,
  getMediaByEntity,
  incrementMediaViewCount,
  updateMediaMetadata,
} from "@/services/mediaService";
import { setTeamCoverPhotoMetaCallable } from "@/lib/team/setTeamCoverPhotoMetaClient";
import type { Media, MediaType, MediaEntityType } from "@/types/media";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface MediaGalleryProps {
  entityType: MediaEntityType;
  entityId: string;
  showUpload?: boolean;
  onUploadClick?: () => void;
  canUpload?: boolean;
  onUploadPhoto?: () => void;
  onUploadVideo?: () => void;
  onUploadAny?: () => void;
  dark?: boolean;
  canManage?: boolean;
  onMediaChanged?: () => void;
}

export function MediaGallery({
  entityType,
  entityId,
  showUpload = false,
  onUploadClick,
  canUpload: canUploadProp,
  onUploadPhoto,
  onUploadVideo,
  onUploadAny,
  dark = false,
  canManage = false,
  onMediaChanged,
}: MediaGalleryProps) {
  const canUpload = canUploadProp ?? showUpload;
  const triggerAny = onUploadAny ?? onUploadClick;
  const [media, setMedia] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<MediaType | "all">("all");
  const [selectedMedia, setSelectedMedia] = useState<Media | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [editTarget, setEditTarget] = useState<Media | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [manageBusy, setManageBusy] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastMediaElementRef = useCallback((node: HTMLDivElement | null) => {
    if (loading) return;
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        /* lazy load hook */
      }
    });
    if (node) observerRef.current.observe(node);
  }, [loading]);

  const loadMedia = useCallback(async () => {
    try {
      setLoading(true);
      const mediaData = await getMediaByEntity(entityType, entityId);
      setMedia(mediaData);
    } catch (error) {
      console.error("[MediaGallery] 조회 실패:", error);
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId]);

  useEffect(() => {
    void loadMedia();
  }, [loadMedia]);

  const refreshGallery = useCallback(async () => {
    await loadMedia();
    onMediaChanged?.();
  }, [loadMedia, onMediaChanged]);

  const openEdit = (item: Media) => {
    setEditTarget(item);
    setEditTitle(item.title ?? "");
    setEditDescription(item.description ?? "");
  };

  const saveEdit = async () => {
    if (!editTarget) return;
    setManageBusy(true);
    try {
      await updateMediaMetadata(editTarget.id, {
        title: editTitle.trim() || undefined,
        description: editDescription.trim() || undefined,
      });
      toast.success("저장했어요.");
      setEditTarget(null);
      await refreshGallery();
    } catch (e) {
      console.error("[MediaGallery] saveEdit", e);
      toast.error("저장에 실패했어요.");
    } finally {
      setManageBusy(false);
    }
  };

  const handleDelete = async (item: Media) => {
    if (!window.confirm("이 미디어를 삭제할까요?")) return;
    setManageBusy(true);
    try {
      await deleteMedia(item.id);
      toast.success("삭제했어요.");
      await refreshGallery();
    } catch (e) {
      console.error("[MediaGallery] delete", e);
      toast.error("삭제에 실패했어요.");
    } finally {
      setManageBusy(false);
    }
  };

  const handleSetCover = async (item: Media) => {
    if (entityType !== "team" || item.type !== "photo") return;
    setManageBusy(true);
    try {
      await setTeamCoverPhotoMetaCallable({ teamId: entityId, coverPhotoUrl: item.url });
      toast.success("대표 사진으로 설정했어요.");
    } catch (e) {
      console.error("[MediaGallery] setCover", e);
      toast.error("대표 사진 설정에 실패했어요.");
    } finally {
      setManageBusy(false);
    }
  };

  const filteredMedia = filter === "all" ? media : media.filter((m) => m.type === filter);
  const photos = filteredMedia.filter((m) => m.type === "photo");
  const videos = filteredMedia.filter((m) => m.type === "video");

  const handleMediaClick = async (mediaItem: Media, index: number) => {
    setSelectedMedia(mediaItem);
    setCurrentIndex(index);
    await incrementMediaViewCount(mediaItem.id);
  };

  const closeLightbox = () => {
    setSelectedMedia(null);
    setCurrentIndex(0);
  };

  const navigateLightbox = (direction: "prev" | "next") => {
    if (filteredMedia.length === 0) return;
    let newIndex = currentIndex;
    if (direction === "prev") {
      newIndex = currentIndex > 0 ? currentIndex - 1 : filteredMedia.length - 1;
    } else {
      newIndex = currentIndex < filteredMedia.length - 1 ? currentIndex + 1 : 0;
    }
    setCurrentIndex(newIndex);
    setSelectedMedia(filteredMedia[newIndex]);
    incrementMediaViewCount(filteredMedia[newIndex].id);
  };

  useEffect(() => {
    if (!selectedMedia) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      else if (e.key === "ArrowLeft") navigateLightbox("prev");
      else if (e.key === "ArrowRight") navigateLightbox("next");
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedMedia, currentIndex, filteredMedia]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <GalleryLoader />
        </CardContent>
      </Card>
    );
  }

  if (media.length === 0) {
    return (
      <EmptyGalleryState
        dark={dark}
        canUpload={canUpload}
        onUploadPhoto={onUploadPhoto}
        onUploadVideo={onUploadVideo}
        triggerAny={triggerAny}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button variant={filter === "all" ? "default" : "outline"} size="sm" onClick={() => setFilter("all")}>
            전체 ({media.length})
          </Button>
          <Button variant={filter === "photo" ? "default" : "outline"} size="sm" onClick={() => setFilter("photo")}>
            <Image className="mr-1 h-4 w-4" />
            사진 ({photos.length})
          </Button>
          <Button variant={filter === "video" ? "default" : "outline"} size="sm" onClick={() => setFilter("video")}>
            <Video className="mr-1 h-4 w-4" />
            영상 ({videos.length})
          </Button>
        </div>
        {canUpload ? (
          <GalleryUploadToolbar
            onUploadPhoto={onUploadPhoto}
            onUploadVideo={onUploadVideo}
            triggerAny={triggerAny}
          />
        ) : null}
      </div>

      {(filter === "all" || filter === "photo") && photos.length > 0 ? (
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700">
            <Image className="h-4 w-4" />
            사진 ({photos.length})
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {photos.map((photo, index) => {
              const photoIndex = filteredMedia.findIndex((m) => m.id === photo.id);
              return (
                <PhotoTile
                  key={photo.id}
                  photo={photo}
                  index={index}
                  photosLength={photos.length}
                  lastMediaElementRef={lastMediaElementRef}
                  canManage={canManage}
                  manageBusy={manageBusy}
                  onOpen={() => void handleMediaClick(photo, photoIndex)}
                  onEdit={() => openEdit(photo)}
                  onSetCover={() => void handleSetCover(photo)}
                  onDelete={() => void handleDelete(photo)}
                />
              );
            })}
          </div>
        </div>
      ) : null}

      {(filter === "all" || filter === "video") && videos.length > 0 ? (
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700">
            <Video className="h-4 w-4" />
            영상 ({videos.length})
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            {videos.map((video, index) => {
              const videoIndex = filteredMedia.findIndex((m) => m.id === video.id);
              return (
                <GalleryVideoCard
                  key={video.id}
                  video={video}
                  index={index}
                  videosLength={videos.length}
                  lastMediaElementRef={lastMediaElementRef}
                  canManage={canManage}
                  manageBusy={manageBusy}
                  onOpen={() => void handleMediaClick(video, videoIndex)}
                  onEdit={() => openEdit(video)}
                  onDelete={() => void handleDelete(video)}
                />
              );
            })}
          </div>
        </div>
      ) : null}

      <Dialog open={editTarget != null} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>미디어 설명 편집</DialogTitle>
            <DialogDescription>제목·설명은 공개 갤러리와 라이트박스에 표시됩니다.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="media-edit-title">제목</Label>
              <Input
                id="media-edit-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="선택"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="media-edit-desc">설명</Label>
              <Textarea
                id="media-edit-desc"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
                placeholder="활동 메모"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditTarget(null)}>
              취소
            </Button>
            <Button type="button" disabled={manageBusy} onClick={() => void saveEdit()}>
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {selectedMedia ? (
        <MediaLightbox
          item={selectedMedia}
          currentIndex={currentIndex}
          totalCount={filteredMedia.length}
          hasMultiple={filteredMedia.length > 1}
          onClose={closeLightbox}
          onPrev={() => navigateLightbox("prev")}
          onNext={() => navigateLightbox("next")}
        />
      ) : null}
    </div>
  );
}

function GalleryLoader() {
  return (
    <div className="flex items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
    </div>
  );
}

function EmptyGalleryState({
  dark,
  canUpload,
  onUploadPhoto,
  onUploadVideo,
  triggerAny,
}: {
  dark: boolean;
  canUpload: boolean;
  onUploadPhoto?: () => void;
  onUploadVideo?: () => void;
  triggerAny?: () => void;
}) {
  return (
    <div className="py-12 text-center">
      <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
        <Image className="h-8 w-8 text-gray-400" />
      </div>
      <h3 className="mb-2 text-lg font-semibold text-gray-900">업로드된 미디어가 없습니다</h3>
      <p className={cn("mb-6 text-sm", dark ? "text-slate-400" : "text-gray-600")}>
        {canUpload
          ? "첫 사진·영상을 올리면 팀 페이지가 더 생동감 있어 보여요."
          : "팀원이 올린 활동 사진·영상이 여기에 모여요."}
      </p>
      {canUpload ? (
        <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
          {onUploadPhoto ? (
            <Button type="button" className="gap-1.5" onClick={onUploadPhoto}>
              <Image className="h-4 w-4 shrink-0" aria-hidden />
              사진 업로드
            </Button>
          ) : null}
          {onUploadVideo ? (
            <Button type="button" variant="outline" className="gap-1.5" onClick={onUploadVideo}>
              <Video className="h-4 w-4 shrink-0" aria-hidden />
              영상 업로드
            </Button>
          ) : null}
          {triggerAny && !onUploadPhoto && !onUploadVideo ? (
            <Button type="button" onClick={triggerAny} className="gap-1.5">
              <Upload className="h-4 w-4 shrink-0" aria-hidden />
              첫 미디어 올리기
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function GalleryUploadToolbar({
  onUploadPhoto,
  onUploadVideo,
  triggerAny,
}: {
  onUploadPhoto?: () => void;
  onUploadVideo?: () => void;
  triggerAny?: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {onUploadPhoto ? (
        <Button type="button" size="sm" variant="outline" className="gap-1" onClick={onUploadPhoto}>
          <Image className="h-4 w-4" aria-hidden />
          사진
        </Button>
      ) : null}
      {onUploadVideo ? (
        <Button type="button" size="sm" variant="outline" className="gap-1" onClick={onUploadVideo}>
          <Video className="h-4 w-4" aria-hidden />
          영상
        </Button>
      ) : null}
      {triggerAny && !onUploadPhoto && !onUploadVideo ? (
        <Button type="button" size="sm" onClick={triggerAny}>
          업로드
        </Button>
      ) : null}
    </div>
  );
}

function PhotoTile({
  photo,
  index,
  photosLength,
  lastMediaElementRef,
  canManage,
  manageBusy,
  onOpen,
  onEdit,
  onSetCover,
  onDelete,
}: {
  photo: Media;
  index: number;
  photosLength: number;
  lastMediaElementRef: (node: HTMLDivElement | null) => void;
  canManage: boolean;
  manageBusy: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onSetCover: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      ref={index === photosLength - 1 ? lastMediaElementRef : null}
      className="group relative aspect-square cursor-pointer overflow-hidden rounded-lg bg-gray-100"
      onClick={onOpen}
    >
      <img
        src={photo.thumbnailUrl || photo.url}
        alt={photo.title || photo.fileName}
        className="h-full w-full object-cover transition-transform group-hover:scale-105"
        loading={index < 8 ? "eager" : "lazy"}
      />
      <PhotoHoverOverlay />
      {canManage ? (
        <MediaItemManageMenu
          busy={manageBusy}
          showSetCover
          onEdit={onEdit}
          onSetCover={onSetCover}
          onDelete={onDelete}
        />
      ) : null}
      {photo.viewCount != null && photo.viewCount > 0 ? (
        <div className="absolute top-2 right-2 flex items-center gap-1 rounded bg-black/60 px-2 py-1 text-xs text-white">
          <Eye className="h-3 w-3" />
          {photo.viewCount}
        </div>
      ) : null}
    </div>
  );
}

function PhotoHoverOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/20">
      <Eye className="h-6 w-6 text-white opacity-0 transition-opacity group-hover:opacity-100" />
    </div>
  );
}

function GalleryVideoCard({
  video,
  index,
  videosLength,
  lastMediaElementRef,
  canManage,
  manageBusy,
  onOpen,
  onEdit,
  onDelete,
}: {
  video: Media;
  index: number;
  videosLength: number;
  lastMediaElementRef: (node: HTMLDivElement | null) => void;
  canManage: boolean;
  manageBusy: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      ref={index === videosLength - 1 ? lastMediaElementRef : null}
      className="group relative aspect-video cursor-pointer overflow-hidden rounded-lg bg-gray-900"
      onClick={onOpen}
    >
      {video.thumbnailUrl ? (
        <img src={video.thumbnailUrl} alt={video.title || video.fileName} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <Video className="h-12 w-12 text-gray-400" />
        </div>
      )}
      <div className="absolute inset-0 flex items-center justify-center bg-black/40 transition-colors group-hover:bg-black/50">
        <Play className="h-12 w-12 text-white" />
      </div>
      {video.duration != null ? (
        <div className="absolute bottom-2 right-2 rounded bg-black/70 px-2 py-1 text-xs text-white">
          {formatDuration(video.duration)}
        </div>
      ) : null}
      {canManage ? (
        <MediaItemManageMenu
          busy={manageBusy}
          showSetCover={false}
          onEdit={onEdit}
          onSetCover={() => {}}
          onDelete={onDelete}
        />
      ) : null}
      {video.viewCount != null && video.viewCount > 0 ? (
        <div className="absolute top-2 right-2 flex items-center gap-1 rounded bg-black/60 px-2 py-1 text-xs text-white">
          <Eye className="h-3 w-3" />
          {video.viewCount}
        </div>
      ) : null}
    </div>
  );
}

function MediaLightbox({
  item,
  currentIndex,
  totalCount,
  hasMultiple,
  onClose,
  onPrev,
  onNext,
}: {
  item: Media;
  currentIndex: number;
  totalCount: number;
  hasMultiple: boolean;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4"
      onClick={onClose}
    >
      <div className="relative max-h-full w-full max-w-7xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-full p-2 text-white transition-colors hover:bg-white/10"
          aria-label="닫기"
        >
          <X className="h-6 w-6" />
        </button>
        {hasMultiple ? (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPrev();
              }}
              className="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-full p-3 text-white hover:bg-white/10"
              aria-label="이전"
            >
              <ChevronLeft className="h-8 w-8" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onNext();
              }}
              className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-full p-3 text-white hover:bg-white/10"
              aria-label="다음"
            >
              <ChevronRight className="h-8 w-8" />
            </button>
          </>
        ) : null}
        <LightboxMediaContent media={item} />
        {item.title || item.description ? (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-6 text-white">
            {item.title ? <p className="mb-1 text-lg font-medium">{item.title}</p> : null}
            {item.description ? <p className="text-sm text-gray-300">{item.description}</p> : null}
            <LightboxMeta currentIndex={currentIndex} totalCount={totalCount} viewCount={item.viewCount} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function LightboxMediaContent({ media }: { media: Media }) {
  return (
    <div className="flex h-full items-center justify-center" onClick={(e) => e.stopPropagation()}>
      {media.type === "photo" ? (
        <img
          src={media.url}
          alt={media.title || media.fileName}
          className="max-h-[90vh] max-w-full object-contain"
        />
      ) : (
        <video src={media.url} controls autoPlay className="max-h-[90vh] max-w-full" />
      )}
    </div>
  );
}

function LightboxMeta({
  currentIndex,
  totalCount,
  viewCount,
}: {
  currentIndex: number;
  totalCount: number;
  viewCount?: number;
}) {
  return (
    <div className="mt-3 flex items-center gap-4 text-xs text-gray-400">
      {viewCount !== undefined ? (
        <span className="flex items-center gap-1">
          <Eye className="h-4 w-4" />
          {viewCount}회 조회
        </span>
      ) : null}
      <span>
        {currentIndex + 1} / {totalCount}
      </span>
    </div>
  );
}

function MediaItemManageMenu({
  busy,
  showSetCover,
  onEdit,
  onSetCover,
  onDelete,
}: {
  busy: boolean;
  showSetCover: boolean;
  onEdit: () => void;
  onSetCover: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="absolute left-2 top-2 z-10" onClick={(e) => e.stopPropagation()}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            size="icon"
            variant="secondary"
            className="h-8 w-8 bg-white/90 shadow"
            disabled={busy}
            aria-label="미디어 관리"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={onEdit}>
            <Pencil className="mr-2 h-4 w-4" />
            설명 편집
          </DropdownMenuItem>
          {showSetCover ? (
            <DropdownMenuItem onClick={onSetCover}>
              <Star className="mr-2 h-4 w-4" />
              대표 사진으로
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={onDelete}>
            <Trash2 className="mr-2 h-4 w-4" />
            삭제
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
