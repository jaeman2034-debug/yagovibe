import { useState } from "react";
import { db, storage } from "../lib/firebase";
import { addDoc, collection } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export default function MarketCreate_AI() {
    const [title, setTitle] = useState("");
    const [price, setPrice] = useState("");
    const [image, setImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [aiResult, setAiResult] = useState<{ tags?: string[]; category?: string; suggestedPrice?: number } | null>(null);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImage(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!image) return alert("상품 이미지를 선택하세요");
        setLoading(true);

        try {
            // 🔹 1. 이미지 업로드
            const imgRef = ref(storage, `products/${Date.now()}_${image.name}`);
            await uploadBytes(imgRef, image);
            const url = await getDownloadURL(imgRef);

            // 🔹 2. AI Vision 분석
            const prompt = `
      다음 스포츠 중고 상품 이미지를 분석해줘:
      - 상품 카테고리 (예: 축구화, 유니폼, 골키퍼장갑 등)
      - 브랜드와 상태(새상품/중고)
      - 합리적 중고 판매가격(단위:원)
      출력은 JSON 형식으로 예: {"category":"축구화","tags":["Nike","중고"],"suggestedPrice":45000}
      `;

            const res = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
                },
                body: JSON.stringify({
                    model: "gpt-4o-mini",
                    messages: [
                        { role: "system", content: "You are an AI vision assistant." },
                        {
                            role: "user",
                            content: [
                                { type: "text", text: prompt },
                                { type: "image_url", image_url: { url } },
                            ],
                        },
                    ],
                }),
            });

            const data = await res.json();
            const content = data.choices[0].message.content;
            const parsed = JSON.parse(content || "{}");
            setAiResult(parsed);

            // 🔹 3. Firestore 저장
            await addDoc(collection(db, "products"), {
                title,
                image: url,
                aiTags: parsed.tags || [],
                category: parsed.category || "기타",
                suggestedPrice: parsed.suggestedPrice || null,
                price: parsed.suggestedPrice || price || 0,
                createdAt: Date.now(),
            });

            alert("상품이 등록되었습니다!");

            // 폼 초기화
            setTitle("");
            setPrice("");
            setImage(null);
            setImagePreview(null);
            setAiResult(null);
        } catch (err) {
            console.error("❌ AI 분석 오류:", err);
            alert("AI 분석 중 문제가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 space-y-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg max-w-2xl mx-auto">
            <div className="text-center">
                <h1 className="text-3xl font-bold mb-2">🧠 AI 상품 등록</h1>
                <p className="text-gray-600 dark:text-gray-400">
                    이미지를 업로드하면 AI가 자동으로 분석합니다
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-semibold mb-2">상품 이미지</label>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="w-full border rounded-lg p-2 dark:bg-gray-700 dark:text-white"
                        required
                    />
                    {imagePreview && (
                        <div className="mt-3">
                            <img
                                src={imagePreview}
                                alt="Preview"
                                className="w-full max-h-64 object-contain rounded-lg border"
                            />
                        </div>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-semibold mb-2">상품 제목</label>
                    <input
                        type="text"
                        placeholder="예: 나이키 축구화"
                        className="w-full border rounded-lg p-3 dark:bg-gray-700 dark:text-white"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-semibold mb-2">판매 가격 (원)</label>
                    <input
                        type="number"
                        placeholder="AI 추천 가격 또는 직접 입력"
                        className="w-full border rounded-lg p-3 dark:bg-gray-700 dark:text-white"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        AI가 추천 가격을 분석합니다
                    </p>
                </div>

                {aiResult && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 rounded-lg space-y-2">
                        <h3 className="font-semibold text-blue-800 dark:text-blue-300">🤖 AI 분석 결과</h3>
                        {aiResult.category && (
                            <p className="text-sm">
                                <span className="font-medium">📦 카테고리:</span> {aiResult.category}
                            </p>
                        )}
                        {aiResult.tags && aiResult.tags.length > 0 && (
                            <p className="text-sm">
                                <span className="font-medium">🏷️ 태그:</span> {aiResult.tags.join(", ")}
                            </p>
                        )}
                        {aiResult.suggestedPrice && (
                            <p className="text-sm">
                                <span className="font-medium">💰 추천 가격:</span> {aiResult.suggestedPrice.toLocaleString()}원
                            </p>
                        )}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {loading ? "AI 분석 중… ⏳" : "등록하기"}
                </button>
            </form>
        </div>
    );
}

