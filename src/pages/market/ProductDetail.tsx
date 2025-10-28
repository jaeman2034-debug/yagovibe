import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { db } from "../../lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export default function ProductDetail() {
    const { id } = useParams();
    const [p, setP] = useState<any>(null);

    useEffect(() => {
        if (id) {
            getDoc(doc(db, "products", id)).then((snap) => setP(snap.data()));
        }
    }, [id]);

    if (!p) return <div className="p-6 text-center">Loading...</div>;

    return (
        <div className="p-5 space-y-4">
            <img src={p.image} className="w-full rounded-lg" alt={p.title} />
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{p.title}</h1>
            <p className="text-lg text-blue-600 dark:text-blue-400 font-semibold">
                {p.price?.toLocaleString()} 원
            </p>
            {p.aiCategory && (
                <p className="text-sm text-gray-600 dark:text-gray-400">📦 {p.aiCategory}</p>
            )}
            {p.aiTags && p.aiTags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {p.aiTags.map((t: string) => (
                        <span
                            key={t}
                            className="text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 px-3 py-1 rounded-full"
                        >
                            #{t}
                        </span>
                    ))}
                </div>
            )}
            <Link
                to={`/chat/${id}`}
                className="block w-full py-3 bg-blue-600 text-white dark:text-white rounded-xl text-center font-semibold hover:bg-blue-700 transition-colors"
            >
                💬 판매자에게 연락하기
            </Link>
        </div>
    );
}

