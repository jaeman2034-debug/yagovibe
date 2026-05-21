/**
 * 🔥 Story Admin API - 관리자용 API 연결
 */

import type { AdminStoryForm } from "../domain/story.admin.form";

const API_BASE = import.meta.env.VITE_API_BASE || "/api";

/**
 * 스토리 생성
 */
export async function createStory(v: AdminStoryForm, createdBy: string) {
  const res = await fetch(`${API_BASE}/stories`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...v,
      createdBy,
    }),
  });

  if (!res.ok) {
    throw new Error(`스토리 생성 실패: ${res.status}`);
  }

  return res.json();
}

/**
 * 스토리 수정
 */
export async function updateStory(
  id: string,
  v: Partial<AdminStoryForm>,
  updatedBy: string
) {
  const res = await fetch(`${API_BASE}/stories/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...v,
      updatedBy,
    }),
  });

  if (!res.ok) {
    throw new Error(`스토리 수정 실패: ${res.status}`);
  }

  return res.json();
}

/**
 * 스토리 삭제
 */
export async function deleteStory(id: string) {
  const res = await fetch(`${API_BASE}/stories/${id}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    throw new Error(`스토리 삭제 실패: ${res.status}`);
  }

  return res.json();
}
