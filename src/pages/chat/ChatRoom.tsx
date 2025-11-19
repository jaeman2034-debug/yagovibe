import { useEffect, useState } from "react";
import { db } from "../../lib/firebase";
import { addDoc, collection, onSnapshot, orderBy, query, serverTimestamp, doc, getDoc } from "firebase/firestore";
import { useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthProvider";

export default function ChatRoom() {
    const { id } = useParams();
    const { user } = useAuth();
    const [msgs, setMsgs] = useState<any[]>([]);
    const [text, setText] = useState("");

    // 🧠 AI 흥정 도우미 상태
    const [aiReply, setAiReply] = useState("");
    const [aiNote, setAiNote] = useState("");
    const [aiPrice, setAiPrice] = useState<number | null>(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiRisk, setAiRisk] = useState<"low" | "medium" | "high" | null>(null);
    const [aiRiskReason, setAiRiskReason] = useState("");
    const [product, setProduct] = useState<any>(null); // 상품 정보
    const [isSeller, setIsSeller] = useState(false); // 판매자 여부

    // 채팅 메시지 로드
    useEffect(() => {
        if (!id) return;
        const q = query(collection(db, `chats/${id}/messages`), orderBy("createdAt", "asc"));
        return onSnapshot(q, (snap) =>
            setMsgs(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })))
        );
    }, [id]);

    // 채팅 및 상품 정보 로드
    useEffect(() => {
        if (!id || !user) return;

        const loadChatInfo = async () => {
            try {
                const chatDoc = await getDoc(doc(db, "chats", id));
                if (chatDoc.exists()) {
                    const chatData = chatDoc.data();
                    // 판매자 여부 확인 (채팅의 sellerId와 현재 사용자 ID 비교)
                    setIsSeller(chatData.sellerId === user.uid);

                    // 상품 정보 로드
                    if (chatData.productId) {
                        const productDoc = await getDoc(doc(db, "marketProducts", chatData.productId));
                        if (productDoc.exists()) {
                            const productData = productDoc.data();
                            setProduct({
                                title: productData.name || "",
                                price: productData.price || 0,
                                category: productData.category || "",
                                conditionLabel: productData.condition || "",
                                summary: productData.aiOneLine || productData.description || "",
                                aiOneLine: productData.aiOneLine || "",
                            });
                        }
                    }
                }
            } catch (error) {
                console.error("채팅 정보 로드 오류:", error);
            }
        };

        void loadChatInfo();
    }, [id, user]);

    const send = async () => {
        if (!text.trim() || !id) return;
        await addDoc(collection(db, `chats/${id}/messages`), {
            uid: user?.uid,
            text,
            createdAt: serverTimestamp(),
        });
        setText("");
    };

    // 🧠 AI 흥정 도우미 호출
    const handleAiNegotiate = async () => {
        if (!msgs.length || !product || !user || !id) {
            alert("대화가 없거나 상품 정보가 없습니다.");
            return;
        }

        try {
            setAiLoading(true);

            // 대화 로그 구성 (최근 15개)
            const history = msgs.slice(-15).map((m) => ({
                role: m.uid === user.uid
                    ? (isSeller ? "seller" : "buyer")
                    : (isSeller ? "buyer" : "seller"),
                message: m.text || "",
                time: m.createdAt ? (m.createdAt.toDate ? m.createdAt.toDate().toISOString() : String(m.createdAt)) : "",
            }));

            const functionsOrigin = import.meta.env.VITE_FUNCTIONS_ORIGIN || 
                "https://asia-northeast3-yago-vibe-spt.cloudfunctions.net";

            const res = await fetch(
                `${functionsOrigin}/negotiateHelper`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        history,
                        userRole: isSeller ? "seller" : "buyer",
                        product: {
                            title: product.title,
                            price: product.price,
                            category: product.category,
                            conditionLabel: product.conditionLabel,
                            summary: product.summary,
                            aiOneLine: product.aiOneLine,
                        },
                    }),
                }
            );

            if (!res.ok) {
                throw new Error("AI 흥정 도우미 서버 응답 오류");
            }

            const data = await res.json();
            setAiReply(data.reply || "");
            setAiPrice(data.suggestedPrice || null);
            setAiRisk(data.risk || "low");
            setAiRiskReason(data.riskReason || "");
            setAiNote(data.note || "");
        } catch (err: any) {
            console.error("🧠 AI 흥정 도우미 오류:", err);
            alert("AI 흥정 도우미를 불러오는 중 문제가 발생했습니다.");
        } finally {
            setAiLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {msgs.length === 0 ? (
                    <div className="text-center text-gray-500 dark:text-gray-400 mt-20">
                        <p>아직 메시지가 없습니다.</p>
                        <p className="text-sm mt-2">판매자와의 첫 대화를 시작해보세요!</p>
                    </div>
                ) : (
                    msgs.map((m) => (
                        <div
                            key={m.id}
                            className={`max-w-xs p-3 rounded-lg ${m.uid === user?.uid
                                    ? "ml-auto bg-blue-600 text-white"
                                    : "mr-auto bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                }`}
                        >
                            {m.text}
                        </div>
                    ))
                )}
            </div>
            <div className="p-3 border-t bg-white dark:bg-gray-800">
                {/* 🧠 AI 흥정 도우미 버튼 */}
                <div className="mb-2 flex items-center justify-between gap-2">
                    <button
                        onClick={handleAiNegotiate}
                        disabled={aiLoading || !msgs.length || !product}
                        className="px-3 py-2 rounded-lg text-sm bg-purple-600 text-white active:scale-95 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
                    >
                        {aiLoading ? "분석 중..." : "🧠 AI 흥정 도우미"}
                    </button>
                </div>

                {/* 🧠 AI 흥정 도우미 결과 패널 */}
                {(aiReply || aiNote || aiPrice !== null) && (
                    <div className="mb-2 rounded-xl border border-purple-100 dark:border-purple-900 bg-purple-50 dark:bg-purple-900/20 p-3 text-xs text-purple-900 dark:text-purple-100 space-y-2">
                        {aiReply && (
                            <div>
                                <div className="font-semibold mb-1">✉️ 제안 답변</div>
                                <div className="whitespace-pre-line mb-1">{aiReply}</div>
                                <button
                                    className="mt-1 text-[11px] underline text-purple-600 dark:text-purple-400"
                                    onClick={() => setText(aiReply)}
                                >
                                    이 문장으로 채우기
                                </button>
                            </div>
                        )}

                        {aiPrice !== null && aiPrice > 0 && (
                            <div>
                                <div className="font-semibold">💰 추천 가격</div>
                                <div>{aiPrice.toLocaleString()}원 정도 제안 추천</div>
                            </div>
                        )}

                        {aiRisk && (
                            <div
                                className={
                                    aiRisk === "high"
                                        ? "text-red-600 dark:text-red-400"
                                        : aiRisk === "medium"
                                        ? "text-orange-600 dark:text-orange-400"
                                        : "text-green-700 dark:text-green-400"
                                }
                            >
                                ⚠ 위험도: {aiRisk.toUpperCase()} — {aiRiskReason}
                            </div>
                        )}

                        {aiNote && (
                            <div className="text-[11px] opacity-80">
                                🧩 참고: {aiNote}
                            </div>
                        )}
                    </div>
                )}

                {/* 메시지 입력 */}
                <div className="flex gap-2">
                    <input
                        className="flex-1 border rounded-lg p-2 dark:bg-gray-700 dark:text-gray-100"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="메시지를 입력하세요..."
                        onKeyPress={(e) => e.key === 'Enter' && send()}
                    />
                    <button
                        onClick={send}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        전송
                    </button>
                </div>
            </div>
        </div>
    );
}

