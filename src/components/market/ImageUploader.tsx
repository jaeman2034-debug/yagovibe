/**
 * 🔥 이미지 업로더 컴포넌트 (프로덕션 배포 패키지)
 * 
 * 역할:
 * - 최소 1장 강제, 3장 권장
 * - 실시간 압축 및 품질 피드백
 * - 드래그 앤 드롭 지원
 * - 이미지 미리보기
 */

import { useState, useRef, useCallback } from "react";
import { processImagePipeline, type ImagePipelineResult } from "@/utils/imagePipeline";
import { useAuth } from "@/context/AuthProvider";

interface ImageUploaderProps {
  minImages?: number; // 최소 이미지 수 (기본: 1)
  maxImages?: number; // 최대 이미지 수 (기본: 5)
  recommendedImages?: number; // 권장 이미지 수 (기본: 3)
  onImagesChange: (images: ImagePipelineResult[]) => void;
  onPrimaryImageChange?: (index: number) => void; // 대표사진 변경 핸들러
  primaryImageIndex?: number; // 대표사진 인덱스
  disabled?: boolean;
}

export default function ImageUploader({
  minImages = 1,
  maxImages = 5,
  recommendedImages = 3,
  onImagesChange,
  onPrimaryImageChange,
  primaryImageIndex = 0,
  disabled = false,
}: ImageUploaderProps) {
  const { user } = useAuth();
  const [images, setImages] = useState<ImagePipelineResult[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // 🔥 이미지 추가
  const handleImageAdd = useCallback(
    async (files: FileList | File[]) => {
      if (!user) {
        alert("로그인이 필요합니다.");
        return;
      }

      const fileArray = Array.from(files);
      const remainingSlots = maxImages - images.length;

      if (fileArray.length > remainingSlots) {
        alert(`최대 ${maxImages}장까지 업로드할 수 있습니다.`);
        fileArray.splice(remainingSlots);
      }

      setUploading(true);

      try {
        // 🔥 임시 패치: 품질 분석 비활성화 (업로드 우선 보장)
        const newImages = await Promise.all(
          fileArray.map((file) => processImagePipeline(file, user.uid, { analyzeQuality: false }))
        );

        const updatedImages = [...images, ...newImages];
        setImages(updatedImages);
        onImagesChange(updatedImages);
      } catch (error: any) {
        // 🔥 업로드 실패만 에러로 처리 (품질 분석 실패는 processImagePipeline에서 조용히 처리됨)
        console.error("❌ 이미지 업로드 실패:", error);
        
        // 🔥 Storage 에러 코드별 명확한 메시지
        let errorMessage = "이미지 업로드에 실패했습니다.";
        if (error.code === "storage/unauthorized" || error.code === "storage/permission-denied") {
          errorMessage = "업로드 권한이 없습니다. 로그인 상태를 확인해주세요.";
        } else if (error.code === "storage/canceled") {
          errorMessage = "업로드가 취소되었습니다.";
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        alert(errorMessage);
      } finally {
        setUploading(false);
      }
    },
    [user, images, maxImages, onImagesChange]
  );

  // 🔥 이미지 삭제
  const handleImageRemove = useCallback(
    (index: number) => {
      const updatedImages = images.filter((_, i) => i !== index);
      setImages(updatedImages);
      onImagesChange(updatedImages);
    },
    [images, onImagesChange]
  );

  // 🔥 드래그 앤 드롭
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
        handleImageAdd(e.dataTransfer.files);
      }
    },
    [handleImageAdd]
  );

  // 🔥 파일 선택
  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        handleImageAdd(e.target.files);
      }
    },
    [handleImageAdd]
  );

  const canAddMore = images.length < maxImages;
  const hasMinimum = images.length >= minImages;
  const hasRecommended = images.length >= recommendedImages;

  return (
    <div className="space-y-4">
      {/* 📸 모바일 친화: 촬영/앨범 선택 버튼 */}
      <div className="flex items-center gap-2">
        {/* 카메라 촬영 전용 */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled || uploading || !canAddMore}
        />
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          className="px-3 py-1.5 text-sm rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition disabled:opacity-50"
          disabled={disabled || uploading || !canAddMore}
        >
          📷 촬영하기
        </button>

        {/* 갤러리 선택 전용 */}
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled || uploading || !canAddMore}
        />
        <button
          type="button"
          onClick={() => galleryInputRef.current?.click()}
          className="px-3 py-1.5 text-sm rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition disabled:opacity-50"
          disabled={disabled || uploading || !canAddMore}
        >
          🖼️ 앨범 선택
        </button>
      </div>

      {/* 🔥 이미지 업로드 영역 */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 transition-colors ${
          dragActive
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 hover:border-gray-400"
        } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !disabled && canAddMore && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled || !canAddMore}
        />

        <div className="text-center">
          {uploading ? (
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
              <p className="text-sm text-gray-600">이미지 업로드 중...</p>
            </div>
          ) : (
            <>
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <p className="mt-2 text-sm text-gray-600">
                <span className="font-semibold">클릭하거나 드래그</span>하여 이미지 업로드
              </p>
              <p className="text-xs text-gray-500 mt-1">
                최소 {minImages}장, 권장 {recommendedImages}장
                {maxImages < 10 && ` (최대 ${maxImages}장)`}
              </p>
            </>
          )}
        </div>
      </div>

      {/* 🔥 이미지 미리보기 */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {images.map((image, index) => (
            <div key={index} className="relative group">
              <img
                src={image.originalUrl}
                alt={`이미지 ${index + 1}`}
                className={`w-full h-32 object-cover rounded-lg ${
                  primaryImageIndex === index ? "ring-4 ring-blue-500" : ""
                }`}
              />
              
              {/* 🔥 대표사진 배지 */}
              {primaryImageIndex === index && (
                <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
                  대표사진
                </div>
              )}

              {/* 🔥 대표사진 선택 버튼 (여러 장일 때만) */}
              {images.length > 1 && primaryImageIndex !== index && (
                <button
                  type="button"
                  onClick={() => onPrimaryImageChange?.(index)}
                  className="absolute top-2 left-2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  disabled={disabled}
                >
                  대표로
                </button>
              )}

              <button
                type="button"
                onClick={() => handleImageRemove(index)}
                className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                disabled={disabled}
              >
                ×
              </button>

              {/* 🔥 품질 피드백 */}
              {image.quality.warnings.length > 0 && (
                <div className="absolute bottom-2 left-2 right-2 bg-yellow-500 text-white text-xs p-1 rounded">
                  ⚠️ {image.quality.warnings[0]}
                </div>
              )}
            </div>
          ))}

          {/* 🔥 추가 버튼 */}
          {canAddMore && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400 hover:border-blue-500 transition-colors"
              disabled={disabled || uploading}
            >
              + 추가
            </button>
          )}
        </div>
      )}

      {/* 🔥 상태 메시지 */}
      <div className="text-sm">
        {!hasMinimum && (
          <p className="text-red-600">
            ⚠️ 최소 {minImages}장의 이미지가 필요합니다. ({images.length}/{minImages})
          </p>
        )}
        {hasMinimum && !hasRecommended && (
          <p className="text-yellow-600">
            💡 {recommendedImages}장 이상의 이미지를 권장합니다. ({images.length}/{recommendedImages})
          </p>
        )}
        {hasRecommended && (
          <p className="text-green-600">
            ✅ 좋은 이미지 구성입니다! ({images.length}장)
          </p>
        )}
      </div>
    </div>
  );
}
