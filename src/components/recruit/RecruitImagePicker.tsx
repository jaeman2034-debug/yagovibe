import type { ChangeEvent } from "react";
import { Label } from "@/components/ui/label";

export type RecruitLocalImage = { file: File; previewUrl: string };

const DEFAULT_MAX = 5;

interface RecruitImagePickerProps {
  images: RecruitLocalImage[];
  onChange: (next: RecruitLocalImage[]) => void;
  disabled?: boolean;
  maxImages?: number;
  inputId?: string;
}

export function RecruitImagePicker({
  images,
  onChange,
  disabled,
  maxImages = DEFAULT_MAX,
  inputId = "recruit-create-images",
}: RecruitImagePickerProps) {
  const handleAdd = (e: ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList?.length) return;

    const incoming = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
    if (incoming.length === 0) {
      e.target.value = "";
      return;
    }

    const room = maxImages - images.length;
    if (room <= 0) {
      e.target.value = "";
      return;
    }

    const take = incoming.slice(0, room);
    const next = take.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    onChange([...images, ...next]);
    e.target.value = "";
  };

  const removeAt = (index: number) => {
    if (disabled) return;
    const target = images[index];
    if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
    onChange(images.filter((_, i) => i !== index));
  };

  return (
    <div>
      <Label htmlFor={inputId}>
        사진 <span className="text-red-500">*</span>
      </Label>
      <p className="mt-1 text-xs text-gray-500">
        첫 번째 사진이 대표(썸네일)로 쓰입니다. 최대 {maxImages}장 · JPG/PNG 등
      </p>

      <div className="mt-2 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-3">
        <label
          htmlFor={inputId}
          className={`flex h-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 ${
            disabled ? "pointer-events-none opacity-50" : ""
          }`}
        >
          <span>📷 이미지 추가하기</span>
          <span className="text-xs text-gray-500">
            {images.length}/{maxImages}
          </span>
        </label>
        <input
          id={inputId}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleAdd}
          disabled={disabled || images.length >= maxImages}
        />
      </div>

      {images.length > 0 ? (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {images.map((img, idx) => (
            <div key={`${img.previewUrl}-${idx}`} className="relative">
              <img
                src={img.previewUrl}
                alt={`모집 이미지 미리보기 ${idx + 1}`}
                className="h-24 w-full rounded-lg object-cover"
              />
              {idx === 0 ? (
                <span className="absolute left-1 top-1 rounded bg-blue-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  대표
                </span>
              ) : null}
              <button
                type="button"
                onClick={() => removeAt(idx)}
                className="absolute right-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white disabled:opacity-50"
                disabled={disabled}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-center text-xs text-gray-400">
          팀 사진·경기 장면·유니폼 등을 올리면 지원률이 올라갑니다.
        </p>
      )}
    </div>
  );
}
