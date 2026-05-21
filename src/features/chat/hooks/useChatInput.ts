import { useState, useCallback } from "react";

/**
 * 채팅 입력 상태 및 UI 로직 훅
 *
 * - text 입력 상태
 * - suggestions 상태
 * - 추천 문장 선택 시 입력창에 삽입
 *
 * Firebase/전송 로직은 포함하지 않음. 부모에서 onSend 등의 콜백으로 처리.
 */
export function useChatInput() {
  const [text, setText] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  const handleTextChange = useCallback((value: string) => {
    setText(value);
  }, []);

  const handleSuggestionSelect = useCallback((suggestionText: string) => {
    setText(suggestionText);
  }, []);

  const clearInput = useCallback(() => {
    setText("");
  }, []);

  return {
    text,
    setText,
    suggestions,
    setSuggestions,
    isLoadingSuggestions,
    setIsLoadingSuggestions,
    handleTextChange,
    handleSuggestionSelect,
    clearInput,
  };
}
