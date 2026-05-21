/**
 * 🔥 Phase 28: 기억 요약 카드
 * 
 * "지금 이런 걸 기억하고 있어요" 요약 및 통제 UX
 */
import React from 'react';
import { getMemories, clearMemories, removeLatestMemory } from '@/utils/memoryStorage';
import { formatRelativeTime } from '@/utils/memoryStorage';
import type { UserMemory } from '@/types/memory';

type Props = {
  onClose?: () => void;
  onMemoryDeleted?: () => void;
};

export default function MemorySummaryCard({ onClose, onMemoryDeleted }: Props) {
  const memories = getMemories();

  // 🔥 Phase 28: 특정 기억 삭제
  const handleDeleteMemory = (index: number) => {
    const updated = memories.filter((_, i) => i !== index);
    // localStorage 직접 업데이트
    try {
      localStorage.setItem('yago:userMemory:v1', JSON.stringify(updated));
      console.log('✅ [MemorySummaryCard] Phase 28: 기억 삭제 완료');
      onMemoryDeleted?.();
    } catch (error) {
      console.warn('⚠️ [MemorySummaryCard] 기억 삭제 실패:', error);
    }
  };

  // 🔥 Phase 28: 모든 기억 끄기
  const handleDisableAll = () => {
    if (window.confirm('모든 기억을 삭제하시겠어요?')) {
      clearMemories();
      console.log('✅ [MemorySummaryCard] Phase 28: 모든 기억 삭제 완료');
      onMemoryDeleted?.();
      onClose?.();
    }
  };

  if (memories.length === 0) {
    return (
      <div className="memory-summary-card">
        <div className="memory-summary-title">
          지금 기억 중인 것
        </div>
        <div className="memory-summary-empty">
          아직 기억한 것이 없어요
        </div>
        {onClose && (
          <button onClick={onClose} className="memory-summary-close">
            닫기
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="memory-summary-card">
      <div className="memory-summary-title">
        지금 이런 걸 기억하고 있어요
      </div>

      <div className="memory-summary-list">
        {memories.map((memory, index) => (
          <div key={index} className="memory-summary-item">
            <div className="memory-summary-item-info">
              <div className="memory-summary-item-name">
                {memory.keyword || '장소'}
              </div>
              <div className="memory-summary-item-meta">
                이 근처 • {formatRelativeTime(memory.timestamp)}
              </div>
            </div>
            <button
              onClick={() => handleDeleteMemory(index)}
              className="memory-summary-item-delete"
            >
              삭제
            </button>
          </div>
        ))}
      </div>

      <div className="memory-summary-actions">
        <button
          onClick={handleDisableAll}
          className="memory-summary-disable-all"
        >
          모든 기억 끄기
        </button>
      </div>

      {onClose && (
        <button onClick={onClose} className="memory-summary-close">
          닫기
        </button>
      )}
    </div>
  );
}
