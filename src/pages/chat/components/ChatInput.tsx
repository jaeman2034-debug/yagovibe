// 🔥 채팅 입력 컴포넌트 (유지보수 천재 패턴)
import { useRef } from "react";
import { useSpeechInput } from "../hooks/useSpeechInput";
import type { OnSend } from "@/lib/chat/types";

interface ChatInputProps {
    text: string;
    setText: (text: string) => void;
    selectedImage: File | null;
    imagePreviewUrl: string | null;
    onImageSelect: (file: File) => void;
    onImageCancel: () => void;
    onSend: OnSend; // 🔥 통합 표준 인터페이스
    textareaRef: React.RefObject<HTMLTextAreaElement>;
    onFocus?: () => void;
    onBlur?: () => void;
    sending?: boolean; // 🔥 전송 중 상태 (중복 입력 방지)
    onOfferClick?: () => void; // 🔥 가격 제안 버튼 클릭 핸들러
}

export function ChatInput({
    text,
    setText,
    selectedImage,
    imagePreviewUrl,
    onImageSelect,
    onImageCancel,
    onSend,
    textareaRef,
    onFocus,
    onBlur,
    sending = false,
    onOfferClick,
}: ChatInputProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // 🔥 음성 입력 훅 - 즉시 전송 모드 (카톡 보이스 입력 감성)
    const { isListening, start: startVoice } = useSpeechInput((transcript) => {
        if (transcript.trim()) {
            // 🔥 즉시 전송 (입력창에 넣지 않고 바로 전송)
            onSend({
                text: transcript.trim(),
                meta: {
                    inputMode: "voice",
                    stt: {
                        provider: "webSpeech",
                        language: "ko-KR",
                    },
                },
            });
            // 입력창은 비움 (음성 입력은 즉시 전송이므로)
            setText("");
        }
    });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type.startsWith('image/')) {
            onImageSelect(file);
        }
    };

    // 🔥 폼 제출 핸들러 (카톡급 UX) - 통합 표준 인터페이스
    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (sending) return;
        if (!text.trim() && !selectedImage) return;

        // 🔥 일반 입력은 typing 모드로 전송
        onSend({
            text: text.trim(),
            meta: {
                inputMode: "typing",
            },
        });
        setText("");
    };

    return (
        <>
            {/* 🔥 이미지 미리보기 */}
            {selectedImage && imagePreviewUrl && (
                <div className="mb-2 relative w-24">
                    <img
                        src={imagePreviewUrl}
                        alt="미리보기"
                        className="w-24 h-24 object-cover rounded-lg border border-gray-300 dark:border-neutral-700"
                    />
                    <button
                        onClick={onImageCancel}
                        className="absolute -top-2 -right-2 bg-black/70 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs active:bg-black/90 touch-manipulation"
                        aria-label="이미지 취소"
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* 🔥 메시지 입력 (form으로 감싸서 Enter 전송 지원) - 모바일 반응형 완벽 대응 */}
            <form 
                onSubmit={handleFormSubmit} 
                className="flex gap-2 items-end"
                style={{
                    minWidth: 0, // 🔥 핵심: flex 오버플로우 방지
                    maxWidth: "100%",
                    width: "100%",
                }}
            >
                {/* 📎 파일 선택 버튼 */}
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="shrink-0 w-9 h-9 rounded-full bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-gray-300 flex items-center justify-center active:scale-95 transition-all touch-manipulation"
                    title="이미지 전송"
                    aria-label="이미지 전송"
                >
                    📎
                </button>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={handleFileChange}
                />

                {/* 💰 가격 제안 버튼 */}
                {onOfferClick && (
                    <button
                        type="button"
                        onClick={onOfferClick}
                        disabled={sending}
                        className="shrink-0 w-9 h-9 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 flex items-center justify-center active:scale-95 transition-all touch-manipulation"
                        title="가격 제안"
                        aria-label="가격 제안"
                    >
                        💰
                    </button>
                )}

                {/* 🎤 음성 입력 버튼 - 즉시 전송 모드 */}
                <button
                    type="button"
                    onClick={() => startVoice()}
                    disabled={isListening}
                    className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all touch-manipulation ${
                        isListening
                            ? "bg-red-500 text-white animate-pulse"
                            : "bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-gray-300 active:scale-95"
                    }`}
                    title={isListening ? "음성 입력 중..." : "음성으로 말하기"}
                    aria-label={isListening ? "음성 입력 중..." : "음성으로 말하기"}
                >
                    🎙
                </button>

                {/* ✍️ 입력창 - flex 오버플로우 방지 + font-size: 16px (줌 방지) */}
                <textarea
                    ref={textareaRef}
                    value={text}
                    rows={1}
                    placeholder="메시지를 입력하세요…"
                    className="chat-input-textarea flex-1 resize-none rounded-2xl px-4 py-2 bg-gray-100 dark:bg-neutral-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 touch-manipulation max-h-[120px] transition-colors"
                    onChange={(e) => {
                        setText(e.target.value);
                        const target = e.target;
                        target.style.height = "auto";
                        target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
                    }}
                    onKeyDown={(e) => {
                        // 🔥 Enter = 전송 / Shift+Enter = 줄바꿈
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            if (!sending && (text.trim() || selectedImage)) {
                                onSend({
                                    text: text.trim(),
                                    meta: {
                                        inputMode: "typing",
                                    },
                                });
                                setText("");
                            }
                        }
                    }}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    style={{
                        height: 'auto',
                        minHeight: '44px',
                        minWidth: 0, // 🔥 핵심: flex 오버플로우 방지
                        maxWidth: "100%",
                        fontSize: 16, // 🔥 핵심: 16px (아이폰 사파리 자동 줌 방지)
                    }}
                />

                {/* ➤ 전송 버튼 - 절대 줄어들지 않음 */}
                <button
                    type="submit"
                    disabled={sending || (!text.trim() && !selectedImage)}
                    className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all touch-manipulation ${
                        !sending && (text.trim() || selectedImage)
                            ? "bg-blue-500 dark:bg-blue-600 text-white active:scale-95 active:bg-blue-600 dark:active:bg-blue-700 shadow-md"
                            : "bg-gray-200 dark:bg-neutral-800 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                    }`}
                    style={{
                        flexShrink: 0, // 🔥 핵심: 절대 줄어들지 않음
                        minWidth: 36, // 🔥 최소 너비 보장
                    }}
                    title={sending ? "전송 중..." : "전송"}
                    aria-label={sending ? "전송 중..." : "전송"}
                >
                    {sending ? "⏳" : "➤"}
                </button>
            </form>
        </>
    );
}

