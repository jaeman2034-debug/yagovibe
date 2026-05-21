/**
 * 🔥 MediaUpload - 미디어 업로드 컴포넌트
 * 
 * 역할:
 * - Drag & Drop 업로드
 * - Multi file 업로드
 * - 진행률 표시
 */

import { useState, useRef, useCallback } from "react";
import { Upload, X, Image, Video, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { uploadMultipleMedia } from "@/services/mediaService";
import type { Media, MediaEntityType } from "@/types/media";
import { toast } from "sonner";

interface MediaUploadProps {
  entityType: MediaEntityType;
  entityId: string;
  uploadedBy: string;
  onUploadComplete?: (media: Media[]) => void;
  /** Storage/Firestore 권한 전 members/{uid} 복구 등 */
  onPrepareUpload?: () => Promise<void>;
  accept?: string; // "image/*" | "video/*" | "image/*,video/*"
  maxFiles?: number;
  maxFileSize?: number; // bytes
}

export function MediaUpload({
  entityType,
  entityId,
  uploadedBy,
  onUploadComplete,
  onPrepareUpload,
  accept = "image/*,video/*",
  maxFiles = 10,
  maxFileSize = 50 * 1024 * 1024, // 50MB
}: MediaUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<
    Record<string, number>
  >({});
  const [uploadedMedia, setUploadedMedia] = useState<Media[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFiles(Array.from(e.dataTransfer.files));
      }
    },
    []
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const handleFiles = (newFiles: File[]) => {
    // 파일 개수 제한
    const remainingSlots = maxFiles - files.length;
    if (remainingSlots <= 0) {
      toast.error(`최대 ${maxFiles}개까지만 업로드할 수 있습니다`);
      return;
    }

    const filesToAdd = newFiles.slice(0, remainingSlots);

    // 파일 크기 검증
    const invalidFiles = filesToAdd.filter(
      (file) => file.size > maxFileSize
    );
    if (invalidFiles.length > 0) {
      toast.error(
        `파일 크기는 ${(maxFileSize / 1024 / 1024).toFixed(0)}MB 이하여야 합니다`
      );
      return;
    }

    setFiles((prev) => [...prev, ...filesToAdd]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setUploadProgress((prev) => {
      const newProgress = { ...prev };
      delete newProgress[files[index].name];
      return newProgress;
    });
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      toast.error("업로드할 파일을 선택해주세요");
      return;
    }

    setUploading(true);
    setUploadProgress({});

    const runUpload = () =>
      uploadMultipleMedia(
        files,
        entityType,
        entityId,
        uploadedBy,
        (fileName, progress) => {
          setUploadProgress((prev) => ({
            ...prev,
            [fileName]: progress,
          }));
        }
      );

    const isPermissionError = (error: unknown) => {
      const code =
        error && typeof error === "object" && "code" in error
          ? String((error as { code?: string }).code)
          : "";
      return code.includes("storage/unauthorized") || code.includes("permission");
    };

    try {
      if (onPrepareUpload) {
        await onPrepareUpload();
      }
      let media: Media[];
      try {
        media = await runUpload();
      } catch (firstErr: unknown) {
        if (!onPrepareUpload || !isPermissionError(firstErr)) {
          throw firstErr;
        }
        await onPrepareUpload();
        media = await runUpload();
      }

      setUploadedMedia(media);
      setFiles([]);
      setUploadProgress({});
      toast.success(`${media.length}개 파일이 업로드되었습니다`);
      onUploadComplete?.(media);
    } catch (error: unknown) {
      const code =
        error && typeof error === "object" && "code" in error
          ? String((error as { code?: string }).code)
          : "";
      console.error("[MediaUpload] 업로드 실패:", { code, error });
      if (isPermissionError(error)) {
        const hint =
          code === "permission-denied"
            ? "팀 멤버십이 아직 반영되지 않았을 수 있어요. 잠시 후 다시 시도하거나 새로고침해 주세요."
            : "팀원으로 가입했는지 확인해 주세요.";
        toast.error(`업로드 권한이 없어요. ${hint}`);
      } else {
        toast.error("업로드 중 오류가 발생했습니다");
      }
    } finally {
      setUploading(false);
    }
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith("video/")) {
      return <Video className="w-5 h-5 text-blue-600" />;
    }
    return <Image className="w-5 h-5 text-green-600" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
  };

  return (
    <div className="space-y-4">
      {/* Drag & Drop 영역 */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center transition-colors
          ${
            dragActive
              ? "border-blue-500 bg-blue-50"
              : "border-gray-300 hover:border-gray-400"
          }
        `}
      >
        <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
        <p className="text-sm text-gray-600 mb-2">
          파일을 드래그하거나 클릭하여 업로드
        </p>
        <p className="text-xs text-gray-500 mb-4">
          이미지 또는 비디오 (최대 {maxFiles}개, 각 {formatFileSize(maxFileSize)})
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          파일 선택
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple
          onChange={handleFileInput}
          className="hidden"
        />
      </div>

      {/* 선택된 파일 목록 */}
      {files.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-3">
              {files.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                >
                  {getFileIcon(file)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(file.size)}
                    </p>
                    {uploadProgress[file.name] !== undefined && (
                      <Progress
                        value={uploadProgress[file.name]}
                        className="mt-2 h-1"
                      />
                    )}
                  </div>
                  {!uploading && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {!uploading && (
              <div className="mt-4 flex gap-2">
                <Button onClick={handleUpload} className="flex-1">
                  업로드
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setFiles([])}
                  disabled={uploading}
                >
                  모두 제거
                </Button>
              </div>
            )}

            {uploading && (
              <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-600">
                <Loader2 className="w-4 h-4 animate-spin" />
                업로드 중...
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 업로드 완료된 미디어 */}
      {uploadedMedia.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <p className="text-sm font-medium text-gray-900">
                업로드 완료 ({uploadedMedia.length}개)
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {uploadedMedia.map((media) => (
                <div
                  key={media.id}
                  className="relative aspect-square rounded-lg overflow-hidden bg-gray-100"
                >
                  {media.type === "photo" && media.thumbnailUrl ? (
                    <img
                      src={media.thumbnailUrl}
                      alt={media.title || media.fileName}
                      className="w-full h-full object-cover"
                    />
                  ) : media.type === "photo" ? (
                    <img
                      src={media.url}
                      alt={media.title || media.fileName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-200">
                      <Video className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
