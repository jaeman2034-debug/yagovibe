import { useEffect, useState } from "react";
import { db } from "../lib/firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { Link } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import { Mic, Search } from "lucide-react";

type Product = {
    id: string;
    title: string;
    image: string;
    price?: number | null;
    aiCategory?: string | null;
    aiTags?: string[];
};

export default function Market() {
    const [items, setItems] = useState<Product[]>([]);
    const [filter, setFilter] = useState("");
    const [voiceActive, setVoiceActive] = useState(false);

    useEffect(() => {
        const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
        return onSnapshot(q, (snap) => {
            setItems(
                snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Product[]
            );
        });
    }, []);

    const startSTT = () => {
        const SpeechRecognition =
            (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) return alert("브라우저가 음성 인식을 지원하지 않습니다.");
        const recog = new SpeechRecognition();
        recog.lang = "ko-KR";
        recog.start();
        setVoiceActive(true);
        recog.onresult = (e: any) => {
            setFilter(e.results[0][0].transcript);
            setVoiceActive(false);
        };
        recog.onerror = () => setVoiceActive(false);
    };

    const filtered = items.filter((p) => {
        if (!filter) return true;
        const text = `${p.title} ${(p.aiTags || []).join(" ")}`.toLowerCase();
        return text.includes(filter.toLowerCase());
    });

    return (
        <div className="p-4 space-y-4">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">🛒 마켓</h1>
                <Link
                    to="/market/create"
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
                >
                    + AI 상품 등록
                </Link>
            </div>

            {/* 검색 바 */}
            <div className="flex items-center space-x-2">
                <div className="flex items-center flex-1 bg-white dark:bg-gray-800 rounded-lg px-3 border border-gray-200 dark:border-gray-700">
                    <Search size={18} className="text-gray-500" />
                    <input
                        className="w-full p-2 bg-transparent outline-none dark:text-gray-100"
                        placeholder="검색어 또는 AI 태그 입력"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                    />
                    <button onClick={startSTT} className="p-2" title="음성 검색">
                        <Mic
                            size={18}
                            className={`${voiceActive ? "text-red-500 animate-pulse" : "text-gray-500"
                                }`}
                        />
                    </button>
                </div>
            </div>

            {filtered.length === 0 ? (
                <div className="text-center py-12">
                    <div className="text-4xl mb-2">🔍</div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">검색 결과가 없습니다.</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {filtered.map((p) => (
                        <ProductCard
                            key={p.id}
                            {...p}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

