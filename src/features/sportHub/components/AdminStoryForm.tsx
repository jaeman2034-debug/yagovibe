/**
 * 🔥 AdminStoryForm - 스토리 등록/수정 폼
 */

import { useState } from "react";
import { defaultStoryForm, validateAdminForm } from "../domain/story.admin.form";
import type { AdminStoryForm } from "../domain/story.admin.form";

interface AdminStoryFormProps {
  onSubmit: (v: AdminStoryForm) => void;
  initialData?: Partial<AdminStoryForm>;
}

export default function AdminStoryForm({
  onSubmit,
  initialData,
}: AdminStoryFormProps) {
  const [form, setForm] = useState<AdminStoryForm>(() => {
    if (initialData) {
      return { ...defaultStoryForm(), ...initialData };
    }
    return defaultStoryForm();
  });

  const [errors, setErrors] = useState<string[]>([]);

  const set = (k: keyof AdminStoryForm, v: any) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = () => {
    const validation = validateAdminForm(form);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }
    setErrors([]);
    onSubmit(form);
  };

  return (
    <div className="p-4 space-y-3 max-w-lg">
      <h2 className="text-xl font-bold mb-4">스토리 등록</h2>

      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-2 rounded text-sm">
          <ul className="list-disc list-inside">
            {errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1">제목 (40자)</label>
        <input
          className="border p-2 w-full rounded"
          placeholder="제목을 입력하세요"
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          maxLength={40}
        />
        <div className="text-xs text-gray-500 mt-1">{form.title.length}/40</div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">서브 (60자)</label>
        <input
          className="border p-2 w-full rounded"
          placeholder="서브 제목을 입력하세요"
          value={form.subtitle}
          onChange={(e) => set("subtitle", e.target.value)}
          maxLength={60}
        />
        <div className="text-xs text-gray-500 mt-1">{form.subtitle.length}/60</div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">카테고리</label>
        <select
          className="border p-2 w-full rounded"
          value={form.category}
          onChange={(e) => set("category", e.target.value as AdminStoryForm["category"])}
        >
          <option value="대회">대회</option>
          <option value="모집">모집</option>
          <option value="협회">협회</option>
          <option value="마켓">마켓</option>
          <option value="구장">구장</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">출처</label>
        <select
          className="border p-2 w-full rounded"
          value={form.source}
          onChange={(e) => set("source", e.target.value as AdminStoryForm["source"])}
        >
          <option value="운영">운영</option>
          <option value="협회">협회</option>
          <option value="사용자">사용자</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">노출 기간</label>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-xs text-gray-500">시작일</label>
            <input
              type="datetime-local"
              className="border p-2 w-full rounded"
              value={form.startAt.slice(0, 16)}
              onChange={(e) => set("startAt", new Date(e.target.value).toISOString())}
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-gray-500">종료일</label>
            <input
              type="datetime-local"
              className="border p-2 w-full rounded"
              value={form.endAt.slice(0, 16)}
              onChange={(e) => set("endAt", new Date(e.target.value).toISOString())}
            />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          우선순위: {form.priority}
        </label>
        <input
          type="range"
          min={0}
          max={100}
          value={form.priority}
          onChange={(e) => set("priority", Number(e.target.value))}
          className="w-full"
        />
        <div className="text-xs text-gray-500 mt-1">0 (낮음) ~ 100 (높음)</div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">상태</label>
        <select
          className="border p-2 w-full rounded"
          value={form.status}
          onChange={(e) => set("status", e.target.value as AdminStoryForm["status"])}
        >
          <option value="DRAFT">초안</option>
          <option value="PUBLISHED">발행</option>
          <option value="REJECTED">거부</option>
        </select>
      </div>

      <button
        className="bg-emerald-600 text-white px-4 py-2 rounded w-full font-medium hover:bg-emerald-700 transition-colors"
        onClick={handleSubmit}
      >
        저장
      </button>
    </div>
  );
}
