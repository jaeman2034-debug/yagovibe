// 🔥 D단계: 거래 상태 배지 컴포넌트
import { updateDoc, doc, serverTimestamp, addDoc, collection } from "firebase/firestore";
import { db } from "../../../lib/firebase";

interface TradeStatusBadgeProps {
    chatId: string;
    currentStatus: "open" | "reserved" | "completed";
    isSeller: boolean;
    userId: string;
    onStatusChange?: (newStatus: "open" | "reserved" | "completed") => void;
}

export function TradeStatusBadge({
    chatId,
    currentStatus,
    isSeller,
    userId,
    onStatusChange,
}: TradeStatusBadgeProps) {
    const handleStatusChange = async (newStatus: "open" | "reserved" | "completed") => {
        if (!chatId || !userId) return;

        try {
            // Firestore 업데이트
            await updateDoc(doc(db, "chats", chatId), {
                tradeStatus: newStatus,
                tradeUpdatedAt: serverTimestamp(),
                tradeUpdatedBy: userId,
            });

            // 상태 변경 시 시스템 메시지 삽입
            const statusMessages: Record<"open" | "reserved" | "completed", string> = {
                open: "판매중으로 변경되었어요",
                reserved: "예약중으로 변경되었어요 📅",
                completed: "거래 완료되었어요 🎉",
            };

            const statusMessage = statusMessages[newStatus];
            if (statusMessage) {
                await addDoc(collection(db, `chats/${chatId}/messages`), {
                    uid: userId,
                    senderId: userId,
                    text: statusMessage,
                    type: "system_status",
                    createdAt: serverTimestamp(),
                });
            }

            // 콜백 호출
            if (onStatusChange) {
                onStatusChange(newStatus);
            }
        } catch (error) {
            console.error("❌ 거래 상태 변경 오류:", error);
            alert("거래 상태 변경 중 오류가 발생했습니다.");
        }
    };

    const statusConfig = {
        open: {
            label: "판매중",
            color: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700",
            nextStatus: "reserved" as const,
            nextLabel: "예약중으로 변경",
        },
        reserved: {
            label: "예약중",
            color: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700",
            nextStatus: "completed" as const,
            nextLabel: "거래 완료로 변경",
        },
        completed: {
            label: "거래 완료",
            color: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700",
            nextStatus: null,
            nextLabel: null,
        },
    };

    const config = statusConfig[currentStatus];

    return (
        <div className="flex items-center gap-2">
            {/* 상태 배지 */}
            <div
                className={`px-3 py-1 rounded-full text-xs font-medium border ${config.color}`}
            >
                {config.label}
            </div>

            {/* 상태 변경 버튼 (판매자만, 완료 상태가 아닐 때) */}
            {isSeller && config.nextStatus && (
                <button
                    onClick={() => handleStatusChange(config.nextStatus!)}
                    className="px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                >
                    {config.nextLabel}
                </button>
            )}
        </div>
    );
}

