/**
 * 🔥 Stories API - API 어댑터 (계약 고정)
 */

import type { Story } from "../domain/story.types";

export type GetStoriesRes = {
  stories: Story[];
  mode: "default" | "season";
  serverTime: string;
};

const API_BASE = import.meta.env.VITE_API_BASE || "/api";

export async function getStories(): Promise<GetStoriesRes> {
  const res = await fetch(`${API_BASE}/stories`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    throw new Error(`GET /stories failed: ${res.status}`);
  }

  return (await res.json()) as GetStoriesRes;
}
