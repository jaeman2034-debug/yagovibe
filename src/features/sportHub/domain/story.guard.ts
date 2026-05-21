/**
 * 🔥 Story Guard - 품질 가드 (개판 방지)
 */

import { Story } from "./story.types";

export const isUsableStory = (s: Story) => {
  if (!s.id) return false;
  if (!s.title?.trim()) return false;
  if (!s.subtitle?.trim()) return false;
  if (s.title.length > 40) return false;     // UI 안전장치
  if (s.subtitle.length > 60) return false;  // UI 안전장치
  return true;
};
