/**
 * 🔥 Story Slot Editor - 스토리 슬롯 에디터
 * 
 * 드래그 순서, 기간 수정, 우선순위 슬라이더, 즉시 미리보기
 */

import { useState } from "react";
import type { StorySlotStatus, Story } from "../domain/dashboard.types";
import { updateStoryPriority, extendStoryPeriod, replaceStory } from "../data/dashboard.api";

interface StorySlotEditorProps {
  slots: StorySlotStatus[];
  availableStories: Story[];
  region?: string;
  onUpdate?: () => void;
}

export function StorySlotEditor({
  slots,
  availableStories,
  region,
  onUpdate,
}: StorySlotEditorProps) {
  const [editingSlot, setEditingSlot] = useState<number | null>(null);

  const handlePriorityChange = async (storyId: string, priority: number) => {
    try {
      await updateStoryPriority(storyId, priority);
      onUpdate?.();
    } catch (error) {
      console.error("우선순위 업데이트 실패:", error);
    }
  };

  const handleExtendPeriod = async (storyId: string, days: number) => {
    try {
      await extendStoryPeriod(storyId, days);
      onUpdate?.();
    } catch (error) {
      console.error("기간 연장 실패:", error);
    }
  };

  const handleReplace = async (slotIndex: number, newStoryId: string) => {
    try {
      await replaceStory(slotIndex, newStoryId, region);
      onUpdate?.();
      setEditingSlot(null);
    } catch (error) {
      console.error("스토리 교체 실패:", error);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold">스토리 슬롯 관리</h3>
      
      {slots.map((slot, index) => (
        <div
          key={index}
          className="bg-white rounded-lg p-4 border border-gray-200"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">슬롯 {index + 1}</span>
            <div className="flex gap-2">
              <span className="text-sm text-gray-600">
                CTR: {slot.ctr.toFixed(2)}%
              </span>
              <button
                onClick={() =>
                  setEditingSlot(editingSlot === index ? null : index)
                }
                className="text-sm text-blue-600 hover:underline"
              >
                {editingSlot === index ? "닫기" : "편집"}
              </button>
            </div>
          </div>

          {slot.story ? (
            <div>
              <p className="text-sm font-medium">{slot.story.title}</p>
              <p className="text-xs text-gray-500">{slot.story.subtitle}</p>
              
              {editingSlot === index && (
                <div className="mt-3 space-y-3 pt-3 border-t">
                  {/* 우선순위 슬라이더 */}
                  <div>
                    <label className="text-xs text-gray-600">
                      우선순위: {slot.story.priority || 50}
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={slot.story.priority || 50}
                      onChange={(e) =>
                        handlePriorityChange(slot.story!.id, Number(e.target.value))
                      }
                      className="w-full"
                    />
                  </div>

                  {/* 기간 연장 */}
                  <div>
                    <label className="text-xs text-gray-600">기간 연장 (일)</label>
                    <div className="flex gap-2">
                      {[1, 3, 7].map((days) => (
                        <button
                          key={days}
                          onClick={() => handleExtendPeriod(slot.story!.id, days)}
                          className="px-3 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200"
                        >
                          +{days}일
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 스토리 교체 */}
                  <div>
                    <label className="text-xs text-gray-600">스토리 교체</label>
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          handleReplace(index, e.target.value);
                        }
                      }}
                      className="w-full mt-1 text-xs border rounded px-2 py-1"
                      defaultValue=""
                    >
                      <option value="">선택...</option>
                      {availableStories
                        .filter((s) => s.id !== slot.story!.id)
                        .map((story) => (
                          <option key={story.id} value={story.id}>
                            {story.title}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-gray-400">빈 슬롯</div>
          )}
        </div>
      ))}
    </div>
  );
}
