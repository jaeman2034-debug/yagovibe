// 🔥 E단계: AI 채팅 보조 - 자동 질문/답변 추천
interface ChatSuggestionsProps {
    isSeller: boolean;
    tradeStatus: "open" | "reserved" | "completed";
    productPrice?: number;
    onSelect: (text: string) => void;
}

export function ChatSuggestions({
    isSeller,
    tradeStatus,
    productPrice,
    onSelect,
}: ChatSuggestionsProps) {
    // 🔥 E-1: 자동 질문/답변 추천
    const getSuggestions = (): string[] => {
        if (isSeller) {
            // 판매자 추천 문구
            return [
                "안녕하세요, 문의 감사합니다!",
                "직거래 가능합니다.",
                "상태 양호합니다.",
                "가격 협상 가능합니다.",
            ];
        } else {
            // 구매자 추천 문구
            if (tradeStatus === "open") {
                return [
                    "가격 제안 가능할까요?",
                    "직거래 가능 시간대가 언제일까요?",
                    "상태가 어떤가요? 사용감이 궁금해요.",
                    productPrice ? `혹시 ${(productPrice * 0.9).toLocaleString()}원에 가능할까요?` : "가격 협상 가능할까요?",
                ];
            } else if (tradeStatus === "reserved") {
                return [
                    "거래 일정 확인 부탁드려요.",
                    "직거래 장소는 어디인가요?",
                ];
            } else {
                return [
                    "거래 감사합니다!",
                    "후기 작성하겠습니다.",
                ];
            }
        }
    };

    const suggestions = getSuggestions();

    if (suggestions.length === 0) return null;

    return (
        <div className="mb-2 space-y-1">
            <div className="text-xs text-gray-600 dark:text-gray-400 px-2">
                💡 추천 문구
            </div>
            <div className="flex flex-wrap gap-2 px-2">
                {suggestions.map((suggestion, index) => (
                    <button
                        key={index}
                        onClick={() => onSelect(suggestion)}
                        className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-neutral-700 transition-colors"
                    >
                        {suggestion}
                    </button>
                ))}
            </div>
        </div>
    );
}

// 🔥 E-2: 가격 제안 문구 자동 생성
export function makePriceOffer(price: number): string {
    return `혹시 ${price.toLocaleString()}원에 가능할까요?\n오늘 바로 거래 가능합니다.`;
}

// 🔥 E-3: 대화 요약 구조 (AI 연결 준비)
export interface ChatSummary {
    buyerIntent: string;
    sellerIntent: string;
    keyPoints: string[];
    suggestedAction?: string;
}

export function summarizeChat(messages: any[]): ChatSummary {
    // 🔥 기본 구조만 제공 (나중에 AI로 교체 가능)
    const buyerMessages = messages.filter((m) => m.type !== "system_status" && !m.senderId?.includes("seller"));
    const sellerMessages = messages.filter((m) => m.type !== "system_status" && m.senderId?.includes("seller"));

    return {
        buyerIntent: buyerMessages.length > 0 ? "가격 문의 및 거래 희망" : "문의 없음",
        sellerIntent: sellerMessages.length > 0 ? "상태 양호, 일정 조율 중" : "응답 없음",
        keyPoints: [
            `구매자 메시지: ${buyerMessages.length}개`,
            `판매자 메시지: ${sellerMessages.length}개`,
        ],
        suggestedAction: messages.length > 5 ? "가격 협상 진행 중" : "초기 문의 단계",
    };
}

