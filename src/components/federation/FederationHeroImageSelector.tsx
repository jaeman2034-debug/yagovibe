/**
 * 협회 생성 시 Hero 대표 이미지 선택
 * - 드래그 업로드
 * - 템플릿 선택
 * - 선택 안 하면 sport 기반 기본 이미지 자동 적용
 */

import { useState, useRef, useEffect } from "react";
import { Image, Upload } from "lucide-react";

const HERO_TEMPLATES = [
  { id: "football", label: "축구", url: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&q=80" },
  { id: "stadium", label: "경기장", url: "https://images.unsplash.com/photo-1543326727-cf6c39e8f84c?w=800&q=80" },
  { id: "team", label: "팀", url: "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=800&q=80" },
  { id: "trophy", label: "트로피", url: "https://images.unsplash.com/photo-1511204338744-5df0d72182d3?w=800&q=80" },
  { id: "basketball", label: "농구", url: "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&q=80" },
  { id: "action", label: "경기 중", url: "https://images.unsplash.com/photo-1529900742904-029cd2c0a75c?w=800&q=80" },
] as const;

export type HeroImageValue = string | File | null;

interface FederationHeroImageSelectorProps {
  value: HeroImageValue;
  onChange: (val: HeroImageValue) => void;
}

function isFile(val: HeroImageValue): val is File {
  return val instanceof File;
}

function usePreviewUrl(val: HeroImageValue): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!val) {
      setUrl(null);
      return;
    }
    if (typeof val === "string") {
      setUrl(val);
      return;
    }
    const blobUrl = URL.createObjectURL(val);
    setUrl(blobUrl);
    return () => URL.revokeObjectURL(blobUrl);
  }, [val]);
  return url;
}

export function FederationHeroImageSelector({ value, onChange }: FederationHeroImageSelectorProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewUrl = usePreviewUrl(value);

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    onChange(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        대표 이미지 선택
      </label>
      <p className="text-xs text-gray-500 mb-3">
        드래그 업로드·템플릿 선택·미선택 시 종목별 기본 이미지가 적용됩니다.
      </p>

      {/* 드래그 업로드 영역 */}
      <div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors mb-4 ${
          isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        {previewUrl ? (
          <div className="relative">
            <img
              src={previewUrl}
              alt="미리보기"
              className="rounded-lg h-28 object-cover mx-auto"
            />
            <span className="mt-2 block text-xs text-gray-600">
              {isFile(value) ? value.name : "템플릿 선택됨"} · 클릭하여 변경
            </span>
          </div>
        ) : (
          <div className="py-4">
            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">
              이미지를 여기로 드래그하거나 클릭해서 업로드
            </p>
          </div>
        )}
      </div>

      {/* 템플릿 선택 */}
      <div className="border-t border-gray-100 pt-4">
        <p className="text-xs text-gray-500 mb-2">또는 기본 이미지 선택</p>
        <div className="grid grid-cols-3 gap-2">
          {HERO_TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onChange(value === t.url ? null : t.url)}
              className={`relative aspect-video rounded-lg overflow-hidden border-2 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
                value === t.url
                  ? "border-blue-600 ring-2 ring-blue-200"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <img src={t.url} alt={t.label} className="w-full h-full object-cover" />
              <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs py-1 px-2 truncate">
                {t.label}
              </span>
              {value === t.url && (
                <span className="absolute top-1 right-1 w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
                  <Image className="w-3 h-3 text-white" />
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {value && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="mt-2 text-xs text-gray-500 hover:text-gray-700 underline"
        >
          선택 해제 (종목 기본 이미지 사용)
        </button>
      )}
    </div>
  );
}
